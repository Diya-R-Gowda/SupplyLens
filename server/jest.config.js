module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/env.js'],
  globalSetup: './tests/globalSetup.js',
  globalTeardown: './tests/globalTeardown.js',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  // Every test file connects to the same MongoMemoryServer instance (started
  // once in globalSetup) and each test clears the shared collections before
  // it runs - concurrent files hitting that instance in parallel workers
  // would corrupt each other's data. Serial execution is the right trade for
  // this suite's size (critical-path coverage, not an exhaustive suite where
  // parallelism would matter).
  maxWorkers: 1,
};
