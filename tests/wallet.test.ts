import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';
import { cacheService } from '../src/services/cache.service';

// Mock the Prisma Client and Cache Service
jest.mock('../src/config/prisma', () => {
  const localMockPrisma = {
    driver: {
      findUnique: jest.fn(),
    },
    transaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  localMockPrisma.$transaction.mockImplementation((cb: any) => cb(localMockPrisma));

  return {
    prisma: localMockPrisma,
  };
});

jest.mock('../src/services/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('Wallet & Financials Module Tests', () => {
  const driverId = 'driver-uuid-123';
  let accessToken: string;

  beforeAll(() => {
    accessToken = jwt.sign(
      { id: driverId, email: 'tyler@deliverybuddy.com', workId: '4RT5697' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(prisma));
  });

  describe('GET /v1/wallet', () => {
    it('should successfully calculate balance and return summary from database', async () => {
      // Setup cache miss
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      // Setup DB mocks
      (prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: driverId,
        level: 3,
        ratePercent: 25.0,
      });

      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        balanceAfter: 487.67,
      });

      (prisma.transaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 276.78 },
      });

      const res = await request(app)
        .get('/v1/wallet')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(487.67);
      expect(res.body.tips).toBe(276.78);
      expect(res.body.level).toBe(3);
    });

    it('should read from cache if available', async () => {
      const mockSummary = {
        balance: 100.0,
        tips: 50.0,
        ratePercent: 15.0,
        level: 1,
      };
      (cacheService.get as jest.Mock).mockResolvedValue(mockSummary);

      const res = await request(app)
        .get('/v1/wallet')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(100.0);
      expect(prisma.driver.findUnique).not.toHaveBeenCalled(); // Cache hit
    });
  });

  describe('POST /v1/wallet/withdraw', () => {
    it('should process a withdrawal successfully if balance is sufficient', async () => {
      // Mock latest transaction to return a balance of $500
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        balanceAfter: 500.0,
      });

      (prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'tx-withdrawal-id',
        amount: -100.0,
        balanceAfter: 400.0,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 100.0 });

      expect(res.status).toBe(200);
      expect(res.body.balanceAfter).toBe(400.0);
      expect(res.body.amount).toBe(-100.0);
      expect(prisma.transaction.create).toHaveBeenCalled();
    });

    it('should return 400 if withdrawal amount exceeds current balance', async () => {
      // Mock latest transaction to return a balance of $50
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        balanceAfter: 50.0,
      });

      const res = await request(app)
        .post('/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 100.0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('exceeds available');
    });

    it('should return 400 if withdrawal amount is invalid/negative', async () => {
      const res = await request(app)
        .post('/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: -50.0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
