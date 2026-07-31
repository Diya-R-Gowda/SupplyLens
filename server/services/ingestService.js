const pdf = require('pdf-parse');
const DocChunk = require('../models/DocChunk');
const Document = require('../models/Document');
const { getEmbeddings } = require('./embedService');

exports.processPDF = async (supplierId, fileBuffer, fileName = 'uploaded-document.pdf') => {
  // 1. Extract Text
  const data = await pdf(fileBuffer);
  const fullText = data.text;

  // 2. Simple Chunking (~500 tokens / approx 2000 characters)
  const chunks = [];
  const chunkSize = 2000;
  const overlap = 200;

  for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
    chunks.push(fullText.substring(i, i + chunkSize));
  }

  // 3. Embed and Store
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbeddings(chunks[i]);
    
    await DocChunk.create({
      text: chunks[i],
      embedding: embedding,
      supplierId: supplierId,
      chunkIndex: i
    });
  }

  await Document.create({
    supplierId,
    fileName,
    totalChunks: chunks.length,
    uploadedAt: new Date(),
  });
  
  return { success: true, totalChunks: chunks.length };
};