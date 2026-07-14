import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';
import { cacheService } from '../src/services/cache.service';

// Mock the Prisma Client and Cache Service
jest.mock('../src/config/prisma', () => ({
  prisma: {
    driver: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../src/services/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('Authentication Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/auth/signup', () => {
    const signupPayload = {
      email: 'newdriver@deliverybuddy.com',
      password: 'Password123',
      fullName: 'Tyler Test',
      workId: 'TEST1234',
      transportationType: 'BICYCLE',
      vehicleNumber: 'BK-100',
    };

    it('should successfully register a driver and return tokens', async () => {
      // Setup mocks
      (prisma.driver.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // workId check

      const mockedDriver = {
        id: 'mocked-driver-uuid',
        email: signupPayload.email,
        fullName: signupPayload.fullName,
        workId: signupPayload.workId,
        level: 1,
        ratePercent: 15.0,
        transportationType: 'BICYCLE',
        vehicleNumber: 'BK-100',
        team: null,
      };
      (prisma.driver.create as jest.Mock).mockResolvedValue(mockedDriver);
      (cacheService.set as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post('/v1/auth/signup')
        .send(signupPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.driver.email).toBe(signupPayload.email);
      expect(prisma.driver.create).toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/v1/auth/signup')
        .send({
          email: 'invalid@test.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 if email is already taken', async () => {
      (prisma.driver.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'existing-id' });

      const res = await request(app)
        .post('/v1/auth/signup')
        .send(signupPayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /v1/auth/login', () => {
    const loginPayload = {
      email: 'tyler@deliverybuddy.com',
      password: 'Password123',
    };

    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash(loginPayload.password, 10);
      const mockDriver = {
        id: 'driver-id-123',
        email: loginPayload.email,
        fullName: 'Tyler Teeler',
        passwordHash: hashedPassword,
        workId: '4RT5697',
        level: 3,
        ratePercent: 25.0,
        transportationType: 'BICYCLE',
        vehicleNumber: 'RE 345 6',
        team: null,
        status: 'OFFLINE',
      };

      (prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriver);
      (cacheService.set as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post('/v1/auth/login')
        .send(loginPayload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.driver.fullName).toBe('Tyler Teeler');
    });

    it('should return 401 for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword', 10);
      const mockDriver = {
        id: 'driver-id-123',
        email: loginPayload.email,
        passwordHash: hashedPassword,
        status: 'OFFLINE',
      };

      (prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriver);

      const res = await request(app)
        .post('/v1/auth/login')
        .send({
          email: loginPayload.email,
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if driver account is suspended', async () => {
      const mockDriver = {
        id: 'driver-id-123',
        email: loginPayload.email,
        status: 'SUSPENDED',
      };

      (prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriver);

      const res = await request(app)
        .post('/v1/auth/login')
        .send(loginPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
