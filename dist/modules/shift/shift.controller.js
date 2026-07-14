"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiftController = void 0;
const shift_service_1 = require("./shift.service");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.shiftController = {
    /**
     * Start a new shift
     */
    start: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const shift = await shift_service_1.shiftService.startShift(req.driver.id);
            res.status(201).json(shift);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Stop an active shift
     */
    stop: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const shiftId = req.params.shiftId;
            if (!shiftId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Shift ID parameter is required'));
            }
            const shift = await shift_service_1.shiftService.stopShift(req.driver.id, shiftId);
            res.status(200).json(shift);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Get driver's active shift
     */
    getCurrent: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const shift = await shift_service_1.shiftService.getCurrentShift(req.driver.id);
            res.status(200).json(shift);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Get shift history
     */
    getHistory: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '10', 10);
            const shifts = await shift_service_1.shiftService.getShiftHistory(req.driver.id, page, limit);
            res.status(200).json(shifts);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Get single shift details
     */
    getDetails: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const shiftId = req.params.shiftId;
            if (!shiftId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Shift ID parameter is required'));
            }
            const shift = await shift_service_1.shiftService.getShiftDetails(req.driver.id, shiftId);
            res.status(200).json(shift);
        }
        catch (err) {
            next(err);
        }
    }
};
exports.default = exports.shiftController;
