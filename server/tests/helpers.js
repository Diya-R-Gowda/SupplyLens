const request = require('supertest');
const app = require('../index');

// Registers a brand-new org+admin user through the real /auth/register
// endpoint (not a raw DB seed - matching this project's established
// real-API test-data pattern) and returns the token plus identifiers a test
// needs to act as that user.
const registerUser = async (prefix = 'user') => {
  const email = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'TestPass123!';
  const res = await request(app).post('/api/auth/register').send({ email, password });
  if (res.status !== 201) {
    throw new Error(`registerUser helper failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { email, password, ...res.body.data };
};

module.exports = { app, request, registerUser };
