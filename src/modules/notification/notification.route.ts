import { Router } from 'express';
import { notificationController } from './notification.controller';
import authMiddleware from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Driver notification inbox and push updates
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Retrieve notifications list for the current driver
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, only retrieve unread notifications
 *     responses:
 *       200:
 *         description: List of notifications returned.
 *       401:
 *         description: Unauthorized.
 */
router.get('/', authMiddleware, notificationController.getNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a driver notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the notification
 *     responses:
 *       200:
 *         description: Notification marked as read successfully.
 *       404:
 *         description: Notification not found.
 *       401:
 *         description: Unauthorized.
 */
router.patch('/:id/read', authMiddleware, notificationController.markRead);

export default router;
