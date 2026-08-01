const DocChunk = require('../models/DocChunk');
const Document = require('../models/Document');
const { getEmbeddings, generateAnswer } = require('./embedService');
const mongoose = require('mongoose');

const formatHistory = (history) =>
  history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

// history is the conversation's prior turns (this question is not in it yet) -
// used so a follow-up like "why is it that high?" can resolve against what was
// just discussed, not just the freshly retrieved document chunks.
exports.answerSupplierQuestion = async (supplierId, question, history = []) => {
  // 1. Convert user question to an embedding
  const questionEmbedding = await getEmbeddings(question);

  // 2. Perform Vector Search in MongoDB (Filtered by supplierId)
  // This matches the aggregation code on Page 7 of your PDF
  const contextChunks = await DocChunk.aggregate([
    {
      $vectorSearch: {
        index: "default", // The name you gave the index in Atlas
        path: "embedding",
        queryVector: questionEmbedding,
        numCandidates: 100,
        limit: 5,
        filter: { supplierId: new mongoose.Types.ObjectId(supplierId) }
      }
    },
    {
      $project: { text: 1, docId: 1, _id: 0 }
    }
  ]);

  if (contextChunks.length === 0) {
    return { answer: "I couldn't find any information in the uploaded documents to answer that.", sources: [] };
  }

  // Distinct source filenames the answer is grounded in, for the "sources"
  // shown alongside the assistant's message.
  const docIds = [...new Set(contextChunks.map((c) => String(c.docId)).filter(Boolean))];
  const sourceDocs = docIds.length
    ? await Document.find({ _id: { $in: docIds } }, 'fileName').lean()
    : [];
  const sources = sourceDocs.map((d) => d.fileName);

  // 3. Build the Prompt
  const contextText = contextChunks.map(c => c.text).join("\n\n");
  const historyText = history.length ? formatHistory(history) : '(no prior messages)';
  const finalPrompt = `
    You are a contract analyst for SupplyLens.
    Answer the question using ONLY the provided context from the supplier's documents.
    Use the conversation history only to resolve what the question is referring to
    (e.g. pronouns, "that", follow-ups) - the answer itself must still come from the context.
    If the answer is not in the context, say you don't know.

    Conversation so far:
    ${historyText}

    Context:
    ${contextText}

    Question:
    ${question}
  `;

  // 4. Get the answer from Gemini
  const answer = await generateAnswer(finalPrompt);
  return { answer, sources };
};