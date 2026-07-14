"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("./notification.controller");
const auth_middleware_1 = __importDefault(require("../../middleware/auth.middleware"));
const router = (0, express_1.Router)();
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
router.get('/', auth_middleware_1.default, notification_controller_1.notificationController.getNotifications);
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
router.patch('/:id/read', auth_middleware_1.default, notification_controller_1.notificationController.markRead);
exports.default = router;
