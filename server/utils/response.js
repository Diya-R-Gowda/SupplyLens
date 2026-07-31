// Standard success envelope for the whole API: { success: true, data, message?, meta? }.
// `meta` carries response metadata alongside `data` without changing its
// shape - e.g. pagination info for a list endpoint (data stays the plain
// array; meta.pagination sits next to it).
// The matching error envelope, { success: false, error: { message, code, details? } },
// is built by the centralized error middleware (middleware/errorHandler.js) since
// error responses only ever originate from there.
const sendSuccess = (res, data, { status = 200, message, meta } = {}) => {
  const body = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

module.exports = { sendSuccess };
