// One-off admin script: recreates the Atlas Vector Search index on the
// collection the app actually uses.
//
// Audit finding (Phase 2): a real, READY vector index named "default" existed
// on the `doc_chunks` collection (path: embedding, 768 dims, cosine,
// supplierId filter) - but the DocChunk Mongoose model writes to `docchunks`,
// a different, empty collection with zero search indexes. Atlas Search
// indexes are strictly per-collection, so the app could never see it.
//
// This script creates the same index definition on `docchunks`, waits for it
// to become READY and queryable, then drops the orphaned one on `doc_chunks`.
// Idempotent: safe to re-run - it skips creation if the index already exists.
//
// Usage: node scripts/setupVectorSearchIndex.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const INDEX_NAME = 'default';
const TARGET_COLLECTION = 'docchunks';
const LEGACY_COLLECTION = 'doc_chunks';

const INDEX_DEFINITION = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: 768, similarity: 'cosine' },
    { type: 'filter', path: 'supplierId' },
  ],
};

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findIndex = (indexes, name) => indexes.find((i) => i.name === name);

const waitUntilReady = async (collection, name) => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const indexes = await collection.listSearchIndexes().toArray();
    const index = findIndex(indexes, name);
    if (index && index.status === 'READY' && index.queryable) {
      return index;
    }
    console.log(`  ...waiting (status=${index?.status || 'not found yet'})`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for index "${name}" to become READY on ${collection.collectionName}`);
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log('Connected to', mongoose.connection.host);

  const targetCollection = db.collection(TARGET_COLLECTION);
  const legacyCollection = db.collection(LEGACY_COLLECTION);

  console.log(`\nChecking existing search indexes on "${TARGET_COLLECTION}"...`);
  const existingOnTarget = await targetCollection.listSearchIndexes().toArray();
  console.log(JSON.stringify(existingOnTarget, null, 2));

  if (findIndex(existingOnTarget, INDEX_NAME)) {
    console.log(`Index "${INDEX_NAME}" already exists on "${TARGET_COLLECTION}" - skipping creation.`);
  } else {
    console.log(`\nCreating "${INDEX_NAME}" vector search index on "${TARGET_COLLECTION}"...`);
    await targetCollection.createSearchIndex({
      name: INDEX_NAME,
      type: 'vectorSearch',
      definition: INDEX_DEFINITION,
    });
    console.log('Create request submitted. Polling for READY + queryable...');
  }

  const readyIndex = await waitUntilReady(targetCollection, INDEX_NAME);
  console.log(`\n"${INDEX_NAME}" on "${TARGET_COLLECTION}" is READY and queryable:`);
  console.log(JSON.stringify(readyIndex, null, 2));

  console.log(`\nChecking legacy index on "${LEGACY_COLLECTION}"...`);
  const existingOnLegacy = await legacyCollection.listSearchIndexes().toArray();
  const legacyIndex = findIndex(existingOnLegacy, INDEX_NAME);

  if (legacyIndex) {
    console.log(`Dropping orphaned "${INDEX_NAME}" index on "${LEGACY_COLLECTION}"...`);
    await legacyCollection.dropSearchIndex(INDEX_NAME);
    console.log('Drop request submitted.');
  } else {
    console.log(`No "${INDEX_NAME}" index found on "${LEGACY_COLLECTION}" - nothing to drop.`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
