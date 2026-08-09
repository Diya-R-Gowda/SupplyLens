const mongoose = require('mongoose');

// Each test file connects with its own logical database name on the shared
// MongoMemoryServer instance, so files never see each other's data even
// though they share one underlying mongod process.
const connect = async () => {
  const dbName = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await mongoose.connect(process.env.MONGO_URI_TEST, { dbName });
};

const clearDatabase = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

module.exports = { connect, clearDatabase, disconnect };
