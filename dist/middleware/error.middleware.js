"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    field;
    constructor(statusCode, code, message, field) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.field = field;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
const errorMiddleware = (err, req, res, next) => {
    // Set default values
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_SERVER_ERROR';
    let message = err.message || 'An unexpected error occurred on the server.';
    let field = err.field;
    // Log server errors (500s) for debugging
    if (statusCode === 500) {
        console.error('[ErrorMiddleware] Unhandled Server Exception:', err);
    }
    // Handle Prisma connection or query errors
    if (err.code && err.code.startsWith('P')) {
        statusCode = 400;
        code = 'DATABASE_ERROR';
        message = 'A database operation failed.';
        // Prisma unique constraint violation (e.g. duplicate email/workId)
        if (err.code === 'P2002') {
            statusCode = 409;
            code = 'CONFLICT';
            const targetFields = err.meta?.target;
            field = targetFields ? targetFields.join(', ') : undefined;
            message = `A record with this ${field || 'value'} already exists.`;
        }
    }
    res.status(statusCode).json({
        error: {
            code,
            message,
            ...(field && { field }),
        },
    });
};
exports.errorMiddleware = errorMiddleware;
exports.default = exports.errorMiddleware;
