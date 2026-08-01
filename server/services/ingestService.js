const { PDFParse } = require('pdf-parse');
const DocChunk = require('../models/DocChunk');
const Document = require('../models/Document');
const { getEmbeddings } = require('./embedService');

exports.processPDF = async (supplierId, fileBuffer, fileName = 'uploaded-document.pdf', gridFsFileId) => {
  // 1. Extract Text
  // pdf-parse v2 exports a class, not a callable function (v1's `pdf(buffer)`
  // shape) - it must be instantiated and its buffer released via destroy()
  // once done, or the underlying PDF.js document stays resident in memory.
  const parser = new PDFParse({ data: fileBuffer });
  let fullText;
  let pageCount;
  try {
    const result = await parser.getText();
    fullText = result.text;
    pageCount = result.total;
  } finally {
    await parser.destroy();
  }

  // 2. Simple Chunking (~500 tokens / approx 2000 characters)
  const chunks = [];
  const chunkSize = 2000;
  const overlap = 200;

  for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
    chunks.push(fullText.substring(i, i + chunkSize));
  }

  // 3. Create the Document record first so each chunk can reference its
  // parent document's id - needed to delete only this document's chunks
  // later, rather than every chunk belonging to the supplier.
  const document = await Document.create({
    supplierId,
    fileName,
    totalChunks: chunks.length,
    uploadedAt: new Date(),
    gridFsFileId,
  });

  // 4. Embed and Store
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbeddings(chunks[i]);

    await DocChunk.create({
      text: chunks[i],
      embedding: embedding,
      supplierId: supplierId,
      docId: document._id,
      chunkIndex: i
    });
  }

  return { success: true, totalChunks: chunks.length, pageCount, documentId: document._id };
};