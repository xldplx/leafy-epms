/**
 * logger.js — Structured JSON logging middleware
 * Logs every request as JSON with requestId, route, user, duration, status.
 */

const { randomUUID } = require('crypto');

// ── JSON Logger ───────────────────────────────────────────────────────────────
const log = (level, message, meta = {}) => {
    const entry = {
        timestamp:  new Date().toISOString(),
        level,
        message,
        ...meta,
    };
    // In production pipe this to a log aggregator (Datadog, Papertrail, etc.)
    process.stdout.write(JSON.stringify(entry) + '\n');
};

const logger = {
    info:  (msg, meta) => log('INFO',  msg, meta),
    warn:  (msg, meta) => log('WARN',  msg, meta),
    error: (msg, meta) => log('ERROR', msg, meta),
    debug: (msg, meta) => { if (process.env.NODE_ENV !== 'production') log('DEBUG', msg, meta); },
};

// ── Request Logger Middleware ─────────────────────────────────────────────────
const requestLogger = (req, res, next) => {
    // Attach unique request ID
    req.requestId = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', req.requestId);

    const startAt = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startAt;
        const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';

        log(level, 'HTTP Request', {
            requestId:  req.requestId,
            method:     req.method,
            route:      req.originalUrl,
            status:     res.statusCode,
            duration_ms: duration,
            user:       req.user?.username || 'anonymous',
            ip:         req.ip || req.headers['x-forwarded-for'] || '-',
            userAgent:  req.headers['user-agent'] || '-',
        });
    });

    next();
};

module.exports = { logger, requestLogger };