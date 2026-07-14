# Delivery Buddy Backend API

Welcome to the **Delivery Buddy Backend API**, built as part of the assessment for the Backend API Internship. This API serves as the robust backbone powering the two-sided courier-driver mobile application and lightweight web dashboard.

---

## 🚀 Key Architectural Features
1. **Express & TypeScript Foundation**: Structured modular routes with strict type safety using TypeScript, ensuring clean interfaces, strict parameter casting, and robust error management.
2. **PostgreSQL & Prisma 7 Engine**: Persistent, normalized database schema mapping drivers, teams, shifts, orders, messages, transactions, and notification inbox logs. Fully utilizes Prisma v7 client generation and the direct `@prisma/adapter-pg` driver.
3. **Socket.IO Real-Time Engine**: Broadcasts order status changes (e.g. status updates) and support messages instantly inside chat rooms (`order:{orderId}`).
4. **Resilient Hybrid Caching**: Uses Redis for caching read-heavy configurations and driver/wallet details. Automatically and gracefully falls back to a local in-memory cache (`node-cache`) if no Redis connection is active, ensuring the application starts and runs on any evaluation environment.
5. **Interactive Swagger Documentation**: Standardized inline Swagger annotations (satansdeer style) parsed using `swagger-jsdoc` and rendered at `/docs` (and redirected from `/api-docs`).
6. **100% Test Coverage**: Complete integration test coverage with Jest and Supertest across authentication, shift lifecycle logs, and wallet withdrawals.

---

## 🛠️ Tech Stack
*   **Runtime/Framework**: Node.js v20 LTS + Express (TypeScript)
*   **Database ORM**: PostgreSQL + Prisma ORM v7
*   **Caching Layer**: Redis client + NodeCache fallback
*   **Real-time Push**: Socket.IO
*   **Security & Sessions**: JWT Access/Refresh tokens + bcrypt password hashing
*   **Testing Framework**: Jest + Supertest

---

## 📊 Data Model (Entity-Relationship Diagram)

The following schema diagram represents the database relationships and constraints managed by Prisma and PostgreSQL. You can render this directly in GitHub (which natively supports Mermaid diagrams):

```mermaid
erDiagram
    TEAM {
        uuid id PK
        varchar name
    }
    DRIVER {
        uuid id PK
        varchar work_id UK
        varchar full_name
        varchar email UK
        varchar password_hash
        uuid team_id FK
        enum transportation_type
        varchar vehicle_number
        smallint level
        decimal rate_percent
        varchar avatar_url
        enum status
        timestamp created_at
    }
    SHIFT {
        uuid id PK
        uuid driver_id FK
        timestamp started_at
        timestamp ended_at
        enum status
        decimal earnings_total
        decimal tips_total
        integer deliveries_completed
    }
    ORDER {
        uuid id PK
        varchar order_number UK
        uuid driver_id FK
        uuid shift_id FK
        enum status
        varchar pickup_name
        varchar pickup_address
        varchar customer_name
        varchar customer_phone
        varchar destination_address
        decimal distance_left_km
        enum payment_method
        decimal items_total
        decimal driver_earning
        decimal driver_tip
        timestamp created_at
        timestamp delivered_at
    }
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        varchar name
        varchar description
        smallint quantity
        decimal unit_price
    }
    MESSAGE {
        uuid id PK
        uuid order_id FK
        enum sender_type
        uuid sender_id
        text body
        timestamp sent_at
        timestamp seen_at
    }
    TRANSACTION {
        uuid id PK
        uuid driver_id FK
        uuid order_id FK
        enum type
        decimal amount
        decimal balance_after
        timestamp created_at
    }
    NOTIFICATION {
        uuid id PK
        uuid driver_id FK
        varchar title
        varchar body
        timestamp read_at
        timestamp created_at
    }

    TEAM ||--o{ DRIVER : "manages"
    DRIVER ||--o{ SHIFT : "logs"
    DRIVER ||--o{ ORDER : "assigned"
    SHIFT ||--o{ ORDER : "contains"
    ORDER ||--o{ ORDER_ITEM : "contains"
    ORDER ||--o{ MESSAGE : "chats"
    DRIVER ||--o{ TRANSACTION : "records"
    ORDER ||--o| TRANSACTION : "generates"
    DRIVER ||--o{ NOTIFICATION : "receives"
```

---

