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

# openssl for Prisma; Chromium deps; tesseract-ocr + hin/eng models for OCR;
# poppler-utils for pdftoppm (PDF→image before Tesseract)
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
    tesseract-ocr \
    tesseract-ocr-hin \
    tesseract-ocr-eng \
    poppler-utils \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
COPY start.sh ./

EXPOSE 3001

CMD ["sh", "start.sh"]
