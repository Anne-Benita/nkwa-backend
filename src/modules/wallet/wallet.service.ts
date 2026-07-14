import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { cacheService } from '../../services/cache.service';

export const walletService = {
  /**
   * Get wallet summary details (caches the result)
   */
  getWalletSummary: async (driverId: string) => {
    const cacheKey = `driver:${driverId}:wallet`;

    // Try cache
    const cachedWallet = await cacheService.get<any>(cacheKey);
    if (cachedWallet) {
      return cachedWallet;
    }

    // Get driver details (for level/rate)
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new AppError(404, 'NOT_FOUND', 'Driver profile not found');
    }

    // Find the driver's latest transaction to get current balance
    const latestTx = await prisma.transaction.findFirst({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });

    const balance = latestTx ? latestTx.balanceAfter : 0.0;

    // Calculate total tips received
    const tipsAggregation = await prisma.transaction.aggregate({
      where: {
        driverId,
        type: 'TIP',
      },
      _sum: {
        amount: true,
      },
    });

    const totalTips = tipsAggregation._sum.amount || 0.0;

    const summary = {
      balance: parseFloat(balance.toFixed(2)),
      tips: parseFloat(totalTips.toFixed(2)),
      ratePercent: driver.ratePercent,
      level: driver.level,
    };

    // Cache wallet summary for 60 seconds (TTL: 60s)
    await cacheService.set(cacheKey, summary, 60);

    return summary;
  },

  /**
   * Get transaction history (paginated)
   */
  getTransactionHistory: async (driverId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const transactions = await prisma.transaction.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type.toLowerCase(),
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      description: tx.order ? `Order ${tx.order.orderNumber}` : tx.type.toLowerCase(),
      createdAt: tx.createdAt,
    }));
  },

  /**
   * Withdraw funds from available wallet balance
   */
  withdrawFunds: async (driverId: string, amount: number) => {
    if (amount <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Withdrawal amount must be a positive number', 'amount');
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Fetch latest transaction to get current balance
      const latestTx = await tx.transaction.findFirst({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
      });

      const currentBalance = latestTx ? latestTx.balanceAfter : 0.0;

      if (currentBalance < amount) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Withdrawal amount exceeds available wallet balance', 'amount');
      }

      const newBalance = currentBalance - amount;

      // 2. Log withdrawal transaction
      const transaction = await tx.transaction.create({
        data: {
          driverId,
          type: 'WITHDRAWAL',
          amount: -amount, // Negative value for deduction
          balanceAfter: newBalance,
        },
      });

      return transaction;
    });

    // Invalidate wallet summary and driver summary caches
    await cacheService.del(`driver:${driverId}:wallet`);
    await cacheService.del(`driver:${driverId}:summary`);

    return {
      transactionId: result.id,
      amount: result.amount,
      balanceAfter: result.balanceAfter,
      createdAt: result.createdAt,
    };
  }
};

export default walletService;
