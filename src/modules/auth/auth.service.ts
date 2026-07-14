import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { ENV } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { cacheService } from '../../services/cache.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  /**
   * Register a new courier driver
   */
  registerDriver: async (data: {
    email: string;
    password: string;
    fullName: string;
    workId: string;
    teamId?: string;
    transportationType: 'BICYCLE' | 'CAR' | 'TRUCK';
    vehicleNumber?: string;
  }) => {
    // Check if email or work ID already exists
    const existingEmail = await prisma.driver.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new AppError(409, 'CONFLICT', 'Email is already registered', 'email');
    }

    const existingWorkId = await prisma.driver.findUnique({ where: { workId: data.workId } });
    if (existingWorkId) {
      throw new AppError(409, 'CONFLICT', 'Work ID is already registered', 'workId');
    }

    // Check if team exists if provided
    if (data.teamId) {
      const team = await prisma.team.findUnique({ where: { id: data.teamId } });
      if (!team) {
        throw new AppError(404, 'NOT_FOUND', 'The specified team does not exist', 'teamId');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create the driver profile
    const driver = await prisma.driver.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        workId: data.workId,
        teamId: data.teamId || null,
        transportationType: data.transportationType,
        vehicleNumber: data.vehicleNumber || null,
      },
      include: {
        team: true,
      },
    });

    // Generate credentials tokens
    const tokens = await authService.generateAndStoreTokens(driver.id, driver.email, driver.workId);

    return {
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        email: driver.email,
        workId: driver.workId,
        level: driver.level,
        currentRate: driver.ratePercent,
        transportationType: driver.transportationType,
        vehicleNumber: driver.vehicleNumber,
        team: driver.team ? driver.team.name : null,
      },
      ...tokens,
    };
  },

  /**
   * Login driver
   */
  loginDriver: async (email: string, password: string) => {
    const driver = await prisma.driver.findUnique({
      where: { email },
      include: { team: true },
    });

    if (!driver) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password credentials');
    }

    if (driver.status === 'SUSPENDED') {
      throw new AppError(403, 'FORBIDDEN', 'This driver account has been suspended. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password, driver.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password credentials');
    }

    // Generate credentials tokens
    const tokens = await authService.generateAndStoreTokens(driver.id, driver.email, driver.workId);

    return {
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        email: driver.email,
        workId: driver.workId,
        level: driver.level,
        currentRate: driver.ratePercent,
        transportationType: driver.transportationType,
        vehicleNumber: driver.vehicleNumber,
        team: driver.team ? driver.team.name : null,
      },
      ...tokens,
    };
  },

  /**
   * Exchange refresh token for a new access token
   */
  refreshSession: async (refreshToken: string) => {
    try {
      // 1. Verify token structure and expiration
      const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        workId: string;
      };

      // 2. Check if the refresh token matches what is in cache (protects against replay attacks)
      const cachedTokenKey = `refreshToken:${decoded.id}`;
      const savedToken = await cacheService.get<string>(cachedTokenKey);

      if (!savedToken || savedToken !== refreshToken) {
        throw new AppError(401, 'UNAUTHORIZED', 'Refresh token is invalid or has been revoked');
      }

      // 3. Generate new tokens
      const tokens = await authService.generateAndStoreTokens(decoded.id, decoded.email, decoded.workId);
      return tokens;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token has expired or is invalid');
    }
  },

  /**
   * Log out and revoke refresh token
   */
  logoutSession: async (accessToken: string) => {
    try {
      // Decode access token to find the driver id (ignoring expiration so they can logout even if expired)
      const decoded = jwt.decode(accessToken) as { id: string } | null;
      if (decoded && decoded.id) {
        const cachedTokenKey = `refreshToken:${decoded.id}`;
        await cacheService.del(cachedTokenKey);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  },

  /**
   * Helper to generate and cache tokens
   */
  generateAndStoreTokens: async (driverId: string, email: string, workId: string): Promise<AuthTokens> => {
    const payload = { id: driverId, email, workId };

    const accessToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token in cache for 7 days (604800 seconds)
    const cachedTokenKey = `refreshToken:${driverId}`;
    await cacheService.set(cachedTokenKey, refreshToken, 604800);

    return { accessToken, refreshToken };
  }
};

export default authService;
