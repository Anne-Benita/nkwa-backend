"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const error_middleware_1 = require("./error.middleware");
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Authorization header is missing or does not contain a Bearer token.'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
        req.driver = decoded;
        next();
    }
    catch (err) {
        let message = 'Invalid or expired access token.';
        if (err.name === 'TokenExpiredError') {
            message = 'Access token has expired. Please refresh your session.';
        }
        return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', message));
    }
};
exports.authMiddleware = authMiddleware;
exports.default = exports.authMiddleware;
