require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db'); // Your Mongoose connection logic
const swaggerSpec = require('./config/swagger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const newsCron = require('./jobs/newsCron');
const snapshotCron = require('./jobs/snapshotCron');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/news', require('./routes/news'));
app.use('/api/rag', require('./routes/rag'));
app.use('/api/org', require('./routes/orgConfig'));
app.use('/api/org', require('./routes/orgAnalytics'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only actually connect/listen/schedule cron jobs when this file is run
// directly (node index.js / nodemon) - not when required as a module, which
// is how the Jest test suite imports `app` to drive it via supertest without
// touching the real Atlas cluster or starting background cron jobs.
if (require.main === module) {
	connectDB().finally(() => {
		app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
		newsCron.start();
		snapshotCron.start();
	});
}

module.exports = app;