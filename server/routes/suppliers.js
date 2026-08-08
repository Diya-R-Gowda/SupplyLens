const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const Supplier = require('../models/Supplier');
const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const { openDownloadStream } = require('../services/gridfsService');
const { deleteSupplierCascade } = require('../services/supplierCascadeService');
const { getSupplierForecast } = require('../services/predictiveAnalyticsService');
const { enrichSupplierData, enrichEsgData, enrichLogisticsData } = require('../services/enrichmentService');
const { gatherSupplierData } = require('../services/supplierAggregationService');
const { getOrgWeights } = require('../services/riskConfigService');
const { buildNarrativesForHistory } = require('../services/narrativeService');
const { buildSupplierTwin } = require('../services/twinService');
const { takeSnapshot } = require('../services/snapshotService');
const SupplierSnapshot = require('../models/SupplierSnapshot');
const { syncScoresAfterChange } = require('../services/twinSyncService');
const { computeRiskScore } = require('../services/riskScoreService');
const { computeHealthScore } = require('../services/healthScoreService');
const NewsCache = require('../models/NewsCache');
const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');
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
  // Past dates are deliberately allowed: an already-lapsed contract is a
  // real, important state to record (that's a risk signal, not bad input) -
  // only the shape of the value is being checked here, not how it compares to today.
  body('contractExpiry').optional({ nullable: true }).isISO8601().withMessage('Contract expiry must be a valid date (e.g. 2026-12-31)').toDate(),
];

const updateSupplierValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters'),
  body('country').optional().trim().customSanitizer(uppercase).matches(/^[A-Z]{2}$/).withMessage('Country must be a 2-letter ISO code (e.g. US)'),
  body('category').optional().isIn(CATEGORY_VALUES).withMessage(`Category must be one of: ${CATEGORY_VALUES.join(', ')}`),
  body('riskScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Risk score must be between 0 and 100').toFloat(),
  body('paymentTerms').optional().trim().isLength({ max: 100 }).withMessage('Payment terms must be at most 100 characters'),
  body('contractExpiry').optional({ nullable: true }).isISO8601().withMessage('Contract expiry must be a valid date (e.g. 2026-12-31)').toDate(),
];

const SUPPLIER_NOT_FOUND = () => new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');

// Scoped to the requester's org: a missing supplier and a supplier that
// belongs to a different org look identical (404) from the outside - never
// leak which one it was. A malformed id is a different kind of problem (it
// isn't shaped like an id at all, valid or not) and is deliberately NOT
// folded in here - same as GET/:id, it's left to throw its own CastError,
// which the centralized error middleware turns into a 400.
const findOrgSupplier = async (id, orgId) => {
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

// Escape regex metacharacters so a search term is matched literally, not
// interpreted as a pattern (avoids both wrong results and ReDoS from
// attacker-controlled regex).
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A MongoDB text index tokenizes into whole words, so "orth" wouldn't match
// "Northwind" - the wrong fit for a search-as-you-type box. A case-insensitive
// regex gives real substring matching; per-org supplier counts are small
// enough that an unanchored regex scan is fine without an index for it.
const buildNameFilter = (search) => {
  if (!search) return {};
  return { name: { $regex: escapeRegex(String(search)), $options: 'i' } };
};

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

const parsePagination = (page, limit) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);
  return { page: parsedPage, limit: parsedLimit };
};

const buildPaginationMeta = (total, page, limit) => ({
  pagination: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
});

