"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const env_1 = require("./env");
const pool = new pg_1.Pool({
    connectionString: env_1.ENV.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/delivery_buddy?schema=public',
});
const adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = new client_1.PrismaClient({
    adapter,
    log: env_1.ENV.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
exports.default = exports.prisma;
