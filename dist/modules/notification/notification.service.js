"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const prisma_1 = require("../../config/prisma");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.notificationService = {
    /**
     * Get notifications for a driver
     */
    getDriverNotifications: async (driverId, unreadOnly = false) => {
        return prisma_1.prisma.notification.findMany({
            where: {
                driverId,
                ...(unreadOnly ? { readAt: null } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
    },
    /**
     * Mark a specific notification as read
     */
    markAsRead: async (driverId, notificationId) => {
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new error_middleware_1.AppError(404, 'NOT_FOUND', 'Notification not found');
        }
        if (notification.driverId !== driverId) {
            throw new error_middleware_1.AppError(403, 'FORBIDDEN', 'You do not have permission to modify this notification.');
        }
        if (notification.readAt) {
            return notification;
        }
        return prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: { readAt: new Date() },
        });
    }
};
exports.default = exports.notificationService;