// The two categorical fields on the schema (models/Supplier.js) - category is
// an enum, country is a normalized 2-letter code - are the natural exact-match
// filters. riskScore/contractExpiry are more naturally range queries than
// filters and aren't asked for here.
/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: List suppliers in the caller's organisation
 *     description: >
 *       Search is a case-insensitive substring match against name (not a whole-word text-index
 *       match, so partial terms like "orth" match "Northwind"). category and country are exact
 *       filters. Results are always scoped to the caller's own organisation.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive substring match against supplier name.
 *         example: north
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [raw_material, logistics, saas, other] }
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *         description: Exact match; normalized to uppercase. 2-letter ISO code.
 *         example: US
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *         description: Silently clamped to 100 even if a higher value is requested.
 *     responses:
 *       200:
 *         description: Page of suppliers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 6a6cf137f857b1ef1c7001e2
 *                   name: Northwind Logistics
 *                   category: logistics
 *                   country: US
 *                   riskScore: 34
 *                   contractExpiry: '2026-10-30T00:00:00.000Z'
 *                   paymentTerms: Net 30
 *                   orgId: 6a6cf137f857b1ef1c7001d5
 *                   createdAt: '2026-07-31T19:02:15.518Z'
 *                   updatedAt: '2026-07-31T19:02:15.518Z'
 *               meta:
 *                 pagination: { total: 1, page: 1, limit: 20, totalPages: 1 }
 *       401:
 *         description: Missing, malformed, or expired access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Token has expired, code: TOKEN_EXPIRED }
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  const { search, category, country } = req.query;
  const { page, limit } = parsePagination(req.query.page, req.query.limit);

  if (isDemoMode()) {
    let suppliers = listDemoSuppliers(req.user.orgId);
    if (search) {
      const needle = String(search).toLowerCase();
      suppliers = suppliers.filter((s) => s.name.toLowerCase().includes(needle));
    }
    if (category) {
      suppliers = suppliers.filter((s) => s.category === category);
    }
    if (country) {
      suppliers = suppliers.filter((s) => String(s.country).toUpperCase() === String(country).toUpperCase());
    }

    const total = suppliers.length;
    const start = (page - 1) * limit;
    const paged = suppliers.slice(start, start + limit);
    return sendSuccess(res, paged, { meta: buildPaginationMeta(total, page, limit) });
  }

  const filter = { orgId: req.user.orgId, ...buildNameFilter(search) };
  if (category) filter.category = category;
  if (country) filter.country = String(country).toUpperCase();

  const total = await Supplier.countDocuments(filter);
  const suppliers = await Supplier.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);

  return sendSuccess(res, suppliers, { meta: buildPaginationMeta(total, page, limit) });
}));

/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Create a supplier (admin only)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, country]
 *             properties:
 *               name: { type: string, maxLength: 200, example: Acme Freight Co }
 *               country: { type: string, description: 2-letter ISO code, example: GB }
 *               category: { type: string, enum: [raw_material, logistics, saas, other] }
 *               riskScore: { type: number, minimum: 0, maximum: 100, example: 42 }
 *               paymentTerms: { type: string, maxLength: 100, example: Net 45 }
 *               contractExpiry:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Past dates are accepted (an already-lapsed contract is valid data, not bad input).
 *                 example: '2026-12-31'
 *     responses:
 *       201:
 *         description: Supplier created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 _id: 6a6d971f13f9bbf357979799
 *                 name: Acme Freight Co
 *                 category: logistics
 *                 country: GB
 *                 riskScore: 42
 *                 orgId: 6a6d971e13f9bbf357979795
 *                 createdAt: '2026-08-01T06:50:07.398Z'
 *                 updatedAt: '2026-08-01T06:50:07.398Z'
 *       400:
 *         description: A field failed validation (see "details", keyed by field name)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error:
 *                 message: Validation failed
 *                 code: VALIDATION_ERROR
 *                 details: { country: 'Country must be a 2-letter ISO code (e.g. US)' }
 *       403:
 *         description: Caller is authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: 'Forbidden: insufficient permissions', code: FORBIDDEN }
 *       409:
 *         description: Another supplier in this org already has this exact name (name is unique per org)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error:
 *                 message: 'A record with that orgId, name already exists'
 *                 code: DUPLICATE_KEY
 *                 details: { fields: [orgId, name] }
 */
