# syntax=docker/dockerfile:1
#
# walk-in production image. Built for linux/amd64 by scripts/build.sh and
# streamed to the server by scripts/deploy.sh -- never pulled from a registry.
#
# Node 18 to match .nvmrc (18.19.0). Next 12.2.5 is fine on 18.

FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat git
RUN apk --no-cache add --virtual .builds-deps build-base python3

# hollyburn-lib is declared as github:, which the lockfile records as git+ssh.
# The repository is public, so rewrite SSH GitHub URLs to HTTPS and fetch
# without credentials.
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
 && git config --global --add url."https://github.com/".insteadOf "git@github.com:"

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# .env.production is deliberately part of the build context (see .dockerignore)
# so `next build` picks it up here.
RUN npm run build

# Production image, copy all the files and run next
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3004
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Ship .env.production into the runtime image as well, so the container has its
# config even if compose is started without an env_file.
COPY --from=builder --chown=nextjs:nodejs /app/.env.production ./.env.production

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3004

CMD ["node", "server.js"]
