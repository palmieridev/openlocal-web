# syntax=docker/dockerfile:1
# Frontend image for the k8s dev environment (NOT used by Vercel prod, which
# builds with the @astrojs/vercel adapter). Here VERCEL is unset, so
# astro.config.mjs selects the @astrojs/node standalone adapter.
#
# NOTE: PUBLIC_* vars are baked into the client bundle at build time, so this
# image is environment-specific by design — rebuild per target env.

FROM node:24-alpine AS builder
WORKDIR /app

# Public (client) config, injected at build. pk_test is a public key by design.
ARG PUBLIC_API_BASE_URL
ARG PUBLIC_CLERK_PUBLISHABLE_KEY
ARG PUBLIC_CLERK_SIGN_IN_URL=/login
ARG PUBLIC_CLERK_SIGN_UP_URL=/register
ARG PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
ARG PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
ENV PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL \
    PUBLIC_CLERK_PUBLISHABLE_KEY=$PUBLIC_CLERK_PUBLISHABLE_KEY \
    PUBLIC_CLERK_SIGN_IN_URL=$PUBLIC_CLERK_SIGN_IN_URL \
    PUBLIC_CLERK_SIGN_UP_URL=$PUBLIC_CLERK_SIGN_UP_URL \
    PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL \
    PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

# Non-root runtime user.
RUN addgroup -S openlocal && adduser -S -G openlocal openlocal

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER openlocal
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