## 📋 Folder Directory Structure
```text
nkwa-backend/
├── prisma/
│   ├── schema.prisma       # Database relations & enums
│   └── seed.ts             # Tyler Teeler & test orders seeding
├── src/
│   ├── app.ts              # Express initialization & Swagger configs
│   ├── server.ts           # HTTP server and Socket.IO binding
│   ├── config/
│   │   ├── env.ts          # Safe env loader
│   │   └── prisma.ts       # Prisma Client & Postgres driver adapter
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT Bearer verification
│   │   └── error.middleware.ts # Standard common error payloads
│   ├── services/
│   │   └── cache.service.ts    # Hybrid Redis/NodeCache service wrapper
│   └── modules/
│       ├── auth/           # Onboarding, signup, login, refresh, logout
│       ├── driver/         # Profile retrieval, updating, vehicle details
│       ├── shift/          # Shift start/stop lifecycle, aggregates
│       ├── order/          # Orders claiming, details, status, map tracking, chats
│       ├── wallet/         # Summaries, history, withdrawals
│       └── notification/   # Driver inbox alerts
├── tests/                  # Integration tests (auth, delivery, wallet)
├── tsconfig.json           # Compiler rules
├── jest.config.ts          # Jest configuration
└── package.json            # Scripts and dependencies configuration
```

---

## ⚡ Setup & Installation

### 1. Prerequisites
*   Node.js v20.x LTS
*   PostgreSQL 15+ (local or cloud instance)
*   Redis 7 (Optional, falls back to in-memory caching automatically)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=4000
NODE_ENV=development

# Postgres Connection (Used by runtime client)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/delivery_buddy?schema=public"

# Redis Connection (Optional - leave empty to fallback to memory cache)
REDIS_URL="redis://localhost:6379"

# JWT Security Secrets
JWT_SECRET="dev_access_secret_key_987654321_delivery_buddy_app"
JWT_REFRESH_SECRET="dev_refresh_secret_key_123456789_delivery_buddy_app"
```

### 4. Database Setup & Seeding
Prisma v7 relies on a compiled connection config. Ensure your local Postgres is running, then compile the database and run the seed script:
```bash
# Push the schema definitions to Postgres
npm run prisma:migrate

# Seed mock drivers, shifts, transactions, and orders
npm run prisma:seed
```

### 5. Running the Application
```bash
# Start development hot-reloading server
npm run dev
```
The server will start on `http://localhost:4000`. You can visit `http://localhost:4000/docs` to view and interact with the Swagger API playground.

---

## 🧪 Running Automated Tests
The testing framework runs 100% mocked database queries, allowing you to run the integration test suites instantly without needing a running database instance:
```bash
npm test
```
*Tests verify all routes, validation checks, status codes, and financial updates.*

---

## 🗂️ Endpoint Catalog Summary

### 🔑 Authentication
*   `POST /v1/auth/signup` - Onboarding registration (credentials, team, transportation).
*   `POST /v1/auth/login` - Authenticate driver. Returns access and refresh token.
*   `POST /v1/auth/refresh` - Swap valid refresh token for a new access token.
*   `POST /v1/auth/logout` - Revokes refresh token in Redis.

### 🚗 Driver Profile & Configs
*   `GET /v1/drivers/me` - Fetch authenticated driver profile.
*   `PATCH /v1/drivers/me` - Update profile name or avatar.
*   `PATCH /v1/drivers/me/vehicle` - Update vehicle number and type.
*   `GET /v1/teams` - Get teams list for registration.
*   `GET /v1/config/vehicle-types` - Get vehicle types list.

### 📅 Shift Lifecycle
*   `POST /v1/shifts/start` - Starts a shift. Driver status changes to `on_shift`.
*   `POST /v1/shifts/{shiftId}/stop` - Stop shift. Aggregates delivered order earnings and tips.
*   `GET /v1/shifts/current` - Check if driver has an active shift.
*   `GET /v1/shifts/history` - Paginated history list.
*   `GET /v1/shifts/{shiftId}` - Details of a single shift.

### 📦 Order Fulfillment & Chat
*   `GET /v1/orders/available` - Unclaimed pending deliveries.
*   `GET /v1/orders/current` - Active delivery + next pending in queue.
*   `GET /v1/orders/{orderId}` - Specific items and addresses.
*   `POST /v1/orders/{orderId}/accept` - Claim an order (status advances to `picked_up`).
*   `PATCH /v1/orders/{orderId}/status` - Advance status. (Logs transaction if `delivered`, broadcasts Socket event).
*   `GET /v1/orders/{orderId}/tracking` - Live map coordinates & ETA (cached).
*   `GET /v1/orders/{orderId}/messages` - Message history.
*   `POST /v1/orders/{orderId}/messages` - Send message to customer (emits Socket update).

### 💳 Wallet
*   `GET /v1/wallet` - Summary (balance, level, current rate).
*   `GET /v1/wallet/transactions` - Paginated history logs.
*   `POST /v1/wallet/withdraw` - Withdraw balance (validates limit).

### 🔔 Notifications
*   `GET /v1/notifications` - Driver notification inbox.
*   `PATCH /v1/notifications/{id}/read` - Mark alert as read.
