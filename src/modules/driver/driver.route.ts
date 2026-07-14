import { Router } from 'express';
import { driverController } from './driver.controller';
import authMiddleware from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Drivers
 *   description: Driver profile management
 */

/**
 * @swagger
 * /drivers/me:
 *   get:
 *     summary: Retrieve current authenticated driver profile
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 workId:
 *                   type: string
 *                 fullName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 team:
 *                   type: string
 *                 level:
 *                   type: integer
 *                 ratePercent:
 *                   type: number
 *                 transportationType:
 *                   type: string
 *                 vehicleNumber:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *                 status:
 *                   type: string
 *       401:
 *         description: Unauthorized.
 */
router.get('/me', authMiddleware, driverController.getMe);

/**
 * @swagger
 * /drivers/me:
 *   patch:
 *     summary: Update driver profile details (fullName, avatarUrl)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Tyler Teeler
 *               avatarUrl:
 *                 type: string
 *                 example: https://myimages.com/avatar.jpg
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       401:
 *         description: Unauthorized.
 */
router.patch('/me', authMiddleware, driverController.updateMe);

/**
 * @swagger
 * /drivers/me/vehicle:
 *   patch:
 *     summary: Update driver vehicle transportation details
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transportationType
 *             properties:
 *               transportationType:
 *                 type: string
 *                 enum: [BICYCLE, CAR, TRUCK]
 *                 example: BICYCLE
 *               vehicleNumber:
 *                 type: string
 *                 example: RE 345 6
 *     responses:
 *       200:
 *         description: Vehicle details updated successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 */
router.patch('/me/vehicle', authMiddleware, driverController.updateVehicle);

export default router;
