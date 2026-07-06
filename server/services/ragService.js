const DocChunk = require('../models/DocChunk');
const { getEmbeddings, generateAnswer } = require('./embedService');
const mongoose = require('mongoose');

exports.answerSupplierQuestion = async (supplierId, question) => {
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
      $project: { text: 1, _id: 0 }
    }
  ]);

  if (contextChunks.length === 0) {
    return "I couldn't find any information in the uploaded documents to answer that.";
  }

  // 3. Build the Prompt
  const contextText = contextChunks.map(c => c.text).join("\n\n");
  const finalPrompt = `
    You are a contract analyst for SupplyLens. 
    Answer the question using ONLY the provided context from the supplier's documents.
    If the answer is not in the context, say you don't know.
    
    Context:
    ${contextText}
    
    Question: 
    ${question}
  `;

  // 4. Get the answer from Gemini
  return await generateAnswer(finalPrompt);
};