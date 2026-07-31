const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
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

const CATEGORY_VALUES = ['raw_material', 'logistics', 'saas', 'other'];
const uppercase = (value) => (typeof value === 'string' ? value.toUpperCase() : value);

// Mirrors the Supplier schema's own constraints (models/Supplier.js) so bad
// input is rejected with field-level messages here, before it ever reaches
// Mongoose - a raw ValidationError is still handled centrally as a fallback,
// but this gives callers a much better shape to build a form around.
const createSupplierValidation = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters'),
  body('country').trim().customSanitizer(uppercase).matches(/^[A-Z]{2}$/).withMessage('Country must be a 2-letter ISO code (e.g. US)'),
  body('category').optional().isIn(CATEGORY_VALUES).withMessage(`Category must be one of: ${CATEGORY_VALUES.join(', ')}`),
  body('riskScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Risk score must be between 0 and 100').toFloat(),
  body('paymentTerms').optional().trim().isLength({ max: 100 }).withMessage('Payment terms must be at most 100 characters'),
];

const updateSupplierValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters'),
  body('country').optional().trim().customSanitizer(uppercase).matches(/^[A-Z]{2}$/).withMessage('Country must be a 2-letter ISO code (e.g. US)'),
  body('category').optional().isIn(CATEGORY_VALUES).withMessage(`Category must be one of: ${CATEGORY_VALUES.join(', ')}`),
  body('riskScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Risk score must be between 0 and 100').toFloat(),
  body('paymentTerms').optional().trim().isLength({ max: 100 }).withMessage('Payment terms must be at most 100 characters'),
];

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
router.post('/', auth, requireRole('admin'), validate(createSupplierValidation), asyncHandler(async (req, res) => {
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
router.put('/:id', auth, validate(updateSupplierValidation), updateHandler);
router.patch('/:id', auth, validate(updateSupplierValidation), updateHandler);

// Delete a supplier, scoped to the requester's org (admin only)
router.delete('/:id', auth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    findOrgDemoSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org
    deleteDemoSupplier(req.user.orgId, req.params.id);
    return sendSuccess(res, null, { message: 'Supplier deleted' });
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId);
  await supplier.deleteOne();
  return sendSuccess(res, null, { message: 'Supplier deleted' });
}));

module.exports = router;
