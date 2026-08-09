// A module-level singleton so globalSetup.js and globalTeardown.js - both
// run by Jest in the same long-lived orchestrator process, unlike test
// files themselves which run in separate worker processes - can share one
// MongoMemoryServer reference to start it once and stop it once.
let instance = null;

const start = async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  instance = await MongoMemoryServer.create();
  return instance;
};

const stop = async () => {
  if (instance) {
    await instance.stop();
    instance = null;
  }
};

module.exports = { start, stop };
