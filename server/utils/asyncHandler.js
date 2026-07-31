// Wraps an async route handler so a thrown error or rejected promise reaches
// next(err) automatically, instead of every handler needing its own try/catch.
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
