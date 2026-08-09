const requireRole = require('../middleware/requireRole');

// Tests the middleware in isolation with mock req/res/next - no app, no DB,
// no HTTP. This is the actual gate every admin-only route in the app relies
// on, so its allow/deny logic deserves a direct unit test independent of any
// particular route wiring it correctly.
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireRole middleware', () => {
  test('calls next() with no error when req.user.role is in the allowed list', () => {
    const req = { user: { role: 'admin' } };
    const next = jest.fn();
    requireRole('admin')(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test('calls next(err) with a 403 ApiError when req.user.role is not in the allowed list', () => {
    const req = { user: { role: 'viewer' } };
    const next = jest.fn();
    requireRole('admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  test('calls next(err) with 403 when req.user is missing entirely', () => {
    const req = {};
    const next = jest.fn();
    requireRole('admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('accepts multiple allowed roles', () => {
    const next = jest.fn();
    requireRole('admin', 'viewer')({ user: { role: 'viewer' } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  test('a role not in a multi-role list is still rejected', () => {
    const next = jest.fn();
    requireRole('admin', 'viewer')({ user: { role: 'superuser' } }, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
