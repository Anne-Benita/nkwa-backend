"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiftService = void 0;
const prisma_1 = require("../../config/prisma");
const error_middleware_1 = require("../../middleware/error.middleware");
const cache_service_1 = require("../../services/cache.service");
exports.shiftService = {
    /**
     * Start a new shift for the driver
     */
    startShift: async (driverId) => {
        // Check if there is already an active shift for this driver
        const activeShift = await prisma_1.prisma.shift.findFirst({
            where: { driverId, status: 'ACTIVE' },
        });
        if (activeShift) {
            throw new error_middleware_1.AppError(409, 'CONFLICT', 'A shift is already active for this driver.');
        }
        // Start a new shift in a transaction
        const newShift = await prisma_1.prisma.$transaction(async (tx) => {
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
        await cache_service_1.cacheService.del(`driver:${driverId}:summary`);
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
    stopShift: async (driverId, shiftId) => {
        const shift = await prisma_1.prisma.shift.findUnique({
            where: { id: shiftId },
        });
        if (!shift) {
            throw new error_middleware_1.AppError(404, 'NOT_FOUND', 'Shift not found');
        }
        if (shift.driverId !== driverId) {
            throw new error_middleware_1.AppError(403, 'FORBIDDEN', 'You do not have permission to end this shift.');
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
        const stoppedShift = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Find all delivered orders completed during this shift
            const completedOrders = await tx.order.findMany({
                where: {
                    driverId,
                    shiftId,
                    status: 'DELIVERED',
                },
            });
            const deliveriesCompleted = completedOrders.length;
            const earningsTotal = completedOrders.reduce((sum, order) => sum + order.driverEarning, 0);
            const tipsTotal = completedOrders.reduce((sum, order) => sum + order.driverTip, 0);
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
        await cache_service_1.cacheService.del(`driver:${driverId}:summary`);
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
    getCurrentShift: async (driverId) => {
        const shift = await prisma_1.prisma.shift.findFirst({
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
    getShiftHistory: async (driverId, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const shifts = await prisma_1.prisma.shift.findMany({
            where: { driverId },
            orderBy: { startedAt: 'desc' },
            skip,
            take: limit,
        });
        return shifts.map((s) => ({
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
    getShiftDetails: async (driverId, shiftId) => {
        const shift = await prisma_1.prisma.shift.findUnique({
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
            throw new error_middleware_1.AppError(404, 'NOT_FOUND', 'Shift not found');
        }
        if (shift.driverId !== driverId) {
            throw new error_middleware_1.AppError(403, 'FORBIDDEN', 'You do not have permission to view this shift.');
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
            orders: shift.orders.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                status: o.status.toLowerCase(),
                driverEarning: o.driverEarning,
                driverTip: o.driverTip,
            })),
        };
    }
};
exports.default = exports.shiftService;
