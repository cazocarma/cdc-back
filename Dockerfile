# ══════════════════════════════════════════════════════════
#  CDC Backend — Multi-stage Docker build
#  Alineado con PLATFORM_INTEGRATION_SPEC §7.1 (Node 22 LTS + Debian slim).
#
#  Stages:
#    - deps    : node_modules de runtime (--omit=dev)
#    - builder : deps completas + tsc → /app/dist (para prd)
#    - dev     : hereda builder; CMD `tsx watch` (fuente via bind mount
#                desde docker-compose.dev.yml). No hace install en runtime.
#    - runtime : imagen prd minima (deps + dist); non-root `app`
# ══════════════════════════════════════════════════════════

# ── Stage 1: deps (runtime) ───────────────────────────────
FROM node:22-bookworm-slim@sha256:f3a68cf41a855d227d1b0ab832bed9749469ef38cf4f58182fb8c893bc462383 AS deps

WORKDIR /app

RUN groupadd -r app && useradd -r -g app -d /app app

COPY --chown=app:app package.json package-lock.json ./

RUN npm ci --omit=dev --no-audit --no-fund \
  && chown -R app:app /app/node_modules

# ── Stage 2: builder (deps completas + tsc) ───────────────
FROM node:22-bookworm-slim@sha256:f3a68cf41a855d227d1b0ab832bed9749469ef38cf4f58182fb8c893bc462383 AS builder

WORKDIR /app

RUN groupadd -r app && useradd -r -g app -d /app app

COPY --chown=app:app package.json package-lock.json ./

RUN npm ci --no-audit --no-fund

COPY --chown=app:app tsconfig.json ./

COPY --chown=app:app src ./src

RUN npm run build

# ── Stage 3: dev (tsx watch sobre /app/src bind-mounted) ──
FROM builder AS dev

ENV NODE_ENV=development

USER app

EXPOSE 4000

CMD ["npx", "tsx", "watch", "src/index.ts"]

# ── Stage 4: runtime (prd) ────────────────────────────────
FROM node:22-bookworm-slim@sha256:f3a68cf41a855d227d1b0ab832bed9749469ef38cf4f58182fb8c893bc462383 AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    HOSTNAME=0.0.0.0 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -r app && useradd -r -g app -d /app app

COPY --from=deps    --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist         ./dist
COPY --from=builder --chown=app:app /app/package.json ./

USER app

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["dumb-init", "node", "dist/index.js"]
