const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI;

	if (!mongoUri) {
		logger.warn('MONGO_URI is not set. Running in demo mode without MongoDB.');
		return null;
	}

	try {
		const conn = await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 5000,
		});

		logger.info({ host: conn.connection.host }, 'MongoDB connected');
		return conn;
	} catch (error) {
		logger.warn({ err: error }, 'MongoDB connection failed, running in demo mode');
		return null;
	}
};

module.exports = connectDB;
