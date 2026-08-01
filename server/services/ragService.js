const DocChunk = require('../models/DocChunk');
const Document = require('../models/Document');
const { getEmbeddings, generateAnswer } = require('./embedService');
const mongoose = require('mongoose');

const formatHistory = (history) =>
  history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Atlas Search indexes newly-inserted chunks asynchronously - live-measured
// during the Phase 2 smoke test, a chunk from a just-completed upload took
// ~6-7s to become queryable via $vectorSearch. Immediately after ingestion,
// a real question can otherwise get zero results not because there's nothing
// relevant, but because the newest chunk hasn't been indexed yet. These
// delays (cumulative ~6s across 3 retries) are sized to cover that window.
// Only a true zero-result response is retried - if $vectorSearch returns any
// chunks at all (even low-relevance ones, since it returns the filter's top-k
// regardless of score), that's a real answer and returns immediately with no
// added latency.
const ZERO_RESULT_RETRY_DELAYS_MS = [1000, 2000, 3000];

const runVectorSearch = (supplierId, queryVector) => DocChunk.aggregate([
  {
    $vectorSearch: {
      index: "default", // The name you gave the index in Atlas
      path: "embedding",
      queryVector,
      numCandidates: 100,
      limit: 5,
      filter: { supplierId: new mongoose.Types.ObjectId(supplierId) }
    }
  },
  {
    $project: { text: 1, docId: 1, _id: 0 }
  }
]);

const runVectorSearchWithRetry = async (supplierId, queryVector) => {
  let contextChunks = await runVectorSearch(supplierId, queryVector);
  for (const delay of ZERO_RESULT_RETRY_DELAYS_MS) {
    if (contextChunks.length > 0) break;
    await sleep(delay);
    contextChunks = await runVectorSearch(supplierId, queryVector);
  }
  return contextChunks;
};

// 8 messages = last 4 user/assistant exchanges. A follow-up like "why is it
// that high?" almost always refers to the immediately preceding answer, not
// something from ten turns ago - capping keeps prompt size (and Gemini token
// cost) bounded regardless of how long a conversation runs, while still
// leaving enough room for a short multi-step clarification thread rather
// than truncating mid-exchange after every single question.
const HISTORY_WINDOW = 8;

// history is the conversation's prior turns (this question is not in it yet) -
// used so a follow-up like "why is it that high?" can resolve against what was
// just discussed, not just the freshly retrieved document chunks.
exports.answerSupplierQuestion = async (supplierId, question, history = []) => {
  // 1. Convert user question to an embedding
  const questionEmbedding = await getEmbeddings(question);

  // 2. Perform Vector Search in MongoDB (Filtered by supplierId), retrying on
  // a true zero-result response to ride out Atlas Search's indexing lag
  const contextChunks = await runVectorSearchWithRetry(supplierId, questionEmbedding);

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
  const recentHistory = history.slice(-HISTORY_WINDOW);
  const historyText = recentHistory.length ? formatHistory(recentHistory) : '(no prior messages)';
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