require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Your Mongoose connection logic
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/news', require('./routes/news'));
app.use('/api/rag', require('./routes/rag'));

const PORT = process.env.PORT || 5000;

connectDB().finally(() => {
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});