// Standard success envelope for the whole API: { success: true, data, message? }.
// The matching error envelope, { success: false, error: { message, code, details? } },
// is built by the centralized error middleware (middleware/errorHandler.js) since
// error responses only ever originate from there.
const sendSuccess = (res, data, { status = 200, message } = {}) => {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
};

module.exports = { sendSuccess };
