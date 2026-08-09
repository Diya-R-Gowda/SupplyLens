const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { sendSuccess } = require('../utils/response');

const READY_STATE_NAMES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Liveness check - is the process up and serving requests
 *     description: >
 *       No auth required (standard for health checks - a load balancer or uptime monitor has no
 *       token). Always 200 if the process can respond at all; does not check MongoDB - see
 *       GET /health/db for that.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Process is up
 */
router.get('/health', (req, res) => {
  return sendSuccess(res, { status: 'ok', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /health/db:
 *   get:
 *     summary: MongoDB connection state
 *     description: >
 *       Reports Mongoose's real connection readyState honestly - `connected: false` is not
 *       necessarily a failure: this app has an intentional demo-mode fallback (see README/
 *       CONTRIBUTING) that runs with no MongoDB connection at all, so a monitoring tool alerting
 *       on this endpoint should treat a sustained "disconnected" in an environment that expects a
 *       real DB as the actual signal, not this endpoint's status code (always 200 - the process
 *       itself is still up and able to answer either way).
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Current MongoDB connection state
 */
router.get('/health/db', (req, res) => {
  const readyState = mongoose.connection.readyState;
  return sendSuccess(res, {
    status: 'ok',
    db: { connected: readyState === 1, state: READY_STATE_NAMES[readyState] || 'unknown' },
  });
});

module.exports = router;
