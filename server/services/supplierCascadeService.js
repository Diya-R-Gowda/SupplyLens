const Document = require('../models/Document');
const DocChunk = require('../models/DocChunk');
const NewsCache = require('../models/NewsCache');
const Conversation = require('../models/Conversation');
const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');
const SupplierSnapshot = require('../models/SupplierSnapshot');
const { deleteFile } = require('./gridfsService');

// Deleting a supplier is permanent and cascades to every collection that
// references it - hard delete, not soft/archive (see the commit this was
// introduced in for the fuller reasoning): nothing anywhere reads a deleted
// supplier's data, no "recycle bin" or audit-log UI exists, so an orphaned
// row left behind serves no purpose except wasted storage and - as found via
// the Phase 6 data-density audit - silently corrupting the counts real
// forecasting work would depend on. Matches the cascade already established
// for per-document delete (routes/documents.js): Document + DocChunk +
// GridFS binary together, just supplier-wide instead of one document at a
// time, plus the collections a single document delete never touched
// (NewsCache, Conversation, RiskHistory, HealthHistory, SupplierSnapshot).
exports.deleteSupplierCascade = async (supplier) => {
  const documents = await Document.find({ supplierId: supplier._id }).select('gridFsFileId');
  await Promise.all(documents.map((doc) => deleteFile(doc.gridFsFileId)));

  await Promise.all([
    Document.deleteMany({ supplierId: supplier._id }),
    DocChunk.deleteMany({ supplierId: supplier._id }),
    NewsCache.deleteMany({ supplierId: supplier._id }),
    Conversation.deleteMany({ supplierId: supplier._id }),
    RiskHistory.deleteMany({ supplierId: supplier._id }),
    HealthHistory.deleteMany({ supplierId: supplier._id }),
    SupplierSnapshot.deleteMany({ supplierId: supplier._id }),
  ]);

  await supplier.deleteOne();
};
