const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Supplier = require('../models/Supplier');

// Get all suppliers for the organization
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ orgId: req.user.orgId });
    res.json(suppliers);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Create a supplier
router.post('/', auth, async (req, res) => {
  const { name, category, country, contractExpiry, paymentTerms } = req.body;
  try {
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

module.exports = router;