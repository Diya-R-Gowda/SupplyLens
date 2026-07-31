const multer = require('multer');
const mongoose = require('mongoose');

const storage = multer.memoryStorage(); // Store in memory to process immediately
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (mongoose.connection.readyState !== 1) cb(null, true);
    else if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDFs are allowed'));
  }
});

module.exports = upload;