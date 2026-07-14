import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { cacheService } from '../../services/cache.service';
import { TransportationType } from '@prisma/client';

export const driverService = {
  /**
   * Get driver profile details (caches the summary)
   */
  getDriverProfile: async (driverId: string) => {
    const cacheKey = `driver:${driverId}:summary`;

    // Try to get from cache first
    const cachedProfile = await cacheService.get<any>(cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }

    // Get from database
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { team: true },
    });

    if (!driver) {
      throw new AppError(404, 'NOT_FOUND', 'Driver profile not found');
    }

    const profile = {
      id: driver.id,
      workId: driver.workId,
      fullName: driver.fullName,
      email: driver.email,
      team: driver.team ? driver.team.name : null,
      level: driver.level,
      ratePercent: driver.ratePercent,
      transportationType: driver.transportationType.toLowerCase(),
      vehicleNumber: driver.vehicleNumber,
      avatarUrl: driver.avatarUrl,
      status: driver.status.toLowerCase(),
    };

    // Cache the driver summary profile details for 60 seconds (TTL: 60s)
    await cacheService.set(cacheKey, profile, 60);

    return profile;
  },

  /**
   * Update editable profile fields
   */
  updateDriverProfile: async (
    driverId: string,
    data: { fullName?: string; avatarUrl?: string }
  ) => {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new AppError(404, 'NOT_FOUND', 'Driver profile not found');
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        fullName: data.fullName !== undefined ? data.fullName : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
      },
      include: { team: true },
    });

    // Invalidate cached driver summary (on profile update)
    const cacheKey = `driver:${driverId}:summary`;
    await cacheService.del(cacheKey);

    return {
      id: updatedDriver.id,
      workId: updatedDriver.workId,
      fullName: updatedDriver.fullName,
      email: updatedDriver.email,
      team: updatedDriver.team ? updatedDriver.team.name : null,
      level: updatedDriver.level,
      ratePercent: updatedDriver.ratePercent,
      transportationType: updatedDriver.transportationType.toLowerCase(),
      vehicleNumber: updatedDriver.vehicleNumber,
      avatarUrl: updatedDriver.avatarUrl,
      status: updatedDriver.status.toLowerCase(),
    };
  },

  /**
   * Update transportation details
   */
  updateDriverVehicle: async (
    driverId: string,
    data: { transportationType: 'BICYCLE' | 'CAR' | 'TRUCK'; vehicleNumber?: string }
  ) => {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new AppError(404, 'NOT_FOUND', 'Driver profile not found');
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        transportationType: data.transportationType,
        vehicleNumber: data.vehicleNumber !== undefined ? data.vehicleNumber : null,
      },
      include: { team: true },
    });

    // Invalidate cached driver summary
    const cacheKey = `driver:${driverId}:summary`;
    await cacheService.del(cacheKey);

    return {
      id: updatedDriver.id,
      workId: updatedDriver.workId,
      fullName: updatedDriver.fullName,
      email: updatedDriver.email,
      team: updatedDriver.team ? updatedDriver.team.name : null,
      level: updatedDriver.level,
      ratePercent: updatedDriver.ratePercent,
      transportationType: updatedDriver.transportationType.toLowerCase(),
      vehicleNumber: updatedDriver.vehicleNumber,
      avatarUrl: updatedDriver.avatarUrl,
      status: updatedDriver.status.toLowerCase(),
    };
  },

  /**
   * List all teams (cached)
   */
  listTeams: async () => {
    const cacheKey = 'config:teams';

    const cachedTeams = await cacheService.get<any[]>(cacheKey);
    if (cachedTeams) {
      return cachedTeams;
    }

    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
    });

    // Cache teams list for 1 hour (TTL: 3600)
    await cacheService.set(cacheKey, teams, 3600);

    return teams;
  },

  /**
   * Get supported vehicle types (cached)
   */
  getVehicleTypes: async () => {
    const cacheKey = 'config:vehicle-types';

    const cachedTypes = await cacheService.get<string[]>(cacheKey);
    if (cachedTypes) {
      return cachedTypes;
    }

    // Supported types
    const types = ['bicycle', 'car', 'truck'];

    // Cache list for 1 day (TTL: 86400)
    await cacheService.set(cacheKey, types, 86400);

    return types;
  }
};

export default driverService;
