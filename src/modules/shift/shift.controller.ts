import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { shiftService } from './shift.service';
import { AppError } from '../../middleware/error.middleware';

export const shiftController = {
  /**
   * Start a new shift
   */
  start: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const shift = await shiftService.startShift(req.driver.id);
      res.status(201).json(shift);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Stop an active shift
   */
  stop: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const shiftId = req.params.shiftId as string;
      if (!shiftId) {
        return next(new AppError(400, 'VALIDATION_ERROR', 'Shift ID parameter is required'));
      }

      const shift = await shiftService.stopShift(req.driver.id, shiftId);
      res.status(200).json(shift);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get driver's active shift
   */
  getCurrent: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const shift = await shiftService.getCurrentShift(req.driver.id);
      res.status(200).json(shift);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get shift history
   */
  getHistory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);

      const shifts = await shiftService.getShiftHistory(req.driver.id, page, limit);
      res.status(200).json(shifts);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single shift details
   */
  getDetails: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const shiftId = req.params.shiftId as string;
      if (!shiftId) {
        return next(new AppError(400, 'VALIDATION_ERROR', 'Shift ID parameter is required'));
      }

      const shift = await shiftService.getShiftDetails(req.driver.id, shiftId);
      res.status(200).json(shift);
    } catch (err) {
      next(err);
    }
  }
};

export default shiftController;
