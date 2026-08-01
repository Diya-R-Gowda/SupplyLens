const mongoose = require('mongoose');

const BUCKET_NAME = 'pdfDocuments';

// GridFSBucket is a thin wrapper over the current connection's db handle, not
// a persistent resource - safe (and necessary) to construct fresh each call
// rather than caching it before a connection exists.
const getBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });

// Buffers in, a GridFS file id out. Uses a real upload stream (not
// bucket.upload helpers that don't exist on this driver) so large files are
// written in chunks rather than as one document.
const uploadBuffer = (buffer, filename, metadata) => new Promise((resolve, reject) => {
  const uploadStream = getBucket().openUploadStream(filename, { metadata });
  uploadStream.on('error', reject);
  uploadStream.on('finish', () => resolve(uploadStream.id));
  uploadStream.end(buffer);
});

// Returns a readable stream - callers pipe this directly to an HTTP response
// so the file is never buffered fully in process memory.
const openDownloadStream = (fileId) => getBucket().openDownloadStream(fileId);

// Idempotent: silently no-ops if the file is already gone, since the goal is
// "make sure this id isn't referencing anything" rather than asserting it
// still existed.
const deleteFile = async (fileId) => {
  if (!fileId) return;
  const bucket = getBucket();
  const [existing] = await bucket.find({ _id: fileId }).toArray();
  if (!existing) return;
  await bucket.delete(fileId);
};

module.exports = { getBucket, uploadBuffer, openDownloadStream, deleteFile };
