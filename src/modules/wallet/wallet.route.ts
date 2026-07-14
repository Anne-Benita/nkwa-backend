import { Router } from 'express';
import { walletController } from './wallet.controller';
import authMiddleware from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet transactions, balance summaries, and payout withdrawals
 */

/**
 * @swagger
 * /wallet:
 *   get:
 *     summary: Retrieve current wallet balance, total tips, level and rates
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet summary details returned.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                 tips:
 *                   type: number
 *                 ratePercent:
 *                   type: number
 *                 level:
 *                   type: integer
 *       401:
 *         description: Unauthorized.
 */
router.get('/', authMiddleware, walletController.getSummary);

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: List transaction history (earnings, tips, and withdrawals)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page limit
 *     responses:
 *       200:
 *         description: Paginated transaction history array returned.
 *       401:
 *         description: Unauthorized.
 */
router.get('/transactions', authMiddleware, walletController.getTransactions);

/**
 * @swagger
 * /wallet/withdraw:
 *   post:
 *     summary: Request withdrawal of available wallet funds
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 100.00
 *     responses:
 *       200:
 *         description: Withdrawal successfully processed.
 *       400:
 *         description: Bad Request (insufficient balance or invalid amount).
 *       401:
 *         description: Unauthorized.
 */
router.post('/withdraw', authMiddleware, walletController.withdraw);

export default router;
