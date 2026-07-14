"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletController = void 0;
const wallet_service_1 = require("./wallet.service");
const error_middleware_1 = require("../../middleware/error.middleware");
exports.walletController = {
    /**
     * Fetch current driver wallet summary (balance, total tips)
     */
    getSummary: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const summary = await wallet_service_1.walletService.getWalletSummary(req.driver.id);
            res.status(200).json(summary);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Fetch paginated transaction history logs
     */
    getTransactions: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '10', 10);
            const history = await wallet_service_1.walletService.getTransactionHistory(req.driver.id, page, limit);
            res.status(200).json(history);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Request withdrawal of available funds
     */
    withdraw: async (req, res, next) => {
        try {
            if (!req.driver) {
                return next(new error_middleware_1.AppError(401, 'UNAUTHORIZED', 'User not authenticated'));
            }
            const { amount } = req.body;
            if (amount === undefined || typeof amount !== 'number') {
                return next(new error_middleware_1.AppError(400, 'VALIDATION_ERROR', 'Withdrawal amount must be a number', 'amount'));
            }
            const result = await wallet_service_1.walletService.withdrawFunds(req.driver.id, amount);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
};
exports.default = exports.walletController;
