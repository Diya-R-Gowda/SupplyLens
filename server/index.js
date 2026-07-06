const express = require('express');
const connectDB = require('./config/db'); // Your Mongoose connection logic
const app = express();

app.use(express.json());

// Routes
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/rag', require('./routes/rag'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));