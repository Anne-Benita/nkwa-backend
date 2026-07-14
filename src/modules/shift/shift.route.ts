import { Router } from 'express';
import { shiftController } from './shift.controller';
import authMiddleware from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Shifts
 *   description: Shift session management
 */

/**
 * @swagger
 * /shifts/start:
 *   post:
 *     summary: Start a new working shift session
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Shift started successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 driverId:
 *                   type: string
 *                 startedAt:
 *                   type: string
 *                 status:
 *                   type: string
 *                 earningsTotal:
 *                   type: number
 *                 tipsTotal:
 *                   type: number
 *                 deliveriesCompleted:
 *                   type: integer
 *       409:
 *         description: Conflict (a shift is already active).
 *       401:
 *         description: Unauthorized.
 */
router.post('/start', authMiddleware, shiftController.start);

/**
 * @swagger
 * /shifts/{shiftId}/stop:
 *   post:
 *     summary: End/stop an active shift session
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the active shift session
 *     responses:
 *       200:
 *         description: Shift session ended. Aggregations calculated.
 *       404:
 *         description: Shift not found.
 *       401:
 *         description: Unauthorized.
 */
router.post('/:shiftId/stop', authMiddleware, shiftController.stop);

/**
 * @swagger
 * /shifts/current:
 *   get:
 *     summary: Retrieve current active shift details for the driver
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active shift session details returned (or null if offline).
 *       401:
 *         description: Unauthorized.
 */
router.get('/current', authMiddleware, shiftController.getCurrent);

/**
 * @swagger
 * /shifts/history:
 *   get:
 *     summary: Retrieve shift history log for the driver
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page limit
 *     responses:
 *       200:
 *         description: Paginated shift history array returned.
 *       401:
 *         description: Unauthorized.
 */
router.get('/history', authMiddleware, shiftController.getHistory);

/**
 * @swagger
 * /shifts/{shiftId}:
 *   get:
 *     summary: Retrieve single shift session details and orders completed
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the shift
 *     responses:
 *       200:
 *         description: Shift session details and completed orders list returned.
 *       404:
 *         description: Shift not found.
 *       401:
 *         description: Unauthorized.
 */
router.get('/:shiftId', authMiddleware, shiftController.getDetails);

export default router;
