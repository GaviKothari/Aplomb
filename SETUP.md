# APLOMB — Local & Production Setup Guide

## Cost-Optimised Infrastructure (~$30/mo vs $536/mo)

| Service | Provider | Cost | Link |
|---------|---------|------|------|
| PostgreSQL | Neon (serverless) | Free → $19/mo | neon.tech |
| Redis | Upstash (serverless) | Free → $0.2/100k | upstash.com |
| Backend hosting | Railway | $5/mo | railway.app |
| Frontend hosting | Vercel | Free → $20/mo | vercel.com |
| Auth | Clerk | Free 10k MAU | clerk.com |
| File storage | Cloudflare R2 | Free 10GB | r2.dev |
| Email | Resend | Free 3k/mo | resend.com |
| SMS | MSG91 | ~₹0.15/SMS | msg91.com |
| AI | OpenAI | Pay per use | openai.com |
| **Total** | | **~$30-50/mo** | |

---

## Step 1 — Clone & Install

```bash
# Root project (Next.js frontend)
pnpm install

# Backend
cd backend
pnpm install --ignore-scripts
node node_modules/prisma/build/index.js generate
```

---

## Step 2 — Set up Neon PostgreSQL (Free)

1. Go to https://neon.tech → Create account
2. Create project: **APLOMB** → Region: **ap-south-1 (Mumbai)**
3. Copy the connection string
4. Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:pass@ep-xxxx.ap-south-1.aws.neon.tech/aplomb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxxx.ap-south-1.aws.neon.tech/aplomb?sslmode=require
```

5. Run migrations:
```bash
cd backend
node node_modules/prisma/build/index.js migrate dev --name init
```

---

## Step 3 — Set up Upstash Redis (Free)

1. Go to https://upstash.com → Create account
2. Create database: **aplomb-redis** → Region: **ap-south-1**
3. Copy the Redis URL (format: `rediss://default:xxx@xxx.upstash.io:6380`)
4. Add to `backend/.env`:
```env
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6380
```

---

## Step 4 — Set up Clerk Auth (Free)

1. Go to https://clerk.com → Create application: **APLOMB**
2. Copy keys to `backend/.env`:
```env
CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
```
3. Copy keys to `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
```
4. In Clerk dashboard → Webhooks → Add endpoint:
   - URL: `https://api.aplomb.in/api/v1/auth/webhook/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`

---

## Step 5 — Set up Cloudflare R2 (Free 10GB)

1. Go to https://dash.cloudflare.com → R2 → Create bucket: `aplomb-media`
2. Create API token with R2 Read & Write permissions
3. Add to `backend/.env`:
```env
R2_ACCOUNT_ID=xxxx
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_BUCKET_NAME=aplomb-media
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

---

## Step 6 — Set up OpenAI

1. Go to https://platform.openai.com → API Keys
2. Add to `backend/.env`:
```env
OPENAI_API_KEY=sk-xxxx
```

---

## Step 7 — Full backend .env

Copy `backend/.env.example` to `backend/.env` and fill all values.

---

## Step 8 — Run locally

```bash
# Terminal 1: Backend
cd backend
pnpm start:dev

# Terminal 2: Frontend
pnpm dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:3001
Swagger docs: http://localhost:3001/api/docs

---

## Step 9 — Deploy to Production

### Backend → Railway ($5/mo)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Init: `cd backend && railway init`
4. Set env vars: `railway variables set KEY=VALUE` (for each .env key)
5. Deploy: `railway up`
6. Get URL: `railway domain`

### Frontend → Vercel (Free)

1. Push code to GitHub
2. Connect repo at vercel.com
3. Set env vars in Vercel dashboard:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_API_URL` = Railway URL
4. Deploy → auto on every push to main

### Database Migrations in Production

```bash
cd backend
DATABASE_URL=<production-neon-url> node node_modules/prisma/build/index.js migrate deploy
```

---

## First-Run: Seed Admin User

After deploying, create your first admin user:

1. Sign up via the Clerk-powered sign-in page
2. In Neon console, run:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Then assign roles to other users via the Admin panel in the app.

---

## Environment Variable Checklist

### backend/.env
- [ ] DATABASE_URL
- [ ] DIRECT_URL
- [ ] REDIS_URL
- [ ] CLERK_PUBLISHABLE_KEY
- [ ] CLERK_SECRET_KEY
- [ ] R2_ACCOUNT_ID
- [ ] R2_ACCESS_KEY_ID
- [ ] R2_SECRET_ACCESS_KEY
- [ ] R2_BUCKET_NAME
- [ ] R2_PUBLIC_URL
- [ ] OPENAI_API_KEY
- [ ] RESEND_API_KEY
- [ ] EMAIL_FROM
- [ ] ENCRYPTION_KEY (32-char hex)
- [ ] NODE_ENV

### .env.local (Next.js frontend)
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] CLERK_SECRET_KEY
- [ ] NEXT_PUBLIC_API_URL
- [ ] NEXT_PUBLIC_WS_URL
