const fs = require('fs');
const path = require('path');
const mongoInstance = require('./mongoInstance');

const uriFilePath = path.join(__dirname, '.mongo-uri');

module.exports = async () => {
  await mongoInstance.stop();
  if (fs.existsSync(uriFilePath)) fs.unlinkSync(uriFilePath);
};
