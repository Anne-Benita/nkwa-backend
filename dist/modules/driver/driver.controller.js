"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driverController = void 0;
const driver_service_1 = require("./driver.service");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.driverController = {
    /**
     * Fetch authenticated driver profile
     */
    getMe: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const profile = await driver_service_1.driverService.getDriverProfile(req.driver.id);
            res.status(200).json(profile);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Update driver profile details
     */
    updateMe: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const { fullName, avatarUrl } = req.body;
            const updatedProfile = await driver_service_1.driverService.updateDriverProfile(req.driver.id, {
                fullName,
                avatarUrl,
            });
            res.status(200).json(updatedProfile);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Update transportation vehicle information
     */
    updateVehicle: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const { transportationType, vehicleNumber } = req.body;
            if (!transportationType || !['BICYCLE', 'CAR', 'TRUCK'].includes(transportationType.toUpperCase())) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'transportationType is required and must be BICYCLE, CAR, or TRUCK', 'transportationType'));
            }
            const updatedProfile = await driver_service_1.driverService.updateDriverVehicle(req.driver.id, {
                transportationType: transportationType.toUpperCase(),
                vehicleNumber,
            });
            res.status(200).json(updatedProfile);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * List available teams
     */
    getTeams: async (req, res, next) => {
        try {
            const teams = await driver_service_1.driverService.listTeams();
            res.status(200).json(teams);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * List supported vehicle types
     */
    getVehicleTypes: async (req, res, next) => {
        try {
            const types = await driver_service_1.driverService.getVehicleTypes();
            res.status(200).json(types);
        }
        catch (err) {
            next(err);
        }
    }
};
exports.default = exports.driverController;
