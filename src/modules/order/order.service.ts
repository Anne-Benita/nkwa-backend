import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { cacheService } from '../../services/cache.service';
import { OrderStatus, OrderStatusPayment } from '@prisma/client';

export const orderService = {
  /**
   * Get available orders that are still pending and not claimed
   */
  getAvailableOrders: async () => {
    return prisma.order.findMany({
      where: {
        status: 'PENDING',
        driverId: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Accept/claim an order
   */
  acceptOrder: async (driverId: string, orderId: string) => {
    // 1. Verify driver is currently active on a shift
    const activeShift = await prisma.shift.findFirst({
      where: { driverId, status: 'ACTIVE' },
    });

    if (!activeShift) {
      throw new AppError(400, 'BAD_REQUEST', 'You must start a shift before you can accept orders.');
    }

    // 2. Fetch order and verify it is not already claimed
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    if (order.driverId) {
      throw new AppError(409, 'CONFLICT', 'This order has already been claimed by another driver.');
    }

    // 3. Update order in database
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        driverId,
        shiftId: activeShift.id,
        status: 'PICKED_UP', // Advance status to picked_up
      },
    });

    // Invalidate current orders cache for this driver
    await cacheService.del(`driver:${driverId}:orders-current`);

    return updatedOrder;
  },

  /**
   * Get current active delivering order + the next pending order
   */
  getCurrentOrders: async (driverId: string) => {
    const cacheKey = `driver:${driverId}:orders-current`;

    // Try cache
    const cachedResult = await cacheService.get<any>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Get currently active delivery (status is picked_up, en_route, or arrived)
    const currentOrder = await prisma.order.findFirst({
      where: {
        driverId,
        status: {
          in: ['PICKED_UP', 'EN_ROUTE', 'ARRIVED'] as OrderStatus[],
        },
      },
      include: { items: true },
    });

    // Get the next pending order in the queue (or next assigned to this driver)
    const nextOrder = await prisma.order.findFirst({
      where: {
        status: 'PENDING',
        driverId: null,
      },
      orderBy: { createdAt: 'asc' },
      include: { items: true },
    });

    const result = {
      current: currentOrder
        ? {
            id: currentOrder.id,
            orderNumber: currentOrder.orderNumber,
            status: currentOrder.status.toLowerCase(),
            pickup: {
              name: currentOrder.pickupName,
              address: currentOrder.pickupAddress,
            },
            customer: {
              name: currentOrder.customerName,
              phone: currentOrder.customerPhone,
            },
            destination: currentOrder.destinationAddress,
            items: currentOrder.items.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.unitPrice,
              description: i.description,
            })),
            itemsTotal: currentOrder.itemsTotal,
            payment: { method: currentOrder.paymentMethod.toLowerCase() },
            driverEarning: currentOrder.driverEarning,
            driverTip: currentOrder.driverTip,
            distanceLeftKm: currentOrder.distanceLeftKm,
          }
        : null,
      next: nextOrder
        ? {
            id: nextOrder.id,
            orderNumber: nextOrder.orderNumber,
            status: nextOrder.status.toLowerCase(),
            pickup: {
              name: nextOrder.pickupName,
              address: nextOrder.pickupAddress,
            },
            customer: {
              name: nextOrder.customerName,
              phone: nextOrder.customerPhone,
            },
            destination: nextOrder.destinationAddress,
            items: nextOrder.items.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.unitPrice,
              description: i.description,
            })),
            itemsTotal: nextOrder.itemsTotal,
            payment: { method: nextOrder.paymentMethod.toLowerCase() },
            driverEarning: nextOrder.driverEarning,
            driverTip: nextOrder.driverTip,
            distanceLeftKm: nextOrder.distanceLeftKm,
          }
        : null,
    };

    // Cache results for 10 seconds (short-lived dashboard cache)
    await cacheService.set(cacheKey, result, 10);

    return result;
  },

  /**
   * Get single order details
   */
  getOrderDetails: async (driverId: string, orderId: string) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    if (order.driverId && order.driverId !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view this order.');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      pickup: {
        name: order.pickupName,
        address: order.pickupAddress,
      },
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
      },
      destination: order.destinationAddress,
      items: order.items.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.unitPrice,
        description: i.description,
      })),
      itemsTotal: order.itemsTotal,
      payment: { method: order.paymentMethod.toLowerCase() },
      driverEarning: order.driverEarning,
      driverTip: order.driverTip,
      distanceLeftKm: order.distanceLeftKm,
    };
  },

  /**
   * Get list of orders for the driver
   */
  getDriverOrders: async (driverId: string, status?: string) => {
    return prisma.order.findMany({
      where: {
        driverId,
        status: status ? (status.toUpperCase() as OrderStatus) : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  },

  /**
   * Update order status (picked_up -> en_route -> arrived -> delivered)
   */
  updateOrderStatus: async (driverId: string, orderId: string, newStatus: string) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    if (order.driverId !== driverId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this order.');
    }

    const formattedStatus = newStatus.toUpperCase() as OrderStatus;

    // Financial calculations and transaction logs on "DELIVERED" status transition
    if (formattedStatus === 'DELIVERED' && order.status !== 'DELIVERED') {
      const resultOrder = await prisma.$transaction(async (tx: any) => {
        // 1. Update the order status to delivered
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });

        // 2. Fetch driver transactions to calculate the current wallet balance
        const transactions = await tx.transaction.findMany({
          where: { driverId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });

        let currentBalance = transactions.length > 0 ? transactions[0].balanceAfter : 0.0;

        // 3. Create earning transaction record
        currentBalance += order.driverEarning;
        await tx.transaction.create({
          data: {
            driverId,
            orderId,
            type: 'EARNING',
            amount: order.driverEarning,
            balanceAfter: currentBalance,
          },
        });

        // 4. Create tip transaction record if any tip exists
        if (order.driverTip > 0) {
          currentBalance += order.driverTip;
          await tx.transaction.create({
            data: {
              driverId,
              orderId,
              type: 'TIP',
              amount: order.driverTip,
              balanceAfter: currentBalance,
            },
          });
        }

        return updated;
      });

      // Invalidate caches
      await cacheService.del(`driver:${driverId}:orders-current`);
      await cacheService.del(`driver:${driverId}:summary`);
      await cacheService.del(`driver:${driverId}:wallet`);

      return resultOrder;
    }

    // Standard status update
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: formattedStatus },
    });

    // Invalidate caches
    await cacheService.del(`driver:${driverId}:orders-current`);

    return updated;
  },

  /**
   * Get live tracking info (cached to avoid maps API calls)
   */
  getOrderTracking: async (orderId: string) => {
    const cacheKey = `order:${orderId}:tracking`;

    // Try to get from cache first (30s TTL to prevent maps spamming)
    const cachedTracking = await cacheService.get<any>(cacheKey);
    if (cachedTracking) {
      return cachedTracking;
    }

    // Cache Miss: Simulate mapping API processing route polyline & live ETA
    // E.g., computing distance based on route coordinates
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    // Default mock data structure matching the mockup map tracking UI
    const trackingInfo = {
      orderId,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      etaMinutes: Math.max(1, Math.round(order.distanceLeftKm * 3.5)), // 3.5 mins per km
      distanceLeftKm: order.distanceLeftKm,
      trafficAlert: order.distanceLeftKm > 5 ? '2 min delay' : null,
      routePolyline: 'u{~vFvy|uO{aa@~sc@pe`@wvx@_c|@', // Simple mock coordinates string
    };

    // Cache tracking information for 30 seconds
    await cacheService.set(cacheKey, trackingInfo, 30);

  },

  /**
   * Fetch chat messages history for an order
   */
  getOrderMessages: async (orderId: string, page: number = 1, limit: number = 20) => {
    const skip = (page - 1) * limit;
    const messages = await prisma.message.findMany({
      where: { orderId },
      orderBy: { sentAt: 'asc' },
      skip,
      take: limit,
    });

    return messages.map((m: any) => ({
      id: m.id,
      senderType: m.senderType.toLowerCase(),
      body: m.body,
      sentAt: m.sentAt,
      seenAt: m.seenAt,
    }));
  },

  /**
   * Send a new message inside an order's chat thread
   */
  sendOrderMessage: async (orderId: string, senderType: 'DRIVER' | 'CUSTOMER', senderId: string, body: string) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    const message = await prisma.message.create({
      data: {
        orderId,
        senderType,
        senderId,
        body,
      },
    });

    return {
      id: message.id,
      senderType: message.senderType.toLowerCase(),
      body: message.body,
      sentAt: message.sentAt,
      seenAt: message.seenAt,
    };
  }
};

export default orderService;
