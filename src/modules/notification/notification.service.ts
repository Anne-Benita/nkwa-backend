import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';

export const notificationService = {
  /**
   * Get notifications for a driver
   */
  getDriverNotifications: async (driverId: string, unreadOnly: boolean = false) => {
    return prisma.notification.findMany({
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
  markAsRead: async (driverId: string, notificationId: string) => {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', 'Notification not found');
    }

    if (notification.driverId !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this notification.');
    }

    if (notification.readAt) {
      return notification;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }
};

export default notificationService;
