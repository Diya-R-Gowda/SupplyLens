require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db'); // Your Mongoose connection logic
const swaggerSpec = require('./config/swagger');
const corsOptions = require('./config/corsOptions');
const logger = require('./config/logger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimit');
const newsCron = require('./jobs/newsCron');
const snapshotCron = require('./jobs/snapshotCron');
const alertCron = require('./jobs/alertCron');
const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
// Structured method/path/status/duration request logging, with a
// per-request id (req.log inside any handler is this same child logger, so
// a handler's own log lines correlate back to the request that caused
// them). Silenced under Jest (NODE_ENV=test) - 41+ test requests logging on
// every run would just be noise in CI output.
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== 'test' }));

// Mounted before the rate limiter and before Swagger/routes - a load
// balancer or uptime monitor hitting this frequently shouldn't ever be
// able to trip the general API rate limit.
app.use('/api', require('./routes/health'));

app.use(generalLimiter);

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
		app.listen(PORT, () => logger.info({ port: PORT }, 'Server running'));
		newsCron.start();
		snapshotCron.start();
		alertCron.start();
	});
}

module.exports = app;