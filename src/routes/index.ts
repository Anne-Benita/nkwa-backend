import { Router } from 'express';
import authRouter from '../modules/auth/auth.route';
import driverRouter from '../modules/driver/driver.route';
import shiftRouter from '../modules/shift/shift.route';
import orderRouter from '../modules/order/order.route';
import walletRouter from '../modules/wallet/wallet.route';
import notificationRouter from '../modules/notification/notification.route';
import driverController from '../modules/driver/driver.controller';

const router = Router();

router.use('/auth', authRouter);
router.use('/drivers', driverRouter);
router.use('/shifts', shiftRouter);
router.use('/orders', orderRouter);
router.use('/wallet', walletRouter);
router.use('/notifications', notificationRouter);

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
router.get('/teams', driverController.getTeams);

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
router.get('/config/vehicle-types', driverController.getVehicleTypes);

export default router;
