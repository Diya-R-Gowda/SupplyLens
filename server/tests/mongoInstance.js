// A module-level singleton so globalSetup.js and globalTeardown.js - both
// run by Jest in the same long-lived orchestrator process, unlike test
// files themselves which run in separate worker processes - can share one
// MongoMemoryServer reference to start it once and stop it once.
let instance = null;

const start = async () => {
  // A single-node replica set, not a standalone MongoMemoryServer - real
  // MongoDB transactions (session.withTransaction, used by the
  // role-management route to make its admin-count check and role update
  // atomic against a concurrent request) only work against a replica set,
  // even a one-node one. A standalone mongod rejects `startSession()`
  // transactions outright.
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  instance = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  return instance;
};

const stop = async () => {
  if (instance) {
    await instance.stop();
    instance = null;
  }
};

module.exports = { start, stop };