router.post('/', auth, requireRole('admin'), validate(createSupplierValidation), asyncHandler(async (req, res) => {
  const { name, category, country, contractExpiry, paymentTerms, riskScore } = req.body;

  if (isDemoMode()) {
    const supplier = upsertDemoSupplier(req.user.orgId, { name, category, country, contractExpiry, paymentTerms, riskScore });
    return sendSuccess(res, supplier, { status: 201 });
  }

  const newSupplier = new Supplier({
    name, category, country, contractExpiry, paymentTerms, riskScore,
    orgId: req.user.orgId,
  });
  const supplier = await newSupplier.save();
  return sendSuccess(res, supplier, { status: 201 });
}));

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     summary: Get a single supplier by id
 *     description: >
 *       A malformed id (not a valid ObjectId shape) 400s, while a well-formed id that doesn't
 *       exist - or belongs to a different organisation - 404s identically, so callers can never
 *       tell "wrong org" apart from "doesn't exist" from the response alone.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: 6a6cf137f857b1ef1c7001e2
 *     responses:
 *       200:
 *         description: Supplier found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 _id: 6a6cf137f857b1ef1c7001e2
 *                 name: Northwind Logistics
 *                 category: logistics
 *                 country: US
 *                 riskScore: 34
 *                 contractExpiry: '2026-10-30T00:00:00.000Z'
 *                 paymentTerms: Net 30
 *                 orgId: 6a6cf137f857b1ef1c7001d5
 *                 createdAt: '2026-07-31T19:02:15.518Z'
 *                 updatedAt: '2026-07-31T19:02:15.518Z'
 *       400:
 *         description: id is not a validly-shaped ObjectId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: 'Invalid _id: not-an-id', code: INVALID_ID }
 *       404:
 *         description: No supplier with that id in the caller's organisation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 */
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

  // Closes a real pre-existing gap: manual edits (e.g. changing
  // contractExpiry, which is 30% of the risk formula and 15% of health's)
  // never triggered any recompute before, so both scores could silently go
  // stale until the next scheduled news cron incidentally touched this
  // supplier. Skip the risk recompute specifically when the caller just
  // explicitly set riskScore in this same request - that's a deliberate
  // manual override, and immediately recomputing it away would defeat the
  // point of letting an admin set it directly. Health has no equivalent
  // direct-override field, so it always recomputes here.
  if (req.body.riskScore === undefined) {
    await computeRiskScore(updated, 'manual_edit');
  }
  await computeHealthScore(updated, 'manual_edit');

  return sendSuccess(res, updated);
});

/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     summary: Update a supplier (admin only)
 *     description: >
 *       PUT and PATCH are handled identically by the same code path here: every field is
 *       optional, and only the fields present in the body are changed - omitted fields are
 *       left as-is.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: 6a6cf137f857b1ef1c7001e2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 200 }
 *               country: { type: string, description: 2-letter ISO code }
 *               category: { type: string, enum: [raw_material, logistics, saas, other] }
 *               riskScore: { type: number, minimum: 0, maximum: 100, example: 55 }
 *               paymentTerms: { type: string, maxLength: 100 }
 *               contractExpiry: { type: string, format: date-time, nullable: true }
 *     responses:
 *       200:
 *         description: Updated supplier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 _id: 6a6cf137f857b1ef1c7001e2
 *                 name: Northwind Logistics
 *                 category: logistics
 *                 country: US
 *                 riskScore: 55
 *                 orgId: 6a6cf137f857b1ef1c7001d5
 *                 updatedAt: '2026-08-01T07:10:00.000Z'
 *       400:
 *         description: A field failed validation, or id is not a validly-shaped ObjectId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error:
 *                 message: Validation failed
 *                 code: VALIDATION_ERROR
 *                 details: { riskScore: 'Risk score must be between 0 and 100' }
 *       403:
 *         description: Caller is authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: 'Forbidden: insufficient permissions', code: FORBIDDEN }
 *       404:
 *         description: No supplier with that id in the caller's organisation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 *   patch:
 *     summary: Same as PUT /suppliers/{id} - both are handled by the identical code path (admin only)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: 6a6cf137f857b1ef1c7001e2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 200 }
 *               country: { type: string, description: 2-letter ISO code }
 *               category: { type: string, enum: [raw_material, logistics, saas, other] }
 *               riskScore: { type: number, minimum: 0, maximum: 100 }
 *               paymentTerms: { type: string, maxLength: 100 }
 *               contractExpiry: { type: string, format: date-time, nullable: true }
 *     responses:
 *       200:
 *         description: Updated supplier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: A field failed validation, or id is not a validly-shaped ObjectId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       403:
 *         description: Caller is authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       404:
 *         description: No supplier with that id in the caller's organisation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
// Update a supplier, scoped to the requester's org (admin only, matching create/delete)
router.put('/:id', auth, requireRole('admin'), validate(updateSupplierValidation), updateHandler);
router.patch('/:id', auth, requireRole('admin'), validate(updateSupplierValidation), updateHandler);

