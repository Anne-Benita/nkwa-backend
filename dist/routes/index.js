"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = __importDefault(require("../modules/auth/auth.route"));
const driver_route_1 = __importDefault(require("../modules/driver/driver.route"));
const shift_route_1 = __importDefault(require("../modules/shift/shift.route"));
const order_route_1 = __importDefault(require("../modules/order/order.route"));
const wallet_route_1 = __importDefault(require("../modules/wallet/wallet.route"));
const notification_route_1 = __importDefault(require("../modules/notification/notification.route"));
const driver_controller_1 = __importDefault(require("../modules/driver/driver.controller"));
const router = (0, express_1.Router)();
router.use('/auth', auth_route_1.default);
router.use('/drivers', driver_route_1.default);
router.use('/shifts', shift_route_1.default);
router.use('/orders', order_route_1.default);
router.use('/wallet', wallet_route_1.default);
router.use('/notifications', notification_route_1.default);
/**
 * @swagger
 * /teams:
 *   get:
 *     summary: List all teams for onboarding signup selection
 *     tags: [Drivers]
 *     responses:
 *       200:
 *         description: List of teams retrieved successfully.
 */
router.get('/teams', driver_controller_1.default.getTeams);
/**
 * @swagger
 * /config/vehicle-types:
 *   get:
 *     summary: List supported transportation types
 *     tags: [Drivers]
 *     responses:
 *       200:
 *         description: Supported vehicle types retrieved successfully.
 */
router.get('/config/vehicle-types', driver_controller_1.default.getVehicleTypes);
exports.default = router;
