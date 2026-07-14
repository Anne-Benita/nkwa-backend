import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { cacheService } from '../../services/cache.service';

export const shiftService = {
  /**
   * Start a new shift for the driver
   */
  startShift: async (driverId: string) => {
    // Check if there is already an active shift for this driver
    const activeShift = await prisma.shift.findFirst({
      where: { driverId, status: 'ACTIVE' },
    });

    if (activeShift) {
      throw new AppError(409, 'CONFLICT', 'A shift is already active for this driver.');
    }

    // Start a new shift in a transaction
    const newShift = await prisma.$transaction(async (tx: any) => {
      // 1. Update the driver status
      await tx.driver.update({
        where: { id: driverId },
        data: {
          isOnShift: true,
          status: 'ON_SHIFT',
        },
      });

      // 2. Create the shift record
      return tx.shift.create({
        data: {
          driverId,
          status: 'ACTIVE',
        },
      });
    });

    // Invalidate cached driver summary
    await cacheService.del(`driver:${driverId}:summary`);

    return {
      id: newShift.id,
      driverId: newShift.driverId,
      startedAt: newShift.startedAt,
      status: newShift.status.toLowerCase(),
      earningsTotal: newShift.earningsTotal,
      tipsTotal: newShift.tipsTotal,
      deliveriesCompleted: newShift.deliveriesCompleted,
    };
  },

  /**
   * Stop/end an active shift
   */
  stopShift: async (driverId: string, shiftId: string) => {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new AppError(404, 'NOT_FOUND', 'Shift not found');
    }

    if (shift.driverId !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to end this shift.');
    }

    if (shift.status === 'ENDED') {
      return {
        id: shift.id,
        driverId: shift.driverId,
        startedAt: shift.startedAt,
        endedAt: shift.endedAt,
        status: shift.status.toLowerCase(),
        earningsTotal: shift.earningsTotal,
        tipsTotal: shift.tipsTotal,
        deliveriesCompleted: shift.deliveriesCompleted,
      };
    }

    // End shift and aggregate earnings from completed orders in a transaction
    const stoppedShift = await prisma.$transaction(async (tx: any) => {
      // 1. Find all delivered orders completed during this shift
      const completedOrders = await tx.order.findMany({
        where: {
          driverId,
          shiftId,
          status: 'DELIVERED',
        },
      });

      const deliveriesCompleted = completedOrders.length;
      const earningsTotal = completedOrders.reduce((sum: number, order: any) => sum + order.driverEarning, 0);
      const tipsTotal = completedOrders.reduce((sum: number, order: any) => sum + order.driverTip, 0);

      // 2. Update driver status
      await tx.driver.update({
        where: { id: driverId },
        data: {
          isOnShift: false,
          status: 'OFFLINE',
        },
      });

      // 3. Update the shift record
      return tx.shift.update({
        where: { id: shiftId },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
          earningsTotal,
          tipsTotal,
          deliveriesCompleted,
        },
      });
    });

    // Invalidate cached driver summary
    await cacheService.del(`driver:${driverId}:summary`);

    return {
      id: stoppedShift.id,
      driverId: stoppedShift.driverId,
      startedAt: stoppedShift.startedAt,
      endedAt: stoppedShift.endedAt,
      status: stoppedShift.status.toLowerCase(),
      earningsTotal: stoppedShift.earningsTotal,
      tipsTotal: stoppedShift.tipsTotal,
      deliveriesCompleted: stoppedShift.deliveriesCompleted,
    };
  },

  /**
   * Get active shift for a driver
   */
  getCurrentShift: async (driverId: string) => {
    const shift = await prisma.shift.findFirst({
      where: { driverId, status: 'ACTIVE' },
    });

    if (!shift) {
      return null;
    }

    return {
      id: shift.id,
      driverId: shift.driverId,
      startedAt: shift.startedAt,
      status: shift.status.toLowerCase(),
      earningsTotal: shift.earningsTotal,
      tipsTotal: shift.tipsTotal,
      deliveriesCompleted: shift.deliveriesCompleted,
    };
  },

  /**
   * Get shift history for driver
   */
  getShiftHistory: async (driverId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const shifts = await prisma.shift.findMany({
      where: { driverId },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
    });

    return shifts.map((s: any) => ({
      id: s.id,
      driverId: s.driverId,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      status: s.status.toLowerCase(),
      earningsTotal: s.earningsTotal,
      tipsTotal: s.tipsTotal,
      deliveriesCompleted: s.deliveriesCompleted,
    }));
  },

  /**
   * Get single shift details
   */
  getShiftDetails: async (driverId: string, shiftId: string) => {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            driverEarning: true,
            driverTip: true,
          },
        },
      },
    });

    if (!shift) {
      throw new AppError(404, 'NOT_FOUND', 'Shift not found');
    }

    if (shift.driverId !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view this shift.');
    }

    return {
      id: shift.id,
      driverId: shift.driverId,
      startedAt: shift.startedAt,
      endedAt: shift.endedAt,
      status: shift.status.toLowerCase(),
      earningsTotal: shift.earningsTotal,
      tipsTotal: shift.tipsTotal,
      deliveriesCompleted: shift.deliveriesCompleted,
      orders: shift.orders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status.toLowerCase(),
        driverEarning: o.driverEarning,
        driverTip: o.driverTip,
      })),
    };
  }
};

export default shiftService;
