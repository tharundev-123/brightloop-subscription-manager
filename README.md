# 🚀 Brightloop Software — Enterprise Subscription & Billing Engine

> A full-stack, enterprise-grade recurring subscription billing and revenue management system built to simulate and integrate with **Odoo ERP (Subscriptions & Invoicing modules)**. Includes automated idempotent recurring billing runs, mid-cycle plan proration, online card/UPI checkout, automated dunning recovery, usage-based consumption meters, accounting credit notes, and bi-directional Odoo synchronization.

![Tech Stack](https://img.shields.io/badge/Stack-React%2018%20%7C%20Express%20%7C%20Prisma%20%7C%20SQLite-indigo)
![Tests](https://img.shields.io/badge/Tests-22%20Passed%20(100%25)-emerald)
![Architecture](https://img.shields.io/badge/Odoo%20ERP-Synchronized-purple)
![Performance](https://img.shields.io/badge/Benchmark-~5.4ms%20Latency-blue)

---

## 📑 Table of Contents
1. [System Architecture & Stack](#-system-architecture--stack)
2. [Cross-Platform Setup (Mac, Windows, Linux)](#-cross-platform-setup-mac-windows-linux)
3. [Pre-Seeded Demo Accounts (1-Click Login)](#-pre-seeded-demo-accounts-1-click-login)
4. [Enterprise Feature Walkthrough](#-enterprise-feature-walkthrough)
   - [A. Self-Service Customer Portal & Online Checkout](#a-self-service-customer-portal--online-checkout)
   - [B. Mid-Cycle Plan Proration Engine](#b-mid-cycle-plan-proration-engine)
   - [C. Odoo ERP Bi-Directional Synchronization](#c-odoo-erp-bi-directional-synchronization)
   - [D. Automated Dunning & Debt Recovery](#d-automated-dunning--debt-recovery)
   - [E. Idempotent Recurring Billing Runner](#e-idempotent-recurring-billing-runner)
   - [F. Credit Notes, Usage Metering & CSV Exports](#f-credit-notes-usage-metering--csv-exports)
5. [Complete REST API Reference](#-complete-rest-api-reference)
6. [Automated Test Suite & Verification](#-automated-test-suite--verification)
7. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🛠 System Architecture & Stack

| Layer | Technologies & Tools |
|---|---|
| **Frontend UI** | **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, **Lucide React**, **Recharts**, **React Router v6** |
| **Backend API** | **Node.js**, **Express**, **TypeScript** (`tsx`), **Prisma ORM**, **JWT**, **bcryptjs** |
| **Database** | **SQLite** (`dev.db`) with zero-config portability (100% PostgreSQL schema compatible) |
| **Ecosystem Sync** | **Odoo JSON-RPC / XML-RPC Connector** (syncing `res.partner`, `product.template`, `account.move`) |
| **Payment Simulation** | **Stripe / UPI Gateway Engine** with tokenized card authorization and instant reconciliation |
| **Email Service** | **Nodemailer** with auto-generated Ethereal test inbox (instant preview links in console) |
| **Cron Scheduler** | **`node-cron`** running nightly recurring billing runner (`0 0 * * *`) |
| **Document Engine** | **PDFKit** binary streaming generator (`/api/invoices/:id/pdf`) + print stylesheet |

---

## ⚡ Cross-Platform Setup (Mac, Windows, Linux)

### 1. Prerequisites
- **Node.js**: `v18.0.0` or later (tested on Node `v20.x`, `v22.x`, and `v25.x`)
- **npm**: `v9.0.0` or later
- **Git**

---

### 2. Quick Setup (1 Single Command)
Clone the repository and run the automated setup command from the project root:

```bash
# 1. Clone repository
git clone https://github.com/your-org/brightloop-subscription-manager.git
cd brightloop-subscription-manager

# 2. Setup environment file (if not present)
# Windows (PowerShell):
Copy-Item .env.example backend/.env

# macOS / Linux (Bash):
cp .env.example backend/.env

# 3. Install dependencies, generate database, and populate 1,000+ demo records
npm run setup
```

> **What `npm run setup` executes behind the scenes:**
> 1. Installs root, backend, and frontend npm packages.
> 2. Pushes Prisma schema to `backend/dev.db` and generates Prisma client.
> 3. Populates **1,050+ subscriptions**, **600+ invoices**, **461+ payments**, and **53 user accounts** across 50 realistic business customers.

---

### 3. Launching the Local Application
Run both backend and frontend concurrently in two separate terminal windows:

#### **Terminal 1: Backend API Server**
```bash
npm run dev:backend
```
- API will start on: **`http://localhost:5000`**
- Health check available at: **`http://localhost:5000/api/health`**
- Nightly billing scheduler initialized (`0 0 * * *`)

#### **Terminal 2: Frontend Vite Application**
```bash
npm run dev:frontend
```
- Application will open at: **`http://localhost:5173`**
- All API calls are automatically proxied from `/api` to port 5000.

---

## 🔑 Pre-Seeded Demo Accounts (1-Click Login)

The login screen at **`http://localhost:5173/login`** provides convenient **1-Click Demo Buttons** for each role:

| Role | Email | Password | Privileges & Workspace Access |
|---|---|---|---|
| **Admin** | `admin@brightloop.io` | `Password123!` | Full control: Pricing plans, product SKUs, tax rules, coupons, staff accounts, financial ledger. |
| **Staff** | `staff1@brightloop.io` | `Password123!` | Day-to-day operations: Quotations, customer subscriptions, manual billing run, payment entries. |
| **Customer** | `contact@acmecorp.com` | `Password123!` | Self-service portal: Active tier, consumption meters, 1-click online checkout, PDF invoices. |

---

## 🌟 Enterprise Feature Walkthrough

### A. Self-Service Customer Portal & Online Checkout
- **URL**: `http://localhost:5173/portal` (Log in as Customer `contact@acmecorp.com`)
- **Features**:
  - **Hero Tier Card**: Live subscription status badge, renewal date countdown, and plan perks.
  - **Consumption Meters**: Visual usage bars for **API Invocations** (e.g. 28,400 / 50,000), **Cloud Storage** (42 GB / 100 GB), and **User Seats** (12 / 20).
  - **Instant Online Checkout**: Click **"Pay Now"** on any unpaid invoice to open the simulated **Stripe / Card / UPI Checkout Modal**. Use the **"Auto-fill Test Card"** button for instant payment settlement (`PAID` status, zero balance, gateway transaction receipt).
  - **PDF Invoice Downloads**: Instant one-click binary PDF invoice streaming.

---

### B. Mid-Cycle Plan Proration Engine
- **Odoo Subscriptions Equivalent**: Dynamic recalculation when customers change tier mid-cycle.
- **How to Test**:
  1. Go to **Subscriptions** (or Customer Portal) and click **"Upgrade / Change Tier"**.
  2. Select a higher or lower plan (e.g., from *Starter $49/mo* to *Scale $149/mo*).
  3. The **Proration Financial Ledger** automatically computes:
     - Days remaining vs days used in the active 30-day billing month.
     - **Unused Credit** for the remaining days of the old plan (`-$XX.XX`).
     - **Prorated Charge** for the remaining days of the new plan (`+$YY.YY`).
     - **Net Prorated Adjustment**: If positive, issues an immediate prorated adjustment invoice; if negative, issues a credit note!

---

### C. Odoo ERP Bi-Directional Synchronization
- **Module Equivalent**: `sale.subscription` $\leftrightarrow$ `account.move` / `res.partner`.
- **How to Test**:
  1. Click the **"Odoo Sync"** button in the top navigation or sidebar.
  2. The **Odoo Synchronization Hub** shows active connection status to Odoo ERP.
  3. Click **"Sync Now"**:
     - Synchronizes Customers $\to$ `res.partner`
     - Synchronizes Products & Variants $\to$ `product.template`
     - Synchronizes Confirmed & Paid Invoices $\to$ `account.move` journal entries
  4. View the live sync ledger with mapped Odoo IDs and timestamps.

---

### D. Automated Dunning & Debt Recovery
- **Workflow**:
  - **Due Date Passed**: Subscription tagged with `REMINDER_SENT`.
  - **7 Days Overdue**: Auto-tagged with `PAST_DUE`.
  - **14 Days Overdue**: Auto-tagged with `SUSPENDED` and paused (`isPaused = true`).
- **One-Click Actions**:
  - **Run Dunning Recovery Scan**: Click in the Subscriptions page or via `POST /api/subscriptions/dunning/run`.
  - **Send Dunning Email**: Click **"Remind"** on any overdue invoice to dispatch a formal email notice containing an instant 1-click payment link.

---

### E. Idempotent Recurring Billing Runner
- **Idempotency Guarantee**: Enforced by SQLite / PostgreSQL composite unique constraint:
  ```prisma
  @@unique([subscriptionId, billingPeriod])
  ```
- **How to Test**:
  1. Go to **Invoices & Billing** $\to$ Click **"Run Billing Engine Now"**.
  2. The billing engine scans all active subscriptions due for billing, generates sequential `INV-XXXXX` invoices, and calculates applicable taxes and coupon discounts.
  3. Running the cycle a second time processes **0 duplicate invoices** and safely logs skips, preventing double-billing.

---

### F. Credit Notes, Usage Metering & CSV Exports
- **Credit Notes**: Staff can issue formal accounting credit notes against any confirmed or paid invoice (`CreditNoteModal`), reducing receivables and updating customer balances.
- **Usage Metering**: Ingest consumption events via `POST /api/usage/events` (`api_calls`, `storage_gb`, `seats`) and inspect aggregated totals.
- **CSV Data Exports**: One-click download of full datasets for Subscriptions, Invoices, and Payments register directly from the sidebar or dashboard.

---

## 📡 Complete REST API Reference

### 🔐 Authentication & RBAC
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new customer account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/forgot-password` | Generate single-use password reset token |
| `POST` | `/api/auth/reset-password` | Set new password with valid token |

### 📋 Subscriptions & Proration
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/subscriptions` | Paginated subscription list (with search & filters) |
| `GET` | `/api/subscriptions/:id` | Detailed subscription record with line items |
| `POST` | `/api/subscriptions` | Create custom subscription |
| `POST` | `/api/subscriptions/from-template` | Instant 1-click instantiation from template |
| `PUT` | `/api/subscriptions/:id/status` | Advance lifecycle state (`DRAFT` $\to$ `ACTIVE`) |
| `GET` | `/api/subscriptions/:id/preview-proration` | Compute remaining days, credits & net prorated adjustment |
| `POST` | `/api/subscriptions/:id/change-plan` | Execute plan change and generate prorated invoice/credit note |
| `POST` | `/api/subscriptions/dunning/run` | Execute automated dunning scan across overdue accounts |
| `POST` | `/api/subscriptions/dunning/remind` | Dispatch overdue email notice with pay link |

### 🧾 Invoices, Payments & Online Checkout
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/invoices` | List invoices (filter by status, overdue, search) |
| `GET` | `/api/invoices/:id/pdf` | Stream binary PDF invoice generated via PDFKit |
| `POST` | `/api/invoices/billing-run/trigger` | Trigger manual idempotent recurring billing run |
| `POST` | `/api/payments/checkout` | Instant online payment (Stripe Card / UPI simulation) |
| `POST` | `/api/payments` | Record manual payment (CASH, CARD, UPI, BANK_TRANSFER) |
| `GET` | `/api/payments` | View historical payment receipts register |

### 🔄 Odoo Sync, Credit Notes, Usage & Exports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/odoo/status` | Check Odoo connector status and credentials |
| `POST` | `/api/odoo/sync` | Trigger full bi-directional Odoo ERP synchronization |
| `GET` | `/api/credit-notes` | List issued accounting credit notes |
| `POST` | `/api/credit-notes` | Issue credit note against an invoice |
| `POST` | `/api/usage/events` | Ingest metered usage consumption events |
| `GET` | `/api/usage/:subscriptionId` | Fetch aggregated usage meters for active cycle |
| `GET` | `/api/audit` | View system activity and audit trail log |
| `GET` | `/api/export/subscriptions.csv` | Download subscriptions dataset as CSV |
| `GET` | `/api/export/invoices.csv` | Download invoices dataset as CSV |
| `GET` | `/api/export/payments.csv` | Download payments dataset as CSV |

---

## 🧪 Automated Test Suite & Verification

The project includes an end-to-end integration and unit test suite powered by **Vitest**:

```bash
# Run backend test suite
npm run test
```

### Verified Test Coverage:
- **Phase 2: Authentication & RBAC**: Password complexity rules, duplicate prevention, reset token lifecycle, role isolation.
- **Phase 3: Catalog, Plans, Taxes & Discounts**: Product variants, plan cadences, tax percentages, promo limits.
- **Phase 4: Subscriptions State Flow**: Strict state transitions (`DRAFT` $\to$ `QUOTATION` $\to$ `CONFIRMED` $\to$ `ACTIVE` $\to$ `CLOSED`), pause/resume toggling.
- **Phase 5: Invoicing Engine & Strict Idempotency**: Automated billing calculation, skipping duplicate periods gracefully, concurrent safety.
- **Phase 6: Payments & Partial Payment Closure**: Partial payments, overpayment prevention, automatic transition to `PAID`.

```
 Test Files  5 passed (5)
      Tests  22 passed (22)
   Duration  7.96s
```

---

## ❓ Troubleshooting & FAQ

### 1. Port 5000 or 5173 is already in use
- Change the backend port in `backend/.env` (e.g. `PORT=5001`).
- If you change the backend port, update the proxy target in `frontend/vite.config.ts`.

### 2. SQLite Database File Permission on Windows
- If you encounter a database file lock when stopping and restarting services, terminate any lingering `node` processes:
  ```powershell
  # Windows PowerShell
  Stop-Process -Name node -Force
  ```
  ```bash
  # macOS / Linux
  pkill -f node
  ```

### 3. Migrating to PostgreSQL for Production
To migrate from SQLite to PostgreSQL:
1. Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `DATABASE_URL` in `backend/.env` to your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/brightloop?schema=public"
   ```
3. Run `npx prisma db push` from the `backend/` directory.

---

*Engineered for Brightloop Software — Enterprise Odoo Subscription Management & Billing Architecture.*
