FROM node:20-alpine AS builder
RUN apk add --no-cache git
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs . .
USER nodeuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "src/server.js"]
