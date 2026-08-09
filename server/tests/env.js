// Jest `setupFiles` entry - runs once per test FILE, before the test
// framework itself loads, in whichever worker process that file runs in.
// Reads the URI globalSetup.js wrote to disk (a file, not process.env,
// since env vars set in the main orchestrator process aren't reliably
// inherited by worker processes across Jest versions/platforms - a file is
// unambiguous) and a fixed test JWT secret so tokens signed/verified within
// a test run are self-consistent without touching real .env secrets.
const fs = require('fs');
const path = require('path');

process.env.JWT_SECRET = 'test-only-jwt-secret-never-used-outside-jest';
process.env.MONGO_URI_TEST = fs.readFileSync(path.join(__dirname, '.mongo-uri'), 'utf8').trim();
