import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { driverService } from './driver.service';
import { AppError } from '../../middleware/error.middleware';

export const driverController = {
  /**
   * Fetch authenticated driver profile
   */
  getMe: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const profile = await driverService.getDriverProfile(req.driver.id);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update driver profile details
   */
  updateMe: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const { fullName, avatarUrl } = req.body;
      const updatedProfile = await driverService.updateDriverProfile(req.driver.id, {
        fullName,
        avatarUrl,
      });

      res.status(200).json(updatedProfile);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update transportation vehicle information
   */
  updateVehicle: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const { transportationType, vehicleNumber } = req.body;

      if (!transportationType || !['BICYCLE', 'CAR', 'TRUCK'].includes(transportationType.toUpperCase())) {
        return next(
          new AppError(
            400,
            'VALIDATION_ERROR',
            'transportationType is required and must be BICYCLE, CAR, or TRUCK',
            'transportationType'
          )
        );
      }

      const updatedProfile = await driverService.updateDriverVehicle(req.driver.id, {
        transportationType: transportationType.toUpperCase() as 'BICYCLE' | 'CAR' | 'TRUCK',
        vehicleNumber,
      });

      res.status(200).json(updatedProfile);
    } catch (err) {
      next(err);
    }
  },

  /**
   * List available teams
   */
  getTeams: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const teams = await driverService.listTeams();
      res.status(200).json(teams);
    } catch (err) {
      next(err);
    }
  },

  /**
   * List supported vehicle types
   */
  getVehicleTypes: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const types = await driverService.getVehicleTypes();
      res.status(200).json(types);
    } catch (err) {
      next(err);
    }
  }
};

export default driverController;
