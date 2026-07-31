const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs a set of express-validator chains, then throws one ApiError with a
// field-level details map if any failed - same shape the error middleware
// already produces for Mongoose ValidationError, so clients get one
// consistent format regardless of which layer caught the bad input.
module.exports = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = {};
  for (const err of result.array()) {
    if (!details[err.path]) details[err.path] = err.msg;
  }

  next(new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details));
};
