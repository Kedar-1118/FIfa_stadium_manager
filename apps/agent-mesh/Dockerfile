# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./

RUN npm ci

COPY src/ ./src

RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8001

ENV NODE_ENV=production

# Change ownership to non-root user
RUN chown -R node:node /usr/src/app

USER node

CMD ["node", "dist/server.js"]

