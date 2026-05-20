# StrataTrade

Compliance and maintenance management platform for the Australian strata industry.

---

## Tech Stack

| Layer    | Technology                                  |
|----------|---------------------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS    |
| Backend  | Node.js, Express, TypeScript                |
| Database | PostgreSQL (Neon managed, raw SQL only)     |
| Storage  | Local filesystem (dev) / AWS S3 / Cloudflare R2 (prod) |
| Email    | Resend                                      |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A PostgreSQL connection string (Neon free tier works; use the Sydney region)

### 1. Clone the repository

```bash
git clone <repo-url>
cd StrataTrade
```

### 2. Configure the server environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in:

| Variable          | Description                                             |
|-------------------|---------------------------------------------------------|
| `DATABASE_URL`    | Your Neon (or any Postgres) connection string           |
| `JWT_SECRET`      | Any random string, minimum 32 characters               |
| `JWT_EXPIRES_IN`  | Token lifetime, e.g. `7d`                              |
| `RESEND_API_KEY`  | From resend.com — leave empty to skip email sending     |
| `EMAIL_FROM`      | Sender address, e.g. `noreply@stratatrade.net`          |
| `APP_URL`         | Frontend URL, e.g. `http://localhost:3000`              |
| `NODE_ENV`        | `development`                                           |
| `STORAGE_DRIVER`  | `local` for dev; `s3` for production                   |

For `s3` storage, also set `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and optionally `S3_ENDPOINT` (for Cloudflare R2).

### 3. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Run database migrations

From the `server` directory:

```bash
npm run migrate
```

This applies all SQL files in `db/migrations/` in order. Safe to re-run — already-applied migrations are skipped.

### 5. Seed test data

```bash
npm run seed
```

Creates test accounts, a sample strata company, schemes, trades, compliance obligations, and a building audit with findings.

### 6. Start the servers

In two separate terminals:

```bash
# Terminal 1 — API server (port 3001)
cd server && npm run dev

# Terminal 2 — Frontend (port 3000)
cd client && npm run dev
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:3001`.

---

## Test Credentials

| Role             | Email                              | Password      |
|------------------|------------------------------------|---------------|
| Admin            | admin@platform.com                 | changeme123   |
| Strata Manager   | jane@harbourviewstrata.com.au      | manager123    |
| Building Manager | tom.nguyen@harbourtower.com.au     | building123   |
| Trade (Electrical) | robert.chen@rcelec.com.au        | trade123      |
| Trade (Fire Safety) | sarah.mitchell@safeguardfs.com.au | trade123   |

> The admin account requires a password change on first login. The seeded trades are already active.

---

## User Roles

| Role             | Portal path  | Access                                                         |
|------------------|--------------|----------------------------------------------------------------|
| Admin            | `/admin`     | Full platform management — schemes, trades, jobs, invoices     |
| Strata Manager   | `/strata`    | Schemes for their company — compliance, quotes, audit reports  |
| Building Manager | `/building`  | Their assigned scheme — maintenance requests, upcoming works   |
| Trade            | `/trade`     | Their own jobs, certificate uploads, quote submissions         |

---

## Key Workflows

### Compliance loop
1. Scheduler runs daily and creates jobs for obligations due within 30 days
2. Admin assigns job to a trade → trade receives email with confirmation link
3. Trade confirms → attends site → uploads compliance certificate + photos via portal
4. Admin approves → strata manager and building manager are notified → certificate appears in building portal

### Audit & quote loop
1. Admin creates a building audit, adds findings (some requiring rectification)
2. Admin creates a quote request for a finding and invites selected trades
3. Trades submit quotes (via email link or portal)
4. Admin marks ready for strata manager review
5. Strata manager accepts a quote → job is created → trade is notified with full address
6. Trade completes works, uploads certificate → admin approves → audit finding marked complete

### Maintenance requests
- Building manager or strata manager submits a request with optional photos
- Admin responds: creates a job (with optional trade and date) or declines with a reason
- Building manager sees the response in their portal

---

## Deployment

### Frontend — Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_URL` is not required — the Vite proxy handles dev; for production set the full backend URL in `client/src/services/api.ts` if not using a proxy

### Backend — Railway

1. Create a new Railway project, connect the repo
2. Set **Root Directory** to `server`
3. Start command: `npm run start`
4. Add all environment variables from `server/.env.example`
5. After first deploy, run migrations via Railway CLI or the deploy logs

---

## Scripts

| Command (run from `server/`)  | Description                                 |
|-------------------------------|---------------------------------------------|
| `npm run dev`                 | Start API server with hot reload (ts-node)  |
| `npm run build`               | Compile TypeScript to `dist/`               |
| `npm run start`               | Run compiled server (production)            |
| `npm run migrate`             | Apply pending database migrations           |
| `npm run seed`                | Run seed data                               |

| Command (run from `client/`)  | Description                                 |
|-------------------------------|---------------------------------------------|
| `npm run dev`                 | Start Vite dev server                       |
| `npm run build`               | Production build to `dist/`                 |
| `npm run preview`             | Preview production build locally            |
