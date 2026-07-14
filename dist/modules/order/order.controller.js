"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderController = void 0;
const order_service_1 = require("./order.service");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.orderController = {
    /**
     * Fetch available/unassigned orders nearby
     */
    getAvailable: async (req, res, next) => {
        try {
            const orders = await order_service_1.orderService.getAvailableOrders();
            res.status(200).json(orders);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Claim/accept a pending order
     */
    accept: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const orderId = req.params.orderId;
            if (!orderId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Order ID parameter is required'));
            }
            const order = await order_service_1.orderService.acceptOrder(req.driver.id, orderId);
            // Emit status update to clients in this order's room
            const io = req.app.get('io');
            if (io) {
                io.to(`order:${orderId}`).emit('order_status', {
                    orderId,
                    status: 'picked_up',
                });
            }
            res.status(200).json(order);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Fetch driver's active delivery and the next queue order
     */
    getCurrent: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const orders = await order_service_1.orderService.getCurrentOrders(req.driver.id);
            res.status(200).json(orders);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Fetch details for a specific order
     */
    getDetails: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const orderId = req.params.orderId;
            if (!orderId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Order ID parameter is required'));
            }
            const order = await order_service_1.orderService.getOrderDetails(req.driver.id, orderId);
            res.status(200).json(order);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Update the status of an active order (and emit Socket.IO notification)
     */
    updateStatus: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const orderId = req.params.orderId;
            const { status } = req.body;
            if (!orderId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Order ID parameter is required'));
            }
            if (!status || !['PICKED_UP', 'EN_ROUTE', 'ARRIVED', 'DELIVERED', 'CANCELLED'].includes(status.toUpperCase())) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'status must be one of PICKED_UP, EN_ROUTE, ARRIVED, DELIVERED, or CANCELLED', 'status'));
            }
            const updatedOrder = await order_service_1.orderService.updateOrderStatus(req.driver.id, orderId, status);
            // Emit status update to Socket.IO clients in this order's room (e.g. the customer app)
            const io = req.app.get('io');
            if (io) {
                io.to(`order:${orderId}`).emit('order_status', {
                    orderId,
                    status: updatedOrder.status.toLowerCase(),
                });
            }
            res.status(200).json({
                id: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                status: updatedOrder.status.toLowerCase(),
                deliveredAt: updatedOrder.deliveredAt,
            });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Get maps tracking info (caches geocoding/ETA queries)
     */
    getTracking: async (req, res, next) => {
        try {
            const orderId = req.params.orderId;
            if (!orderId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Order ID parameter is required'));
            }
            const trackingInfo = await order_service_1.orderService.getOrderTracking(orderId);
            res.status(200).json(trackingInfo);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Fetch chat messages history for an order
     */
    getMessages: async (req, res, next) => {
        try {
            const orderId = req.params.orderId;
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '20', 10);
            if (!orderId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Order ID parameter is required'));
            }
            const messages = await order_service_1.orderService.getOrderMessages(orderId, page, limit);
            res.status(200).json(messages);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Send a new message inside an order's chat thread
     */
    sendMessage: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const orderId = req.params.orderId;
            const { body } = req.body;
            if (!orderId) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Order ID parameter is required'));
            }
            if (!body || typeof body !== 'string') {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Message body is required and must be a string', 'body'));
            }
            const message = await order_service_1.orderService.sendOrderMessage(orderId, 'DRIVER', req.driver.id, body);
            // Emit real-time Socket.IO notification to other users in this order's chat room
            const io = req.app.get('io');
            if (io) {
                io.to(`order:${orderId}`).emit('new_message', message);
            }
            res.status(201).json(message);
        }
        catch (err) {
            next(err);
        }
    }
};
exports.default = exports.orderController;
