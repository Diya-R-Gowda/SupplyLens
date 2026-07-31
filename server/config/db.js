const mongoose = require('mongoose');

const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI;

	if (!mongoUri) {
		console.warn('MONGO_URI is not set. Running in demo mode without MongoDB.');
		return null;
	}

	try {
		const conn = await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 5000,
		});

		console.log(`MongoDB connected: ${conn.connection.host}`);
		return conn;
	} catch (error) {
		console.warn(`MongoDB connection failed, running in demo mode: ${error.message}`);
		return null;
	}
};

module.exports = connectDB;
