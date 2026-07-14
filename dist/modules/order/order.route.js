"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("./order.controller");
const auth_middleware_1 = __importDefault(require("../../middleware/auth.middleware"));
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order queuing, delivery fulfillment, and live tracking
 */
/**
 * @swagger
 * /orders/current:
 *   get:
 *     summary: Retrieve driver's active delivery and next queued order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active and next order details returned.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 current:
 *                   type: object
 *                   nullable: true
 *                 next:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: Unauthorized.
 */
router.get('/current', auth_middleware_1.default, order_controller_1.orderController.getCurrent);
/**
 * @swagger
 * /orders/available:
 *   get:
 *     summary: List all unclaimed pending orders nearby
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of pending orders returned.
 *       401:
 *         description: Unauthorized.
 */
router.get('/available', auth_middleware_1.default, order_controller_1.orderController.getAvailable);
/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     summary: Retrieve specific order details (pickup, destination, items)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the order
 *     responses:
 *       200:
 *         description: Order details returned.
 *       404:
 *         description: Order not found.
 *       401:
 *         description: Unauthorized.
 */
router.get('/:orderId', auth_middleware_1.default, order_controller_1.orderController.getDetails);
/**
 * @swagger
 * /orders/{orderId}/accept:
 *   post:
 *     summary: Claim/accept a pending order (advances status to picked_up)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the order
 *     responses:
 *       200:
 *         description: Order claimed successfully.
 *       400:
 *         description: Bad request (must be on shift).
 *       409:
 *         description: Order already claimed.
 *       401:
 *         description: Unauthorized.
 */
router.post('/:orderId/accept', auth_middleware_1.default, order_controller_1.orderController.accept);
/**
 * @swagger
 * /orders/{orderId}/status:
 *   patch:
 *     summary: Advance order delivery status (picked_up -> en_route -> arrived -> delivered)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PICKED_UP, EN_ROUTE, ARRIVED, DELIVERED, CANCELLED]
 *                 example: ARRIVED
 *     responses:
 *       200:
 *         description: Status updated. Emits Socket event. Logs transaction if DELIVERED.
 *       400:
 *         description: Validation error.
 *       404:
 *         description: Order not found.
 *       401:
 *         description: Unauthorized.
 */
router.patch('/:orderId/status', auth_middleware_1.default, order_controller_1.orderController.updateStatus);
/**
 * @swagger
 * /orders/{orderId}/tracking:
 *   get:
 *     summary: Get live tracking details (ETA, distance left, route polyline)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the order
 *     responses:
 *       200:
 *         description: Tracking details returned (cached for 30s to avoid external maps API spam).
 *       404:
 *         description: Order not found.
 *       401:
 *         description: Unauthorized.
 */
router.get('/:orderId/tracking', auth_middleware_1.default, order_controller_1.orderController.getTracking);
/**
 * @swagger
 * /orders/{orderId}/messages:
 *   get:
 *     summary: Fetch message history for an order's chat thread
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the order
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
 *           default: 20
 *         description: Number of messages to retrieve
 *     responses:
 *       200:
 *         description: Message history list returned.
 *       401:
 *         description: Unauthorized.
 */
router.get('/:orderId/messages', auth_middleware_1.default, order_controller_1.orderController.getMessages);
/**
 * @swagger
 * /orders/{orderId}/messages:
 *   post:
 *     summary: Send a message to the customer inside the order chat thread
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *                 example: Thanks for reaching out! I am at the door now.
 *     responses:
 *       201:
 *         description: Message successfully sent. Broadcasted via Socket.IO.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 */
router.post('/:orderId/messages', auth_middleware_1.default, order_controller_1.orderController.sendMessage);
exports.default = router;
