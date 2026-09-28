# CRM Elevate Backend — Fastify + TypeScript + PostgreSQL

Standalone Modular Monolith CRM Backend built with Node.js, Fastify, TypeScript, Prisma ORM, and PostgreSQL.

## 🚀 Features

- **Modular Monolith**: Clean, domain-driven structure (`auth`, `users`, `master-data`, `enquiries`, `follow-ups`, `call-logs`, `admissions`, `invoices`, `receipts`, `expenses`, `services`, `job-orders`, `notifications`, `dashboard`, `reports`).
- **PostgreSQL Database**: Relational schema powered by Prisma ORM.
- **RESTful API**: Versioned endpoints under `/api/v1`.
- **Authentication & RBAC**: JWT and HttpOnly cookie support with role-based guards (`admin`, `executive`, `telecaller`).
- **PDF Generation Subsystem**: Integrated PDF generator for Invoices and Receipts using `@pdfme`.
- **Validation**: Strict schema validation powered by `zod`.
- **API Documentation**: Interactive Swagger/OpenAPI documentation at `/api/docs`.
- **Health Probes**: Liveness (`/health`) and database readiness (`/health/ready`) checks.

---

## 🛠️ Setup & Running

### 1. Configure Environment
Copy `.env.example` to `.env` and configure your PostgreSQL database URL:

```env
DATABASE_URL="postgresql://postgres:post%402005@localhost:5432/Crm?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET="your_jwt_secret"
COOKIE_SECRET="your_cookie_secret"
FRONTEND_URL="http://localhost:3000"
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Generate Prisma Client & Push Schema
```bash
pnpm db:generate
pnpm db:push
```

### 4. Seed Database
```bash
pnpm db:seed
```
*Default Admin Credentials:* `admin@elevate.com` / `Admin@123`

### 5. Start Dev Server
```bash
pnpm dev
```
The server will start at `http://localhost:5000`.
Visit `http://localhost:5000/api/docs` for API documentation.

---

## 📁 Project Architecture

```text
src/
├── app.ts                 # Fastify instance builder & plugin registrations
├── server.ts              # Server startup & graceful shutdown
├── config/                # Environment variables and constants
├── plugins/               # Fastify plugins (Prisma, Auth, CORS, Swagger)
├── middleware/            # Auth, RBAC, and centralized Error Handler
├── modules/               # Domain feature modules (Routes, Controllers, Services, Schemas)
│   ├── auth/
│   ├── users/
│   ├── master-data/
│   ├── enquiries/
│   ├── follow-ups/
│   ├── call-logs/
│   ├── admissions/
│   ├── invoices/
│   ├── receipts/
│   ├── expenses/
│   ├── services/
│   ├── job-orders/
│   ├── notifications/
│   ├── dashboard/
│   └── reports/
├── services/pdf/          # PDF rendering engine & template mappers
├── utils/                 # Response envelopes & formatting helpers
├── types/                 # Global TypeScript definitions
└── errors/                # Custom domain errors
```