/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     summary: Delete a supplier (admin only)
 *     description: >
 *       Hard, permanent delete that cascades to every collection referencing this supplier -
 *       documents, doc chunks, GridFS binaries, news cache, conversations, risk/health history,
 *       and snapshots - so nothing is left orphaned behind it.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: 6a6cf137f857b1ef1c7001e2
 *     responses:
 *       200:
 *         description: Supplier deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data: null
 *               message: Supplier deleted
 *       400:
 *         description: id is not a validly-shaped ObjectId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: 'Invalid _id: not-an-id', code: INVALID_ID }
 *       403:
 *         description: Caller is authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: 'Forbidden: insufficient permissions', code: FORBIDDEN }
 *       404:
 *         description: No supplier with that id in the caller's organisation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 */
// Delete a supplier, scoped to the requester's org (admin only)
router.delete('/:id', auth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    findOrgDemoSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org
    deleteDemoSupplier(req.user.orgId, req.params.id);
    return sendSuccess(res, null, { message: 'Supplier deleted' });
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId);
  await deleteSupplierCascade(supplier);
  return sendSuccess(res, null, { message: 'Supplier deleted' });
}));

/**
 * @swagger
 * /suppliers/{id}/documents/{docId}/file:
 *   get:
 *     summary: Download the original PDF binary for a document
 *     description: >
 *       Streams the original uploaded file straight from GridFS (never buffered fully in
 *       memory). Org-scoped like every other supplier route - the supplier must belong to the
 *       caller's organisation, and the document must belong to that supplier, or this 404s.
 *       Not available in demo mode, since no real file storage happens there.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Supplier id
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: string }
 *         description: Document id (from GET /documents/{supplierId})
 *     responses:
 *       200:
 *         description: The original PDF binary
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       400:
 *         description: Not available in demo mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Original file retrieval is not available in demo mode, code: DEMO_MODE_UNSUPPORTED }
 *       404:
 *         description: >
 *           Two distinct cases share this status: the supplier isn't in the caller's org (or
 *           doesn't exist), or the document doesn't belong to that supplier - both return
 *           DOCUMENT_NOT_FOUND; separately, the Document record exists but its GridFS binary is
 *           gone (data corruption, or the file was deleted outside the normal delete endpoint) -
 *           that returns DOCUMENT_FILE_NOT_FOUND instead, verified live against a real orphaned
 *           reference.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             examples:
 *               documentOrSupplierNotFound:
 *                 summary: No such supplier in this org, or no such document for that supplier
 *                 value:
 *                   success: false
 *                   error: { message: Document not found, code: DOCUMENT_NOT_FOUND }
 *               gridFsFileMissing:
 *                 summary: Document record exists but its GridFS binary is gone
 *                 value:
 *                   success: false
 *                   error: { message: Document file not found, code: DOCUMENT_FILE_NOT_FOUND }
 */
router.get('/:id/documents/:docId/file', auth, asyncHandler(async (req, res, next) => {
  if (isDemoMode()) {
    throw new ApiError('Original file retrieval is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const document = await Document.findOne({ _id: req.params.docId, supplierId: req.params.id });
  if (!document || !document.gridFsFileId) {
    throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const downloadStream = openDownloadStream(document.gridFsFileId);

  // GridFSBucketReadStream emits its "not found" error asynchronously, after
  // this handler has already returned - asyncHandler's catch can't see it, so
  // it's translated to a clean 404 here instead of falling through as a 500.
  downloadStream.on('error', (err) => {
    if (res.headersSent) return next(err);
    next(new ApiError('Document file not found', 404, 'DOCUMENT_FILE_NOT_FOUND'));
  });

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `inline; filename="${document.fileName}"`);
  downloadStream.pipe(res);
}));

/**
 * @swagger
 * /suppliers/{id}/conversations:
 *   get:
 *     summary: List the caller's past RAG conversations for a supplier
 *     description: >
 *       Conversations are private per-user - this only ever returns conversations started by the
 *       calling user, never another org member's, even though both would pass the org check. Most
 *       recently updated first. Demo mode always returns an empty array, since no conversation is
 *       persisted there. Org-scoped like every other supplier-facing route - a supplier belonging
 *       to a different org 404s rather than leaking whether it exists.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Supplier id
 *     responses:
 *       200:
 *         description: The caller's conversations for this supplier, most recently updated first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 6a6cf137f857b1ef1c7004a2
 *                   supplierId: 6a6cf137f857b1ef1c7001e2
 *                   messages:
 *                     - { role: user, content: "What's their risk score?", timestamp: '2026-08-01T19:00:00.000Z' }
 *                     - { role: assistant, content: 'Their risk score is 72.', timestamp: '2026-08-01T19:00:02.000Z', sources: [msa-2026.pdf] }
 *                   createdAt: '2026-08-01T19:00:00.000Z'
 *                   updatedAt: '2026-08-01T19:00:02.000Z'
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 */
router.get('/:id/conversations', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, []);
  }

  await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const conversations = await Conversation.find({
    supplierId: req.params.id, orgId: req.user.orgId, userId: req.user.id,
  })
    .sort({ updatedAt: -1 })
    .lean();

  return sendSuccess(res, conversations);
}));

