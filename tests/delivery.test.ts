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
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    shift: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
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

describe('Delivery & Shift Module Tests', () => {
  const driverId = 'driver-uuid-123';
  let accessToken: string;

  beforeAll(() => {
    // Generate valid access token for tests
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

  describe('POST /v1/shifts/start', () => {
    it('should start a shift successfully when driver is offline', async () => {
      // Setup mocks
      (prisma.shift.findFirst as jest.Mock).mockResolvedValue(null); // No active shift
      (prisma.shift.create as jest.Mock).mockResolvedValue({
        id: 'new-shift-uuid',
        driverId,
        startedAt: new Date(),
        status: 'ACTIVE',
        earningsTotal: 0.0,
        tipsTotal: 0.0,
        deliveriesCompleted: 0,
      });

      const res = await request(app)
        .post('/v1/shifts/start')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('active');
      expect(prisma.shift.create).toHaveBeenCalled();
    });

    it('should return 409 if a shift is already active', async () => {
      (prisma.shift.findFirst as jest.Mock).mockResolvedValue({ id: 'active-shift' });

      const res = await request(app)
        .post('/v1/shifts/start')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /v1/orders/:orderId/accept', () => {
    const orderId = 'order-uuid-999';

    it('should allow driver to accept a pending order if on shift', async () => {
      (prisma.shift.findFirst as jest.Mock).mockResolvedValue({ id: 'active-shift-uuid' });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: orderId,
        driverId: null,
        status: 'PENDING',
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({
        id: orderId,
        driverId,
        status: 'PICKED_UP',
      });

      const res = await request(app)
        .post(`/v1/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PICKED_UP');
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should fail with 400 if driver has no active shift session', async () => {
      (prisma.shift.findFirst as jest.Mock).mockResolvedValue(null); // No active shift

      const res = await request(app)
        .post(`/v1/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /v1/orders/:orderId/tracking', () => {
    it('should return cached tracking details if they exist', async () => {
      const mockTracking = {
        orderId: 'order-1',
        etaMinutes: 5,
        distanceLeftKm: 1.2,
      };
      (cacheService.get as jest.Mock).mockResolvedValue(mockTracking);

      const res = await request(app)
        .get('/v1/orders/order-1/tracking')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.etaMinutes).toBe(5);
      expect(prisma.order.findUnique).not.toHaveBeenCalled(); // Read from cache
    });
  });
});
