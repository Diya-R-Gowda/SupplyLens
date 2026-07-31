const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory mirror of RefreshToken, used only when Mongo isn't connected (demo mode).
const demoRefreshTokens = new Map(); // tokenHash -> { userId, expiresAt, revokedAt }

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (user) => jwt.sign(
  { id: String(user._id), orgId: String(user.orgId), role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: ACCESS_TOKEN_TTL }
);

const issueRefreshToken = async (user, { demo } = {}) => {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  if (demo) {
    demoRefreshTokens.set(tokenHash, { userId: String(user._id), expiresAt, revokedAt: null });
  } else {
    await RefreshToken.create({ user: user._id, tokenHash, expiresAt });
  }

  return rawToken;
};

const issueTokenPair = async (user, opts) => ({
  accessToken: signAccessToken(user),
  refreshToken: await issueRefreshToken(user, opts),
});

// Validates the refresh token and immediately invalidates it (rotation) so it
// can't be replayed. Returns the owning userId, or null if invalid/expired/revoked.
const consumeRefreshToken = async (rawToken, { demo } = {}) => {
  const tokenHash = hashToken(rawToken);

  if (demo) {
    const entry = demoRefreshTokens.get(tokenHash);
    if (!entry || entry.revokedAt || entry.expiresAt < new Date()) return null;
    entry.revokedAt = new Date();
    return String(entry.userId);
  }

  const record = await RefreshToken.findOne({ tokenHash });
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;
  record.revokedAt = new Date();
  await record.save();
  return String(record.user);
};

const revokeRefreshToken = async (rawToken, { demo } = {}) => {
  const tokenHash = hashToken(rawToken);

  if (demo) {
    const entry = demoRefreshTokens.get(tokenHash);
    if (!entry || entry.revokedAt) return false;
    entry.revokedAt = new Date();
    return true;
  }

  const result = await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() }
  );
  return result.modifiedCount > 0;
};

module.exports = {
  signAccessToken,
  issueTokenPair,
  consumeRefreshToken,
  revokeRefreshToken,
};