/**
 * @swagger
 * /suppliers/{id}/enrich:
 *   post:
 *     summary: Populate AI-generated company enrichment for a supplier
 *     description: >
 *       Prompts Gemini to research the supplier's name and returns industry, company size, founding
 *       year, and a short summary. **This is AI-generated, not a verified data source** - the
 *       response can be wrong or hallucinated, and the UI must present it as unverified rather than
 *       fact. Re-runnable: calling this again overwrites the previous enrichment and updates
 *       `enrichedAt`, so it's meant to be refreshed periodically rather than treated as permanent.
 *       Not available in demo mode (no real Gemini call happens there).
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Enrichment populated and saved on the supplier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 industry: Automotive manufacturing
 *                 companySize: 100,000+ employees
 *                 foundedYear: 2003
 *                 summary: Designs and manufactures electric vehicles and energy storage systems.
 *                 source: gemini
 *                 enrichedAt: '2026-08-02T12:00:00.000Z'
 *       400:
 *         description: Not available in demo mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Enrichment is not available in demo mode, code: DEMO_MODE_UNSUPPORTED }
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 *       500:
 *         description: The Gemini call failed or returned an unparseable response - never silently reported as success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Internal server error, code: INTERNAL_ERROR }
 */
router.post('/:id/enrich', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Enrichment is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const enrichment = await enrichSupplierData(supplier.name);
  supplier.enrichment = enrichment;
  await supplier.save();

  // Enrichment doesn't feed either formula directly - there's no clear,
  // non-speculative signal for how industry/company-size/founding-year
  // should move risk or health without more product input (see TODO.md).
  // This recompute is just a freshness opportunity (e.g. picking up
  // news/document changes since the last update), same reason bucket as
  // any other trigger so it's independently rate-limited from news-driven
  // ones.
  await syncScoresAfterChange(supplier, 'enrichment_update');

  return sendSuccess(res, enrichment);
}));

