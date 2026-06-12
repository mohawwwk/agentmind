# ──────────────────────────────────────────────
# Stage 1 — Builder: install deps + build everything
# ──────────────────────────────────────────────
FROM node:24-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace manifests and lockfile first (layer-cache deps)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all package manifests before installing
COPY lib/api-spec/package.json          ./lib/api-spec/
COPY lib/api-zod/package.json           ./lib/api-zod/
COPY lib/api-client-react/package.json  ./lib/api-client-react/
COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/agent-ui/package.json    ./artifacts/agent-ui/
COPY scripts/package.json               ./scripts/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy full source
COPY lib/        ./lib/
COPY artifacts/  ./artifacts/
COPY scripts/    ./scripts/

# Regenerate Zod schemas + React Query hooks from OpenAPI spec
RUN pnpm --filter @workspace/api-spec run codegen

# Build the React frontend (BASE_PATH=/ PORT=3000 are build-time only)
RUN PORT=3000 BASE_PATH=/ NODE_ENV=production \
    pnpm --filter @workspace/agent-ui run build

# Build the Express API server via esbuild
RUN pnpm --filter @workspace/api-server run build

# ──────────────────────────────────────────────
# Stage 2 — Production: lean runtime image
# ──────────────────────────────────────────────
FROM node:24-alpine AS production

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace manifests (needed for pnpm --prod install)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install production dependencies only for the API server
RUN pnpm install --prod --filter @workspace/api-server --frozen-lockfile

# Copy the built API server bundle
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

# Copy the built frontend static files
COPY --from=builder /app/artifacts/agent-ui/dist/public ./artifacts/agent-ui/dist/public

# Runtime environment
ENV NODE_ENV=production
ENV PORT=8080
ENV FRONTEND_DIST=/app/artifacts/agent-ui/dist/public

EXPOSE 8080

WORKDIR /app/artifacts/api-server

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
