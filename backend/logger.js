const requestLogger = (req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;

    // Log Request
    console.log(`\x1b[36m[${timestamp}] ➡️  ${method} ${url}\x1b[0m`);
    // console.log('Headers:', JSON.stringify(req.headers)); // Valid for debugging, but spammy
    if (Object.keys(req.body).length > 0) {
        // Redact mostly sensitive info minimally for debug ease
        const logBody = { ...req.body };
        if (logBody.password) logBody.password = '*****';
        console.log('\x1b[90mBody:\x1b[0m', JSON.stringify(logBody));
    }

    // Intercept Response to Log Status
    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - start;
        const status = res.statusCode;

        let color = '\x1b[32m'; // Green
        if (status >= 300) color = '\x1b[33m'; // Yellow
        if (status >= 400) color = '\x1b[31m'; // Red

        console.log(`${color}[${timestamp}] ⬅️  ${method} ${url} ${status} (${duration}ms)\x1b[0m`);

        // Log Response Body (Shortened) for Debugging
        // Be careful with large responses
        if (res.statusCode >= 400) {
            console.log('\x1b[31mError Response:\x1b[0m', body);
        }

        originalSend.call(this, body);
    };

    next();
};

module.exports = requestLogger;