/**
 * @swagger
 * /suppliers/{id}/esg-refresh:
 *   post:
 *     summary: Populate AI-generated ESG estimate for a supplier
 *     description: >
 *       Prompts Gemini for an environmental/social/governance estimate (0-100 scores plus a summary).
 *       **This is AI-generated, not a verified data source** - there's no ground truth to check it
 *       against, so the UI must present it as unverified. Re-runnable: overwrites the previous
 *       value and updates `refreshedAt`. Not available in demo mode.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: ESG estimate populated and saved on the supplier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 environmentalScore: 62
 *                 socialScore: 58
 *                 governanceScore: 70
 *                 summary: Has published sustainability targets but faced some supply-chain labor scrutiny.
 *                 source: gemini
 *                 refreshedAt: '2026-08-02T12:00:00.000Z'
 *       400:
 *         description: Not available in demo mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.post('/:id/esg-refresh', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('ESG refresh is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const esg = await enrichEsgData(supplier.name);
  supplier.esg = esg;
  await supplier.save();

  // Health Score only, deliberately no risk recompute - ESG has no input
  // into the risk formula at all, but it's a direct Health Score factor
  // (esgScore, 25% weight).
  await computeHealthScore(supplier, 'esg_update');

  return sendSuccess(res, esg);
}));

/**
 * @swagger
 * /suppliers/{id}/logistics-refresh:
 *   post:
 *     summary: Populate AI-generated logistics/operational estimate for a supplier
 *     description: >
 *       Prompts Gemini for an on-time-delivery-rate/lead-time estimate. **This is AI-generated, not
 *       a verified data source**, and this specific data (unlike enrichment/ESG) is rarely public at
 *       all for most companies - expect `null` fields far more often than the enrich/esg-refresh
 *       endpoints. Re-runnable: overwrites the previous value and updates `refreshedAt`. Not
 *       available in demo mode.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Logistics estimate populated and saved on the supplier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 onTimeDeliveryRate: null
 *                 averageLeadTimeDays: null
 *                 logisticsNotes: Operates a large multinational manufacturing and distribution network.
 *                 source: gemini
 *                 refreshedAt: '2026-08-02T12:00:00.000Z'
 *       400:
 *         description: Not available in demo mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.post('/:id/logistics-refresh', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Logistics refresh is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const logistics = await enrichLogisticsData(supplier.name);
  supplier.logistics = logistics;
  await supplier.save();

  // Same reasoning as esg-refresh above - logistics feeds Health Score's
  // logisticsScore factor directly, but has no risk-formula input.
  await computeHealthScore(supplier, 'logistics_update');

  return sendSuccess(res, logistics);
}));

/**
 * @swagger
 * /suppliers/{id}/twin:
 *   get:
 *     summary: Digital Twin - current-state synthesis of everything known about a supplier
 *     description: >
 *       Combines internal and external supplier data into a single "what is true about this
 *       supplier right now" profile - current risk score plus its live contributing factors,
 *       current enrichment/ESG/logistics data (each null if never refreshed), document count and
 *       most recent upload, a news sentiment rollup and most recent headline, contract status, and
 *       an `alerts` object (Phase 5 Step 5) showing whether risk/health currently breach the org's
 *       configured thresholds (server/services/alertService.js) - also computed fresh on every
 *       read, so it's always accurate regardless of when the score last changed.
 *       Computed on every read from current data (not persisted) - the same precedent as the
 *       timeline endpoint, so it's always fresh by construction. See
 *       `GET /suppliers/{id}/timeline` for the equivalent chronological history view, and
 *       `GET /suppliers/{id}/snapshots` for point-in-time copies of this same shape. Not
 *       available in demo mode.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Current-state synthesis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.get('/:id/twin', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, null);
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const twin = await buildSupplierTwin(supplier);

  return sendSuccess(res, twin);
}));

/**
 * @swagger
 * /suppliers/{id}/snapshot:
 *   post:
 *     summary: Take an on-demand point-in-time snapshot of the supplier's current twin state
 *     description: >
 *       Persists a copy of the same shape `GET /suppliers/{id}/twin` returns, tagged
 *       `reason: manual`. Complements the daily scheduled snapshot job. Subject to the same
 *       retention cap (last 100 snapshots per supplier) as scheduled snapshots - see
 *       `snapshotService.js`. Not available in demo mode.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Snapshot taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.post('/:id/snapshot', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Snapshots are not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const snapshot = await takeSnapshot(supplier, 'manual');

  return sendSuccess(res, snapshot);
}));

/**
 * @swagger
 * /suppliers/{id}/snapshots:
 *   get:
 *     summary: List point-in-time snapshots for a supplier (paginated)
 *     description: >
 *       Metadata only (id, reason, createdAt, and the risk/health scores at capture time) - fetch
 *       `GET /suppliers/{id}/snapshots/{snapshotId}` for a snapshot's full twin-shaped state.
 *       Not available in demo mode (returns an empty list).
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated snapshot metadata, most recent first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.get('/:id/snapshots', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, [], buildPaginationMeta(0, 1, DEFAULT_PAGE_LIMIT));
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org
  const { page, limit } = parsePagination(req.query.page, req.query.limit);

  const [snapshots, total] = await Promise.all([
    SupplierSnapshot.find({ supplierId: supplier._id, orgId: req.user.orgId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id reason createdAt state.risk.score state.health.score')
      .lean(),
    SupplierSnapshot.countDocuments({ supplierId: supplier._id, orgId: req.user.orgId }),
  ]);

  const summaries = snapshots.map((snap) => ({
    _id: snap._id,
    reason: snap.reason,
    createdAt: snap.createdAt,
    riskScore: snap.state?.risk?.score ?? null,
    healthScore: snap.state?.health?.score ?? null,
  }));

  return sendSuccess(res, summaries, buildPaginationMeta(total, page, limit));
}));

/**
 * @swagger
 * /suppliers/{id}/snapshots/{snapshotId}:
 *   get:
 *     summary: Fetch a single snapshot's full twin-shaped state
 *     description: >
 *       Returns the complete state captured at that point in time - the same shape as
 *       `GET /suppliers/{id}/twin`. A frontend can fetch two snapshots this way and diff them
 *       client-side for comparison.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: snapshotId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full snapshot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       404:
 *         description: No such supplier or snapshot in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.get('/:id/snapshots/:snapshotId', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Snapshot not found', 404, 'SNAPSHOT_NOT_FOUND');
  }

  await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const snapshot = await SupplierSnapshot.findOne({
    _id: req.params.snapshotId,
    supplierId: req.params.id,
    orgId: req.user.orgId,
  }).lean();

  if (!snapshot) {
    throw new ApiError('Snapshot not found', 404, 'SNAPSHOT_NOT_FOUND');
  }

  return sendSuccess(res, snapshot);
}));

/**
 * @swagger
 * /suppliers/{id}/timeline:
 *   get:
 *     summary: Chronological feed of events for a supplier
 *     description: >
 *       Aggregated on read from existing collections (Supplier, Document, NewsCache, RiskHistory)
 *       rather than a dedicated event-log model - avoids duplicating data that already exists
 *       elsewhere and needing to keep it in sync. Merges supplier_created / supplier_updated (only
 *       if the supplier has actually been edited since creation) / document_uploaded /
 *       news_mentioned / risk_changed events, sorted most recent first. risk_changed/health_changed
 *       events include a `narrative` field - a deterministic, weight-aware plain-language
 *       explanation (narrativeService.js) of what mainly drove that particular change, computed
 *       by comparing this change's factors against the immediately preceding change's factors.
 *       Not available in demo mode.
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Merged, chronologically-sorted event feed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 - type: risk_changed
 *                   timestamp: '2026-08-02T12:05:00.000Z'
 *                   previousScore: 30
 *                   newScore: 45
 *                   delta: 15
 *                   reason: scheduled_news_update
 *                   narrative: Risk score rose by +15, mainly because of negative news sentiment (40% of the formula).
 *                 - type: news_mentioned
 *                   timestamp: '2026-08-02T11:00:00.000Z'
 *                   headline: Example headline
 *                   sentiment: negative
 *                 - type: document_uploaded
 *                   timestamp: '2026-08-01T19:10:00.000Z'
 *                   fileName: msa-2026.pdf
 *                 - type: supplier_created
 *                   timestamp: '2026-07-31T09:00:00.000Z'
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 */
router.get('/:id/timeline', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, []);
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org

  const { documents, news, riskChanges, healthChanges } = await gatherSupplierData(supplier);
  const { risk: riskWeights, health: healthWeights } = await getOrgWeights(supplier.orgId);
  const riskNarratives = buildNarrativesForHistory(riskChanges, riskWeights, 'risk');
  const healthNarratives = buildNarrativesForHistory(healthChanges, healthWeights, 'health');

  const events = [
    { type: 'supplier_created', timestamp: supplier.createdAt },
    // Only a real signal if the supplier has actually changed since creation -
    // otherwise every supplier would show a redundant "updated" event for
    // its own creation (createdAt and updatedAt start out equal).
    ...(supplier.updatedAt > supplier.createdAt
      ? [{ type: 'supplier_updated', timestamp: supplier.updatedAt }]
      : []),
    ...documents.map((doc) => ({
      type: 'document_uploaded', timestamp: doc.uploadedAt, fileName: doc.fileName,
    })),
    ...news.map((item) => ({
      type: 'news_mentioned', timestamp: item.publishedAt, headline: item.headline, sentiment: item.sentiment,
    })),
    ...riskChanges.map((change) => ({
      type: 'risk_changed',
      timestamp: change.createdAt,
      previousScore: change.previousScore,
      newScore: change.newScore,
      delta: change.delta,
      reason: change.reason,
      factors: change.factors,
      narrative: riskNarratives.get(String(change._id)),
    })),
    ...healthChanges.map((change) => ({
      type: 'health_changed',
      timestamp: change.createdAt,
      previousScore: change.previousScore,
      newScore: change.newScore,
      delta: change.delta,
      reason: change.reason,
      factors: change.factors,
      narrative: healthNarratives.get(String(change._id)),
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return sendSuccess(res, events);
}));

/**
 * @swagger
 * /suppliers/{id}/risk-health-history:
 *   get:
 *     summary: Paginated risk and health score history, for trend charts
 *     description: >
 *       Reads RiskHistory/HealthHistory directly (unlike the timeline endpoint, which mixes them
 *       with documents/news into one chronological feed) - built for plotting score-over-time
 *       trend lines rather than a general activity feed. Each series is independently paginated,
 *       most-recent-first (same convention as every other paginated endpoint); reverse client-side
 *       for chronological chart order. An optional `days` param restricts to recent history (e.g.
 *       `days=30` for a "recent trend" view) without needing pagination for that common case. Not
 *       available in demo mode (returns empty series).
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: days
 *         schema: { type: integer }
 *         description: Only include changes from the last N days (applied before pagination).
 *     responses:
 *       200:
 *         description: Paginated risk and health score history, most recent first in each series
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 risk:
 *                   items:
 *                     - timestamp: '2026-08-02T12:05:00.000Z'
 *                       previousScore: 30
 *                       newScore: 45
 *                       delta: 15
 *                       reason: scheduled_news_update
 *                       factors: { newsScore: 100, expiryScore: 50, docScore: 50, countryScore: 50 }
 *                   pagination: { total: 1, page: 1, limit: 20, totalPages: 1 }
 *                 health:
 *                   items: []
 *                   pagination: { total: 0, page: 1, limit: 20, totalPages: 1 }
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.get('/:id/risk-health-history', auth, asyncHandler(async (req, res) => {
  const emptySeries = () => ({ items: [], ...buildPaginationMeta(0, 1, DEFAULT_PAGE_LIMIT) });
  if (isDemoMode()) {
    return sendSuccess(res, { risk: emptySeries(), health: emptySeries() });
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org
  const { page, limit } = parsePagination(req.query.page, req.query.limit);
  const days = parseInt(req.query.days, 10);
  const dateFilter = Number.isFinite(days) && days > 0
    ? { createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } }
    : {};

  const fetchSeries = async (Model) => {
    const query = { supplierId: supplier._id, orgId: req.user.orgId, ...dateFilter };
    const [docs, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Model.countDocuments(query),
    ]);
    const items = docs.map((d) => ({
      timestamp: d.createdAt,
      previousScore: d.previousScore,
      newScore: d.newScore,
      delta: d.delta,
      reason: d.reason,
      factors: d.factors,
    }));
    return { items, ...buildPaginationMeta(total, page, limit) };
  };

  const [risk, health] = await Promise.all([fetchSeries(RiskHistory), fetchSeries(HealthHistory)]);

  return sendSuccess(res, { risk, health });
}));

/**
 * @swagger
 * /suppliers/{id}/forecast:
 *   get:
 *     summary: Hand-rolled linear-regression risk/health forecast for a supplier
 *     description: >
 *       Fits a straight line through this supplier's real RiskHistory/HealthHistory rows and
 *       projects it 7 and 30 days out, with a confidence interval that widens for fewer points and
 *       longer horizons. Below a minimum point count (5) or minimum real time spread (24h total
 *       span - guards against a burst of same-instant test-script rows counting as real history),
 *       `status` is `insufficient_data` and no projection is returned at all - this is expected to
 *       be the common case today, not an edge case (see the Phase 6 audit in CONTRIBUTING.md). Not
 *       available in demo mode.
 *     tags: [Forecasting]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Forecast (or an explicit insufficient_data result) for both risk and health
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 risk: { status: insufficient_data, dataQuality: { pointCount: 2, spanHours: 0.03, minPointsRequired: 5, minSpanHoursRequired: 24, reason: too_few_points }, projections: [] }
 *                 health: { status: insufficient_data, dataQuality: { pointCount: 0, spanHours: 0, minPointsRequired: 5, minSpanHoursRequired: 24, reason: no_history }, projections: [] }
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.get('/:id/forecast', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const insufficient = { status: 'insufficient_data', dataQuality: { pointCount: 0, spanHours: 0, minPointsRequired: 5, minSpanHoursRequired: 24, reason: 'no_history' }, projections: [] };
    return sendSuccess(res, { risk: insufficient, health: insufficient });
  }

  const supplier = await findOrgSupplier(req.params.id, req.user.orgId); // 404s if missing/cross-org
  const forecast = await getSupplierForecast(supplier);
  return sendSuccess(res, forecast);
}));

module.exports = router;
