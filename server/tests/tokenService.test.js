const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const db = require('./db');
const RefreshToken = require('../models/RefreshToken');
const {
  signAccessToken, issueTokenPair, consumeRefreshToken, revokeRefreshToken,
} = require('../services/tokenService');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

const fakeUser = () => ({ _id: new mongoose.Types.ObjectId(), orgId: new mongoose.Types.ObjectId(), role: 'admin' });

// Today tokenService is only ever exercised incidentally through
// auth.test.js's register/login/refresh/logout flow. This file drives the
// service directly: signing, rotation-on-consume, revocation, and the
// expired/invalid/revoked rejection paths that flow can't reach on its own
// (a freshly-issued token from /auth/register is never already expired or
// revoked).
describe('tokenService.signAccessToken', () => {
  test('signs a JWT carrying id/orgId/role that verifies against JWT_SECRET', () => {
    const user = fakeUser();
    const token = signAccessToken(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({ id: String(user._id), orgId: String(user.orgId), role: 'admin' });
  });

  test('the access token expires 15 minutes after issuance', () => {
    const decoded = jwt.decode(signAccessToken(fakeUser()));
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });
});

describe('tokenService.issueTokenPair / consumeRefreshToken (real DB)', () => {
  test('persists a real RefreshToken document whose stored hash differs from the raw token returned', async () => {
    const user = fakeUser();
    const { refreshToken } = await issueTokenPair(user);

    expect(await RefreshToken.countDocuments()).toBe(1);
    const stored = await RefreshToken.findOne();
    expect(stored.tokenHash).not.toBe(refreshToken);
    expect(String(stored.user)).toBe(String(user._id));
  });

  test('consuming a valid refresh token returns the owning userId and rotates it out (single use)', async () => {
    const user = fakeUser();
    const { refreshToken } = await issueTokenPair(user);

    const userId = await consumeRefreshToken(refreshToken);
    expect(userId).toBe(String(user._id));

    const reuse = await consumeRefreshToken(refreshToken);
    expect(reuse).toBeNull();
  });

  test('an unknown/garbage token is rejected rather than throwing', async () => {
    await expect(consumeRefreshToken('not-a-real-token')).resolves.toBeNull();
  });

  test('an expired token is rejected even though its hash still matches a stored record', async () => {
    const user = fakeUser();
    const { refreshToken } = await issueTokenPair(user);
    await RefreshToken.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });

    await expect(consumeRefreshToken(refreshToken)).resolves.toBeNull();
  });

  test('an already-revoked token is rejected', async () => {
    const user = fakeUser();
    const { refreshToken } = await issueTokenPair(user);
    await RefreshToken.updateMany({}, { revokedAt: new Date() });

    await expect(consumeRefreshToken(refreshToken)).resolves.toBeNull();
  });
});

describe('tokenService.revokeRefreshToken', () => {
  test('revokes an active token, reports true, and the token can no longer be consumed', async () => {
    const user = fakeUser();
    const { refreshToken } = await issueTokenPair(user);

    await expect(revokeRefreshToken(refreshToken)).resolves.toBe(true);
    await expect(consumeRefreshToken(refreshToken)).resolves.toBeNull();
  });

  test('revoking an already-revoked token reports false, not a repeat success', async () => {
    const user = fakeUser();
    const { refreshToken } = await issueTokenPair(user);
    await revokeRefreshToken(refreshToken);

    await expect(revokeRefreshToken(refreshToken)).resolves.toBe(false);
  });

  test('revoking a token that was never issued reports false', async () => {
    await expect(revokeRefreshToken('never-issued-token')).resolves.toBe(false);
  });
});

describe('tokenService demo mode - in-memory, no real DB writes', () => {
  test('a demo-issued refresh token is never written to the real RefreshToken collection', async () => {
    await issueTokenPair(fakeUser(), { demo: true });
    expect(await RefreshToken.countDocuments()).toBe(0);
  });

  test('a demo token can be consumed once via the demo in-memory store, then rotates out', async () => {
    const user = fakeUser();
    const { refreshToken } = await issueTokenPair(user, { demo: true });

    await expect(consumeRefreshToken(refreshToken, { demo: true })).resolves.toBe(String(user._id));
    await expect(consumeRefreshToken(refreshToken, { demo: true })).resolves.toBeNull();
  });

  test('a demo-issued token is invisible to the real (non-demo) consume path, and vice versa', async () => {
    const user = fakeUser();
    const { refreshToken: demoToken } = await issueTokenPair(user, { demo: true });
    await expect(consumeRefreshToken(demoToken)).resolves.toBeNull();

    const { refreshToken: realToken } = await issueTokenPair(user);
    await expect(consumeRefreshToken(realToken, { demo: true })).resolves.toBeNull();
  });

  test('a demo token can be revoked via the demo path, and a second revoke reports false', async () => {
    const { refreshToken } = await issueTokenPair(fakeUser(), { demo: true });
    await expect(revokeRefreshToken(refreshToken, { demo: true })).resolves.toBe(true);
    await expect(revokeRefreshToken(refreshToken, { demo: true })).resolves.toBe(false);
  });
});
