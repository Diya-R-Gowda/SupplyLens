const fs = require('fs');
const path = require('path');
const mongoInstance = require('./mongoInstance');

const uriFilePath = path.join(__dirname, '.mongo-uri');

// Runs once, in Jest's main orchestrator process, before any test file. A
// single MongoMemoryServer is shared across every test file (each file gets
// its own logical database name - see tests/db.js) rather than one server
// per file, since spinning up a real mongod binary per file would be far
// slower for no isolation benefit.
module.exports = async () => {
  const mongod = await mongoInstance.start();
  fs.writeFileSync(uriFilePath, mongod.getUri(), 'utf8');
};
