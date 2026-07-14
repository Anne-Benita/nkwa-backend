import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Driver authentication and onboarding
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new driver profile (Onboarding)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - workId
 *               - transportationType
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tyler@deliverybuddy.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: Password123
 *               fullName:
 *                 type: string
 *                 example: Tyler Teeler
 *               workId:
 *                 type: string
 *                 example: 4RT5697
 *               teamId:
 *                 type: string
 *                 format: uuid
 *                 example: d63df8db-b4b3-469a-9e19-9cf949ff4601
 *               transportationType:
 *                 type: string
 *                 enum: [BICYCLE, CAR, TRUCK]
 *                 example: BICYCLE
 *               vehicleNumber:
 *                 type: string
 *                 example: RE 345 6
 *     responses:
 *       201:
 *         description: Driver created successfully with session tokens.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 driver:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     workId:
 *                       type: string
 *                     level:
 *                       type: integer
 *                     currentRate:
 *                       type: number
 *                     transportationType:
 *                       type: string
 *                     vehicleNumber:
 *                       type: string
 *                     team:
 *                       type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error or missing fields.
 *       409:
 *         description: Conflict (email or workId already registered).
 */
router.post('/signup', authController.signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate driver credentials
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tyler@deliverybuddy.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Successfully logged in. Returns tokens.
 *       401:
 *         description: Invalid credentials.
 *       403:
 *         description: Account suspended.
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token successfully refreshed. Returns new tokens.
 *       401:
 *         description: Invalid or expired refresh token.
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoke session refresh token (logout)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully.
 */
router.post('/logout', authController.logout);

export default router;
