"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const notification_service_1 = require("./notification.service");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.notificationController = {
    /**
     * Fetch driver notifications list
     */
    getNotifications: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const unreadOnly = req.query.unread === 'true';
            const notifications = await notification_service_1.notificationService.getDriverNotifications(req.driver.id, unreadOnly);
            res.status(200).json(notifications);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Mark a notification as read
     */
    markRead: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const id = req.params.id;
            if (!id) {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Notification ID parameter is required'));
            }
            const notification = await notification_service_1.notificationService.markAsRead(req.driver.id, id);
            res.status(200).json(notification);
        }
        catch (err) {
            next(err);
        }
    }
};
exports.default = exports.notificationController;
