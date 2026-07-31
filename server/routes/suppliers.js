const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');
const { listDemoSuppliers, upsertDemoSupplier, getDemoSupplier } = require('../services/demoStore');

// Get all suppliers for the organization
router.get('/', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(listDemoSuppliers(req.user.orgId));
    }

    const suppliers = await Supplier.find({ orgId: req.user.orgId });
    res.json(suppliers);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Create a supplier (admin only)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { name, category, country, contractExpiry, paymentTerms } = req.body;
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(upsertDemoSupplier(req.user.orgId, {
        name,
        category,
        country,
        contractExpiry,
        paymentTerms,
      }));
    }

    const newSupplier = new Supplier({
      name, category, country, contractExpiry, paymentTerms,
      orgId: req.user.orgId
    });
    const supplier = await newSupplier.save();
    res.json(supplier);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const supplier = getDemoSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ msg: 'Supplier not found' });
      }

      return res.json(supplier);
    }

    const supplier = await Supplier.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!supplier) {
      return res.status(404).json({ msg: 'Supplier not found' });
    }

    return res.json(supplier);
  } catch (err) {
    return res.status(500).send('Server Error');
  }
});

module.exports = router;