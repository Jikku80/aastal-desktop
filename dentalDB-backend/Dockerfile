# ── Base: install prod deps only ────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Build: compile TypeScript ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Development: full deps + source mounted via volume ───────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
RUN npm install -g @nestjs/cli
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# ── Production: minimal image ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY package*.json ./
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["node", "dist/main"]
