"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.authController = {
    /**
     * Driver sign up (two-step onboarding form)
     */
    signup: async (req, res, next) => {
        try {
            const { email, password, fullName, workId, teamId, transportationType, vehicleNumber, } = req.body;
            // Basic input validations
            if (!email || typeof email !== 'string') {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Email is required and must be a string', 'email'));
            }
            if (!password || password.length < 6) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters long', 'password'));
            }
            if (!fullName || typeof fullName !== 'string') {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Full name is required and must be a string', 'fullName'));
            }
            if (!workId || typeof workId !== 'string') {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Work ID is required and must be a string', 'workId'));
            }
            if (!transportationType || !['BICYCLE', 'CAR', 'TRUCK'].includes(transportationType.toUpperCase())) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Transportation type must be BICYCLE, CAR, or TRUCK', 'transportationType'));
            }
            const result = await auth_service_1.authService.registerDriver({
                email,
                password,
                fullName,
                workId,
                teamId,
                transportationType: transportationType.toUpperCase(),
                vehicleNumber,
            });
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Driver login
     */
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Email and password are required fields'));
            }
            const result = await auth_service_1.authService.loginDriver(email, password);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Session refresh token exchange
     */
    refresh: async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Refresh token is required', 'refreshToken'));
            }
            const tokens = await auth_service_1.authService.refreshSession(refreshToken);
            res.status(200).json(tokens);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Session logout
     */
    logout: async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                await auth_service_1.authService.logoutSession(token);
            }
            // Return 200 regardless to prevent leaking information
            res.status(200).json({ message: 'Successfully logged out.' });
        }
        catch (err) {
            next(err);
        }
    }
};
exports.default = exports.authController;
