const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

// Component schemas are defined once here (not per-endpoint) and referenced
// via $ref from the @swagger JSDoc comments in routes/*.js.
const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SupplyLens API',
      version: '1.0.0',
      description:
        'REST API for SupplyLens, a supplier management and risk-tracking platform.\n\n' +
        'Every response uses one of two envelopes:\n' +
        '- Success: `{ "success": true, "data": ..., "message"?: string, "meta"?: object }`\n' +
        '- Error: `{ "success": false, "error": { "message": string, "code": string, "details"?: object } }`\n\n' +
        "Most endpoints require a Bearer access token from `/auth/login` or `/auth/register`, and are scoped to the " +
        "caller's organisation (`orgId`) - a record that belongs to a different org returns 404, never 403, so " +
        "existence can't be inferred across organisations.",
    },
    servers: [{ url: '/api', description: 'Same-origin API base path' }],
    tags: [
      { name: 'Auth', description: 'Registration, login, token refresh, and logout.' },
      { name: 'Suppliers', description: 'Org-scoped supplier CRUD, search, filtering, and pagination.' },
      { name: 'Dashboard', description: 'Aggregated supplier statistics for the dashboard UI.' },
      { name: 'Documents', description: 'Contract PDF upload and ingestion for a supplier.' },
      { name: 'News', description: 'Cached news/sentiment items for a supplier.' },
      { name: 'RAG', description: 'Ask questions about a supplier\'s ingested contract documents.' },
      { name: 'Config', description: 'Per-org configurable risk/health scoring weights and alert thresholds.' },
      { name: 'Forecasting', description: 'Phase 6 - hand-rolled linear-regression forecasts (per-supplier and portfolio-level), gated on real data sufficiency.' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Access token returned by POST /auth/login or /auth/register. Expires after 15 minutes - use ' +
            'POST /auth/refresh with the paired refresh token to get a new one.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          description: "The caller's account, as returned in auth responses (never includes the password hash).",
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@acme.com' },
            role: { type: 'string', enum: ['admin', 'viewer'], example: 'admin' },
            orgId: { type: 'string', example: '6a6cf137f857b1ef1c7001d5' },
          },
        },
        Supplier: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6a6cf137f857b1ef1c7001e2' },
            name: { type: 'string', example: 'Northwind Logistics' },
            category: {
              type: 'string',
              enum: ['raw_material', 'logistics', 'saas', 'other'],
              nullable: true,
              example: 'logistics',
            },
            country: { type: 'string', description: '2-letter ISO 3166-1 alpha-2 code', example: 'US' },
            riskScore: { type: 'number', minimum: 0, maximum: 100, example: 34 },
            contractExpiry: { type: 'string', format: 'date-time', nullable: true, example: '2026-10-30T00:00:00.000Z' },
            paymentTerms: { type: 'string', example: 'Net 30' },
            orgId: { type: 'string', example: '6a6cf137f857b1ef1c7001d5' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SuccessEnvelope: {
          type: 'object',
          description: 'Standard success envelope returned by every endpoint (see utils/response.js).',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean', example: true },
            data: {},
            message: { type: 'string' },
            meta: { type: 'object' },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          description: 'Standard error envelope produced by the centralized error middleware (see middleware/errorHandler.js).',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              required: ['message', 'code'],
              properties: {
                message: { type: 'string', example: 'Supplier not found' },
                code: { type: 'string', example: 'SUPPLIER_NOT_FOUND' },
                details: { type: 'object', additionalProperties: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  },
  // glob (used internally by swagger-jsdoc) only matches forward-slash patterns,
  // so path.join's backslashes on Windows must be normalized before use.
  apis: [path.join(__dirname, '../routes/*.js').split(path.sep).join('/')],
};

module.exports = swaggerJsdoc(options);
