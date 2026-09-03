# CodeClever Production Deployment & Architecture Manual

This guide provides complete instructions for deploying, configuring, scaling, and migrating the **CodeClever** platform across **TiDB Cloud**, **Cloudinary**, **Render**, and **Vercel / Netlify** with custom domains (`https://codeclever.com` and `https://api.codeclever.com`).

---

## Table of Contents
1. [Local Development](#1-local-development)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [TiDB Cloud Database Setup](#3-tidb-cloud-database-setup)
4. [TiDB TLS/SSL Configuration](#4-tidb-tlsssl-configuration)
5. [Cloudinary Setup & Optimization](#5-cloudinary-setup--optimization)
6. [ALTCHA Proof-of-Work Setup](#6-altcha-proof-of-work-setup)
7. [Render Backend Deployment (512MB RAM Optimization)](#7-render-backend-deployment-512mb-ram-optimization)
8. [Vercel Frontend Deployment](#8-vercel-frontend-deployment)
9. [Netlify Frontend Deployment](#9-netlify-frontend-deployment)
10. [Custom Domain Setup (`codeclever.com`)](#10-custom-domain-setup-codeclevercom)
11. [DNS Record Configuration](#11-dns-record-configuration)
12. [API Subdomain Configuration (`api.codeclever.com`)](#12-api-subdomain-configuration-apicodeclevercom)
13. [CORS & Security Origin Configuration](#13-cors--security-origin-configuration)
14. [UptimeRobot & `/health` Monitoring](#14-uptimerobot---health-monitoring)
15. [Production Security Checklist](#15-production-security-checklist)
16. [Database Backup & Recovery](#16-database-backup--recovery)
17. [Future Migration: Leaving Render for VPS/AWS](#17-future-migration-leaving-render-for-vpsaws)
18. [Future Migration: Vercel ↔ Netlify](#18-future-migration-vercel---netlify)
19. [Future Migration: TiDB Cloud to Standard MySQL/PostgreSQL](#19-future-migration-tidb-cloud-to-standard-mysqlpostgresql)

---

## 1. Local Development

### Prerequisites
- Node.js 18+ or 20+
- MySQL 8.0+ or TiDB Cloud Serverless instance

### Steps
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your local database credentials:
   ```bash
   cp .env.example .env
   ```
3. Run the database schema initialization:
   ```bash
   mysql -u root -p code_clever < database/schema.sql
   ```
4. Start development servers:
   ```bash
   # Terminal 1: Backend API
   npm run server

   # Terminal 2: Frontend Vite
   npm run dev
   ```

---

## 2. Environment Variables Reference

| Variable | Required | Purpose | Example / Default |
|---|---|---|---|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | No | Express listening port | `4000` (Local) / `10000` (Render) |
| `DATABASE_HOST` | Yes | TiDB Cloud / MySQL Host | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `DATABASE_PORT` | Yes | TiDB Cloud / MySQL Port | `4000` (TiDB) / `3306` (MySQL) |
| `DATABASE_USER` | Yes | Database username | `xxxxxx.root` |
| `DATABASE_PASSWORD` | Yes | Database password | `StrongSecretPass123!` |
| `DATABASE_NAME` | Yes | Database schema name | `code_clever` |
| `DATABASE_SSL` | Yes | Enable TLS/SSL connection | `true` |
| `JWT_SECRET` | Yes | Token cryptographic signing key | 64+ char random string |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins | `https://codeclever.com,http://localhost:5173` |
| `FRONTEND_URL` | Yes | Main website base URL | `https://codeclever.com` |
| `VITE_API_BASE_URL` | Yes | Frontend API endpoint | `https://api.codeclever.com/api` |
| `CLOUDINARY_CLOUD_NAME`| Yes | Cloudinary cloud identifier | `codeclever-media` |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API access key | `123456789012345` |
| `CLOUDINARY_API_SECRET`| Yes | Cloudinary secret key | `abcdefghijklmnopqrstuv` |
| `ALTCHA_HMAC_KEY` | Yes | ALTCHA PoW signing secret | 64+ char random string |
| `ALTCHA_DIFFICULTY` | No | PoW solution difficulty | `50000` |

---

## 3. TiDB Cloud Database Setup

1. Sign up or log into [TiDB Cloud](https://tidbcloud.com).
2. Create a **Serverless TiDB Cluster** (Free tier available).
3. In the Cluster Overview, click **Connect**:
   - Select **Connection Type: Node.js (mysql2)**.
   - Note down the `Host`, `Port` (usually `4000`), `User`, and generate a secure password.
4. Execute `database/schema.sql` via TiDB Cloud SQL Editor or MySQL CLI:
   ```bash
   mysql -u '<USER>' -h '<HOST>' -P 4000 -p --ssl-mode=VERIFY_IDENTITY < database/schema.sql
   ```

---

## 4. TiDB TLS/SSL Configuration

- In `server/db.js`, TLS 1.2+ is automatically enabled when `DATABASE_SSL=true` or when connecting to `*.tidbcloud.com`.
- TiDB Cloud uses public certificates signed by standard Web PKI CAs (Let's Encrypt / DigiCert), so Node.js native trust store validates the connection securely without requiring manual CA file bundling.

---

## 5. Cloudinary Setup & Optimization

1. Create an account at [Cloudinary](https://cloudinary.com).
2. Retrieve your **Cloud Name**, **API Key**, and **API Secret** from the Cloudinary Dashboard.
3. Configure them in Render / `.env`.
4. **Memory-Safe Architecture**:
   - The backend never writes media files to local disk.
   - Incoming files are parsed via `multer.memoryStorage()` (max 5MB limit).
   - The file buffer is streamed directly into Cloudinary using `cloudinary.uploader.upload_stream` and immediately garbage-collected.
   - Transformations automatically apply `quality: 'auto:good'`, `fetch_format: 'auto'`, and `width: 1200` to compress receipt images down to under 300KB.

---

## 6. ALTCHA Proof-of-Work Setup

- **Self-Hosted Cryptographic Verification**:
  - Requires zero third-party API calls.
  - Challenges are generated at `GET /api/altcha-challenge` using HMAC-SHA256.
  - Verification runs server-side in `server/services/altcha.js`.
- **Replay Protection**:
  - Solved challenge signatures are recorded in an in-memory TTL registry.
  - Duplicate submissions of the same challenge are rejected immediately.
  - Expired entries are automatically swept every 60 seconds to prevent memory growth.

---

## 7. Render Backend Deployment (512MB RAM Optimization)

### Web Service Configuration
1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Web Service**:
   - **Name**: `codeclever-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node --max-old-space-size=384 server.js`
   - **Plan**: `Free` (512MB RAM)
3. Set the Environment Variables from Section 2 in the Render Dashboard.
4. Set **Health Check Path** to `/health`.
5. **Memory Tuning Explanation**:
   - The `--max-old-space-size=384` flag constrains Node.js V8 heap allocation to 384MB, leaving plenty of headroom for native buffers, OpenSSL TLS, and the OS inside the 512MB container.
   - Database queries use streamable arrays and avoid storing duplicate global state.

---

## 8. Vercel Frontend Deployment

1. Connect your repository to [Vercel](https://vercel.com).
2. Set **Framework Preset**: `Vite`.
3. Set **Build Command**: `npm run build`.
4. Set **Output Directory**: `dist`.
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://api.codeclever.com/api`
6. Deploy. `vercel.json` will automatically manage client-side SPA routing.

---

## 9. Netlify Frontend Deployment

1. Connect your repository to [Netlify](https://netlify.com).
2. Set **Build command**: `npm run build`.
3. Set **Publish directory**: `dist`.
4. Under **Site Configuration → Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://api.codeclever.com/api`
5. Deploy. `netlify.toml` handles redirects and asset caching headers.

---

## 10. Custom Domain Setup (`codeclever.com`)

### In Vercel / Netlify:
1. Go to **Settings → Domains**.
2. Add `codeclever.com` and `www.codeclever.com`.

### In Render:
1. Go to **Settings → Custom Domains**.
2. Add `api.codeclever.com`.

---

## 11. DNS Record Configuration

Configure your DNS provider (e.g., Cloudflare, Namecheap, GoDaddy):

| Type | Name | Value / Target | Proxy / TTL |
|---|---|---|---|
| `A` | `@` | Vercel IP `76.76.21.21` (or Netlify IP) | Auto |
| `CNAME` | `www` | `cname.vercel-dns.com.` | Auto |
| `CNAME` | `api` | `codeclever-api.onrender.com.` | DNS Only |

---

## 12. API Subdomain Configuration (`api.codeclever.com`)

- After Render issues the SSL certificate for `api.codeclever.com`:
- Update `CORS_ORIGIN` on Render to: `https://codeclever.com,https://www.codeclever.com`
- Set `VITE_API_BASE_URL` on the frontend host to: `https://api.codeclever.com/api`

---

## 13. CORS & Security Origin Configuration

- The backend strictly verifies incoming `Origin` headers against the `CORS_ORIGIN` environment variable.
- Authenticated cookie/header requests with `credentials: true` are permitted only for verified domains.
- Wildcard `*` is explicitly disabled in production.

---

## 14. UptimeRobot & `/health` Monitoring

Render free tier services spin down after 15 minutes of inactivity. To keep the service warm:
1. Register at [UptimeRobot](https://uptimerobot.com).
2. Create an **HTTP(s) Monitor**:
   - **URL**: `https://api.codeclever.com/health`
   - **Monitoring Interval**: Every 5 or 10 minutes.
   - **Accepted HTTP Status**: `200 OK`.

The `/health` endpoint performs a lightweight `SELECT 1` query to verify database health and outputs process uptime and memory usage metrics.

---

## 15. Production Security Checklist

- [x] Passwords hashed with `bcryptjs` (salt rounds: 12).
- [x] JWT signed with a 64+ char random secret.
- [x] Tiered rate limiting active on `/api/` and strict on sensitive authentication/financial routes.
- [x] Helmet security headers active (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`).
- [x] MySQL prepared statements (`pool.execute`) used everywhere to prevent SQL injection.
- [x] ACID database transactions with row-level locks (`SELECT ... FOR UPDATE`) on all wallet and balance operations.
- [x] Idempotency protection prevents duplicate submissions on withdrawals/deposits.
- [x] Maximum file upload size hard-capped at 5MB with MIME type whitelist.
- [x] Browser autofill prevented on sensitive security inputs.
- [x] ALTCHA Proof-of-Work human verification protected against challenge replay attacks.
- [x] Graceful shutdown traps `SIGTERM` / `SIGINT` to safely drain database connections.

---

## 16. Database Backup & Recovery

1. **Automated TiDB Backups**:
   - In the TiDB Cloud Console, navigate to **Cluster → Backups** and enable Automated Daily Snapshots.
2. **Manual Logical Backup (mysqldump)**:
   ```bash
   mysqldump -u '<USER>' -h '<HOST>' -P 4000 -p --ssl-mode=VERIFY_IDENTITY \
     --single-transaction --quick code_clever > backup_$(date +%Y%m%d).sql
   ```
3. **Point-in-Time Recovery**:
   - TiDB Cloud Serverless supports Point-in-Time Recovery (PITR) to restore to any minute within the retention window.

---

## 17. Future Migration: Leaving Render for VPS/AWS

To migrate the backend from Render to an Ubuntu/Debian VPS (e.g. AWS EC2, DigitalOcean, Hetzner):
1. Install Node.js and PM2:
   ```bash
   sudo npm install -g pm2
   ```
2. Clone repository and install dependencies:
   ```bash
   git clone <repo-url> && cd code-clever && npm install --omit=dev
   ```
3. Create `/etc/systemd/system/codeclever.service` or use PM2:
   ```bash
   pm2 start server.js --name codeclever-api --node-args="--max-old-space-size=512"
   pm2 save && pm2 startup
   ```
4. Set up Nginx reverse proxy with SSL (`certbot --nginx -d api.codeclever.com`).
5. Update DNS record `api.codeclever.com` to point to the new VPS IP. Zero code changes required!

---

## 18. Future Migration: Vercel ↔ Netlify

- Both `vercel.json` and `netlify.toml` are included in the repository.
- Switching between Vercel, Netlify, Cloudflare Pages, or AWS S3/CloudFront only requires setting the `VITE_API_BASE_URL` environment variable during the build.

---

## 19. Future Migration: TiDB Cloud to Standard MySQL/PostgreSQL

- The database layer uses standard ANSI SQL prepared statements through `mysql2/promise`.
- Migrating to AWS RDS MySQL, Google Cloud SQL, PlanetScale, or a self-hosted MySQL 8.0 server only requires updating `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_PORT` in your environment variables.
