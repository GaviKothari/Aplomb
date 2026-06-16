# ── Build stage ───────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY prisma ./prisma/

# puppeteer-core never auto-downloads Chrome — no skip env needed
RUN npm install --legacy-peer-deps

RUN npx prisma generate

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# openssl for Prisma; remaining packages are the minimal set @sparticuz/chromium needs on Debian Bookworm
RUN apt-get update && apt-get install -y \
    openssl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3001

CMD ["node", "dist/main"]
