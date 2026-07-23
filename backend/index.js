const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware');
const routes = require('./routes/index');
const { initCronJobs } = require('./utils');

const requestLogger = require('./logger');

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();

// --- Rate Limiting ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 minutes (Better for dev/bursts)
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

// --- Middleware ---
app.use(express.json({ limit: '10kb' })); // Body parser limited to 10kb

// Allow all origins for mobile dev usage
app.use(cors());

app.use(requestLogger); // Add Custom Logger

app.use(helmet()); // Set Security HTTP headers
app.use(mongoSanitize()); // Data sanitization against NoSQL query injection
app.use(xss()); // Data sanitization against XSS
app.use(hpp()); // Prevent HTTP Parameter Pollution

// app.use(morgan('dev')); // Using custom logger instead
app.use(require('compression')()); // Compression for performance
app.disable('x-powered-by'); // Hide Express

// Apply rate limiting to all requests
app.use('/api', limiter);


// --- Database Connection ---
mongoose.connect(config.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected Successfully');
        // Initialize Cron Jobs after DB connection
        initCronJobs();
    })
    .catch((err) => {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    });

// --- Routes ---
app.get('/', (req, res) => {
    res.send('Finance Tracker API is running...');
});

app.use('/api', routes);

// --- Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- Server Start ---
const PORT = config.PORT || 5000;
const server = app.listen(PORT, () => {
    // console.clear();
    console.log('\x1b[36m%s\x1b[0m', '_______________________________________________________________');
    console.log('\x1b[36m%s\x1b[0m', '|                                                             |');
    console.log('\x1b[36m%s\x1b[0m', '|              FINANCE TRACKER API - PREMIUM                  |');
    console.log('\x1b[36m%s\x1b[0m', '|_____________________________________________________________|');
    console.log('');
    console.log(` 🚀 Server Status:   \x1b[32mONLINE\x1b[0m`);
    console.log(` 🔧 Environment:     \x1b[33m${config.NODE_ENV}\x1b[0m`);
    console.log(` 📡 Port:            \x1b[35m${PORT}\x1b[0m`);
    console.log(` 🔗 Local URL:       \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
    console.log(` 📂 Database:        \x1b[32mConnected\x1b[0m`);
    console.log('_______________________________________________________________\n');
});

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = app;

