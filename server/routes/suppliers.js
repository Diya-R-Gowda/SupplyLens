const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');
const {
  listDemoSuppliers,
  upsertDemoSupplier,
  getDemoSupplier,
  updateDemoSupplier,
  deleteDemoSupplier,
} = require('../services/demoStore');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

const SUPPLIER_NOT_FOUND = () => new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');

// Scoped to the requester's org: a malformed id, a missing supplier, and a
// supplier that belongs to a different org all look identical (404) from the
// outside - never leak which one it was.
const findOrgSupplier = async (id, orgId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw SUPPLIER_NOT_FOUND();
  }

  const supplier = await Supplier.findOne({ _id: id, orgId });
  if (!supplier) {
    throw SUPPLIER_NOT_FOUND();
  }

  return supplier;
};

const findOrgDemoSupplier = (id, orgId) => {
  const supplier = getDemoSupplier(id);
  if (!supplier || String(supplier.orgId) !== String(orgId)) {
    throw SUPPLIER_NOT_FOUND();
  }
  return supplier;
};

// Get all suppliers for the organization
router.get('/', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, listDemoSuppliers(req.user.orgId));
  }

  const suppliers = await Supplier.find({ orgId: req.user.orgId });
  return sendSuccess(res, suppliers);
}));

// Create a supplier (admin only)
router.post('/', auth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, category, country, contractExpiry, paymentTerms } = req.body;

  if (isDemoMode()) {
    const supplier = upsertDemoSupplier(req.user.orgId, { name, category, country, contractExpiry, paymentTerms });
    return sendSuccess(res, supplier, { status: 201 });
  }

  const newSupplier = new Supplier({
    name, category, country, contractExpiry, paymentTerms,
    orgId: req.user.orgId,
  });
  const supplier = await newSupplier.save();
  return sendSuccess(res, supplier, { status: 201 });
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const supplier = getDemoSupplier(req.params.id);
    if (!supplier) throw new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
    return sendSuccess(res, supplier);
  }

  const supplier = await Supplier.findOne({ _id: req.params.id, orgId: req.user.orgId });
  if (!supplier) throw new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
  return sendSuccess(res, supplier);
}));

const applySupplierUpdate = (target, updates) => {
  for (const field of ['name', 'category', 'country', 'contractExpiry', 'paymentTerms', 'riskScore']) {
    if (updates[field] !== undefined) target[field] = updates[field];
  }
};

const updateHandler = asyncHandler(async (req, res) => {
  const updates = {
    name: req.body.name,
    category: req.body.category,
    country: req.body.country,
    contractExpiry: req.body.contractExpiry,
    paymentTerms: req.body.paymentTerms,
    riskScore: req.body.riskScore,
  };

  if (isDemoMode()) {
    findOrgDemoSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org
    const updated = updateDemoSupplier(req.user.orgId, req.params.id, updates);
    return sendSuccess(res, updated);
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId);
  applySupplierUpdate(supplier, updates);
  const updated = await supplier.save();
  return sendSuccess(res, updated);
});

// Update a supplier, scoped to the requester's org
router.put('/:id', auth, updateHandler);
router.patch('/:id', auth, updateHandler);

module.exports = router;
