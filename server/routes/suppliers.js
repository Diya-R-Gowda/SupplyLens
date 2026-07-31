const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');
const { listDemoSuppliers, upsertDemoSupplier, getDemoSupplier } = require('../services/demoStore');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

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

module.exports = router;
