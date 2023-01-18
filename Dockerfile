FROM node:16-alpine AS deps

ARG SSH_PRIVATE
RUN apk add --no-cache libc6-compat
RUN apk --no-cache add --virtual .builds-deps build-base python3
RUN apk add git openssh-client

WORKDIR /app

COPY package.json package-lock.json ./
COPY salesforce-connect-deploy .
RUN chmod 600 salesforce-connect-deploy
RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN ssh-agent sh -c 'ssh-add salesforce-connect-deploy && ssh-keyscan -H github.com >> /etc/ssh/ssh_known_hosts ; npm ci'
#RUN ssh-agent sh -c 'echo $SSH_PRIVATE | base64 -d | ssh-add - ; npm ci'

#RUN npm install

# Rebuild the source code only when needed
FROM node:16-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# You only need to copy next.config.js if you are NOT using the default configuration
# COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3004

ENV PORT 3004

CMD ["node", "server.js"]
