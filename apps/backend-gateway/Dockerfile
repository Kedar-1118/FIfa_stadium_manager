# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
COPY prisma/ ./prisma/

RUN npm ci

# Generate prisma types client
RUN npx prisma generate

COPY src/ ./src

RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma/ ./prisma/

RUN npm ci --only=production

# Re-generate prisma client under production packages context
RUN npx prisma generate

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8000

ENV NODE_ENV=production

# Change ownership to non-root user
RUN chown -R node:node /usr/src/app

USER node

CMD ["node", "dist/server.js"]

