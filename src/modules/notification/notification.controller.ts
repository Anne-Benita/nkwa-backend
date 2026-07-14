import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { notificationService } from './notification.service';
import { AppError } from '../../middleware/error.middleware';

export const notificationController = {
  /**
   * Fetch driver notifications list
   */
  getNotifications: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const unreadOnly = req.query.unread === 'true';
      const notifications = await notificationService.getDriverNotifications(req.driver.id, unreadOnly);
      res.status(200).json(notifications);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Mark a notification as read
   */
  markRead: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const id = req.params.id as string;
      if (!id) {
        return next(new AppError(400, 'VALIDATION_ERROR', 'Notification ID parameter is required'));
      }

      const notification = await notificationService.markAsRead(req.driver.id, id);
      res.status(200).json(notification);
    } catch (err) {
      next(err);
    }
  }
};

export default notificationController;
