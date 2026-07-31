const mongoose = require('mongoose');

const demoUsers = new Map();
const demoUsersById = new Map();
const demoSuppliersByOrg = new Map();
const demoSuppliersById = new Map();
const demoNewsBySupplierId = new Map();

const createSeedSupplier = (orgId) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  name: 'Northwind Logistics',
  category: 'logistics',
  country: 'US',
  riskScore: 34,
  contractExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  paymentTerms: 'Net 30',
  orgId: String(orgId),
});

const registerDemoSupplier = (supplier) => {
  demoSuppliersById.set(String(supplier._id), supplier);
  if (!demoNewsBySupplierId.has(String(supplier._id))) {
    demoNewsBySupplierId.set(String(supplier._id), [
      {
        _id: new mongoose.Types.ObjectId().toString(),
        headline: `${supplier.name} maintains a stable delivery profile`,
        sentiment: 'positive',
        publishedAt: new Date().toISOString(),
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        headline: `No recent escalation signals for ${supplier.name}`,
        sentiment: 'neutral',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      },
    ]);
  }
  return supplier;
};

const registerDemoUser = (email, password) => {
  const key = email.toLowerCase();
  if (demoUsers.has(key)) {
    return null; // account already exists
  }

  const orgId = new mongoose.Types.ObjectId().toString();
  const user = {
    _id: new mongoose.Types.ObjectId().toString(),
    email,
    password,
    role: 'admin',
    orgId,
  };

  demoUsers.set(key, user);
  demoUsersById.set(user._id, user);
  const seedSupplier = registerDemoSupplier(createSeedSupplier(orgId));
  demoSuppliersByOrg.set(orgId, [seedSupplier]);

  return user;
};

const findDemoUser = (email, password) => {
  const existing = demoUsers.get(email.toLowerCase());
  if (!existing || existing.password !== password) return null;
  return existing;
};

const getDemoUserById = (id) => demoUsersById.get(String(id)) || null;

const listDemoSuppliers = (orgId) => demoSuppliersByOrg.get(String(orgId)) || [];

const getDemoSupplier = (supplierId) => demoSuppliersById.get(String(supplierId)) || null;

const upsertDemoSupplier = (orgId, supplier) => {
  const orgKey = String(orgId);
  const currentSuppliers = demoSuppliersByOrg.get(orgKey) || [];
  const nextSupplier = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: supplier.name,
    category: supplier.category || 'other',
    country: supplier.country,
    riskScore: 0,
    contractExpiry: supplier.contractExpiry || null,
    paymentTerms: supplier.paymentTerms || '',
    orgId: orgKey,
  };

  const nextSuppliers = [...currentSuppliers, nextSupplier];
  demoSuppliersByOrg.set(orgKey, nextSuppliers);
  registerDemoSupplier(nextSupplier);
  return nextSupplier;
};

const recordDemoDocument = (supplierId, fileName) => ({
  success: true,
  demo: true,
  supplierId: String(supplierId),
  fileName,
  totalChunks: 1,
});

const demoDocumentsBySupplierId = new Map();

const listDemoDocuments = (supplierId) => demoDocumentsBySupplierId.get(String(supplierId)) || [];

const recordDemoUploadedDocument = (supplierId, fileName) => {
  const supplierKey = String(supplierId);
  const nextDocument = {
    _id: new mongoose.Types.ObjectId().toString(),
    fileName,
    uploadedAt: new Date().toISOString(),
  };

  const currentDocuments = demoDocumentsBySupplierId.get(supplierKey) || [];
  demoDocumentsBySupplierId.set(supplierKey, [nextDocument, ...currentDocuments]);
  return nextDocument;
};

const listDemoNews = (supplierId) => demoNewsBySupplierId.get(String(supplierId)) || [];

const answerDemoQuestion = (supplierId, question) => {
  const supplier = getDemoSupplier(supplierId);
  const name = supplier?.name || 'this supplier';

  if (/risk|risk score|risk profile/i.test(question)) {
    return `${name} currently carries a moderate demo risk profile with a score of ${supplier?.riskScore ?? 34}.`;
  }

  if (/contract|expiry|renewal|term/i.test(question)) {
    return `${name} has a demo contract expiry of ${supplier?.contractExpiry ? new Date(supplier.contractExpiry).toLocaleDateString() : 'unknown'}.`;
  }

  return `Demo answer for ${name}: upload a document and connect MongoDB plus Gemini to enable real contract analysis.`;
};

module.exports = {
  registerDemoUser,
  findDemoUser,
  getDemoUserById,
  listDemoSuppliers,
  getDemoSupplier,
  upsertDemoSupplier,
  recordDemoDocument,
  recordDemoUploadedDocument,
  listDemoDocuments,
  listDemoNews,
  answerDemoQuestion,
};