"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../config/prisma");
const env_1 = require("../../config/env");
const error_middleware_1 = require("../../middleware/error.middleware");
const cache_service_1 = require("../../services/cache.service");
exports.authService = {
    /**
     * Register a new courier driver
     */
    registerDriver: async (data) => {
        // Check if email or work ID already exists
        const existingEmail = await prisma_1.prisma.driver.findUnique({ where: { email: data.email } });
        if (existingEmail) {
            throw new error_middleware_1.AppError(409, 'CONFLICT', 'Email is already registered', 'email');
        }
        const existingWorkId = await prisma_1.prisma.driver.findUnique({ where: { workId: data.workId } });
        if (existingWorkId) {
            throw new error_middleware_1.AppError(409, 'CONFLICT', 'Work ID is already registered', 'workId');
        }
        // Check if team exists if provided
        if (data.teamId) {
            const team = await prisma_1.prisma.team.findUnique({ where: { id: data.teamId } });
            if (!team) {
                throw new error_middleware_1.AppError(404, 'NOT_FOUND', 'The specified team does not exist', 'teamId');
            }
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
        // Create the driver profile
        const driver = await prisma_1.prisma.driver.create({
            data: {
                email: data.email,
                passwordHash,
                fullName: data.fullName,
                workId: data.workId,
                teamId: data.teamId || null,
                transportationType: data.transportationType,
                vehicleNumber: data.vehicleNumber || null,
            },
            include: {
                team: true,
            },
        });
        // Generate credentials tokens
        const tokens = await exports.authService.generateAndStoreTokens(driver.id, driver.email, driver.workId);
        return {
            driver: {
                id: driver.id,
                fullName: driver.fullName,
                email: driver.email,
                workId: driver.workId,
                level: driver.level,
                currentRate: driver.ratePercent,
                transportationType: driver.transportationType,
                vehicleNumber: driver.vehicleNumber,
                team: driver.team ? driver.team.name : null,
            },
            ...tokens,
        };
    },
    /**
     * Login driver
     */
    loginDriver: async (email, password) => {
        const driver = await prisma_1.prisma.driver.findUnique({
            where: { email },
            include: { team: true },
        });
        if (!driver) {
            throw new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Invalid email or password credentials');
        }
        if (driver.status === 'SUSPENDED') {
            throw new error_middleware_1.AppError(403, 'FORBIDDEN', 'This driver account has been suspended. Please contact support.');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, driver.passwordHash);
        if (!isPasswordValid) {
            throw new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Invalid email or password credentials');
        }
        // Generate credentials tokens
        const tokens = await exports.authService.generateAndStoreTokens(driver.id, driver.email, driver.workId);
        return {
            driver: {
                id: driver.id,
                fullName: driver.fullName,
                email: driver.email,
                workId: driver.workId,
                level: driver.level,
                currentRate: driver.ratePercent,
                transportationType: driver.transportationType,
                vehicleNumber: driver.vehicleNumber,
                team: driver.team ? driver.team.name : null,
            },
            ...tokens,
        };
    },
    /**
     * Exchange refresh token for a new access token
     */
    refreshSession: async (refreshToken) => {
        try {
            // 1. Verify token structure and expiration
            const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.ENV.JWT_REFRESH_SECRET);
            // 2. Check if the refresh token matches what is in cache (protects against replay attacks)
            const cachedTokenKey = `refreshToken:${decoded.id}`;
            const savedToken = await cache_service_1.cacheService.get(cachedTokenKey);
            if (!savedToken || savedToken !== refreshToken) {
                throw new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Refresh token is invalid or has been revoked');
            }
            // 3. Generate new tokens
            const tokens = await exports.authService.generateAndStoreTokens(decoded.id, decoded.email, decoded.workId);
            return tokens;
        }
        catch (err) {
            if (err instanceof error_middleware_1.AppError)
                throw err;
            throw new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'Refresh token has expired or is invalid');
        }
    },
    /**
     * Log out and revoke refresh token
     */
    logoutSession: async (accessToken) => {
        try {
            // Decode access token to find the driver id (ignoring expiration so they can logout even if expired)
            const decoded = jsonwebtoken_1.default.decode(accessToken);
            if (decoded && decoded.id) {
                const cachedTokenKey = `refreshToken:${decoded.id}`;
                await cache_service_1.cacheService.del(cachedTokenKey);
                return true;
            }
            return false;
        }
        catch (err) {
            return false;
        }
    },
    /**
     * Helper to generate and cache tokens
     */
    generateAndStoreTokens: async (driverId, email, workId) => {
        const payload = { id: driverId, email, workId };
        const accessToken = jsonwebtoken_1.default.sign(payload, env_1.ENV.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken_1.default.sign(payload, env_1.ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        // Store refresh token in cache for 7 days (604800 seconds)
        const cachedTokenKey = `refreshToken:${driverId}`;
        await cache_service_1.cacheService.set(cachedTokenKey, refreshToken, 604800);
        return { accessToken, refreshToken };
    }
};
exports.default = exports.authService;
