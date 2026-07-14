import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { walletService } from './wallet.service';
import { AppError } from '../../middleware/error.middleware';

export const walletController = {
  /**
   * Fetch current driver wallet summary (balance, total tips)
   */
  getSummary: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const summary = await walletService.getWalletSummary(req.driver.id);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Fetch paginated transaction history logs
   */
  getTransactions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);

      const history = await walletService.getTransactionHistory(req.driver.id, page, limit);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Request withdrawal of available funds
   */
  withdraw: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.driver) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
      }

      const { amount } = req.body;

      if (amount === undefined || typeof amount !== 'number') {
        return next(new AppError(400, 'VALIDATION_ERROR', 'Withdrawal amount must be a number', 'amount'));
      }

      const result = await walletService.withdrawFunds(req.driver.id, amount);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
};

export default walletController;
