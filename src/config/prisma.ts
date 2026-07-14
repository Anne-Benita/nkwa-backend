import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ENV } from './env';

const pool = new Pool({
  connectionString: ENV.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/delivery_buddy?schema=public',
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ENV.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;
