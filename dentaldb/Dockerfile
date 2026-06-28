# ── Base: install all deps ────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ── Build: compile Next.js ────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ── Development: hot-reload via volume mounts ────────────────────────────────
FROM base AS dev
WORKDIR /app
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Production: standalone server ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static     ./.next/static
COPY --from=build /app/public           ./public
EXPOSE 3000
CMD ["node", "server.js"]
