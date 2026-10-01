#!/usr/bin/env bash
#
# Ship a locally-built image to the production server and restart the service.
#
# The image is streamed over SSH (docker save | ssh docker load) instead of
# being pushed through Docker Hub. That keeps the deploy working while the
# local Docker CLI is signed in to the wrong account -- nothing is ever
# pushed from here, and the server pulls nothing.
#
# walk-in runs as its own compose project in REMOTE_DIR rather than out of
# /root/docker-compose.yml, because it needs a static IP: nginx-proxy-manager
# forwards to STATIC_IP, so the container has to land on that exact address
# every time. The first deploy takes the container over from whatever compose
# project owns it today (see "Clearing stale containers" below); afterwards,
# delete the old walk-in block from /root/docker-compose.yml so nothing there
# can recreate a competing container on the same address.
#
set -euo pipefail

cd "$(dirname "$0")/.."

SERVER_IP="${SERVER_IP:-216.128.182.35}"
SERVER_USER="${SERVER_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_IP}"
IMAGE="${IMAGE:-hollyburnproperties/walk-in}"
TAG="${TAG:?TAG is required (set by the Makefile)}"
SERVICE="${SERVICE:-walk-in}"
REMOTE_DIR="${REMOTE_DIR:-/root/apps/walk-in}"
COMPOSE_FILE="${COMPOSE_FILE:-${REMOTE_DIR}/docker-compose.yml}"
LOCAL_COMPOSE="${LOCAL_COMPOSE:-docker-compose.prod.yml}"
LOCAL_ENV="${LOCAL_ENV:-.env.production}"
APP_PORT="${APP_PORT:-3004}"
STATIC_IP="${STATIC_IP:-10.10.0.6}"
DOCKER_NET="${DOCKER_NET:-custom bridge}"

SSH_OPTS=(-o ConnectTimeout=15 -o ServerAliveInterval=30)
ssh_run() { ssh "${SSH_OPTS[@]}" "${SERVER}" "$@"; }

if ! docker image inspect "${IMAGE}:${TAG}" >/dev/null 2>&1; then
  echo "!! ${IMAGE}:${TAG} not found locally. Run 'make build' first." >&2
  exit 1
fi
[ -f "${LOCAL_ENV}" ] || { echo "!! ${LOCAL_ENV} not found" >&2; exit 1; }
[ -f "${LOCAL_COMPOSE}" ] || { echo "!! ${LOCAL_COMPOSE} not found" >&2; exit 1; }

echo "==> Target: ${SERVER}  service=${SERVICE}  port=${APP_PORT}  ip=${STATIC_IP}"
ssh_run true || { echo "!! Cannot reach ${SERVER} over SSH" >&2; exit 1; }

ssh_run "docker network inspect '${DOCKER_NET}' >/dev/null 2>&1" || {
  echo "!! Network '${DOCKER_NET}' does not exist on the server" >&2; exit 1; }

# Keep the currently-deployed image around so 'make rollback' has something
# to fall back to.
echo "==> Tagging current release as :previous on the server"
ssh_run "docker image inspect ${IMAGE}:latest >/dev/null 2>&1 \
  && docker tag ${IMAGE}:latest ${IMAGE}:previous \
  || echo '    (no existing :latest, skipping)'"

echo "==> Uploading compose file and ${LOCAL_ENV}"
ssh_run "mkdir -p ${REMOTE_DIR}"
scp -q "${SSH_OPTS[@]}" "${LOCAL_COMPOSE}" "${SERVER}:${COMPOSE_FILE}"
scp -q "${SSH_OPTS[@]}" "${LOCAL_ENV}" "${SERVER}:${REMOTE_DIR}/.env.production"
ssh_run "chmod 600 ${REMOTE_DIR}/.env.production"

echo "==> Streaming ${IMAGE}:${TAG} to the server (this is the slow part)"
docker save "${IMAGE}:${TAG}" "${IMAGE}:latest" \
  | gzip -1 \
  | ssh "${SSH_OPTS[@]}" "${SERVER}" 'gunzip | docker load'

# Two things can hold the name or the static IP hostage:
#
#   1. Compose renames the outgoing container to <shortid>_<service> while it
#      recreates. An interrupted recreate leaves that name behind and every
#      later deploy then dies with "container name is already in use".
#   2. walk-in has been running under the shared /root/docker-compose.yml, so
#      the existing container carries a different compose project label (or
#      none at all, if it was started with plain `docker run`). Compose will
#      not adopt it, and 10.10.0.6 stays occupied until it is removed.
#
echo "==> Clearing stale containers holding the name or ${STATIC_IP}"
ssh_run "docker ps -a --format '{{.Names}}' | grep -E '_${SERVICE}\$' | xargs -r docker rm -f >/dev/null 2>&1 || true; \
  if docker inspect ${SERVICE} >/dev/null 2>&1; then \
    owner=\$(docker inspect -f '{{index .Config.Labels \"com.docker.compose.project\"}}' ${SERVICE} 2>/dev/null || true); \
    if [ \"\$owner\" != \"${SERVICE}\" ]; then \
      echo \"    ${SERVICE} owned by compose project '\${owner:-<none>}' -- removing so this project can take it over\"; \
      docker rm -f ${SERVICE} >/dev/null; \
    fi; \
  fi"

echo "==> Recreating ${SERVICE} from ${COMPOSE_FILE}"
ssh_run "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} -p ${SERVICE} up -d --force-recreate ${SERVICE}"

echo "==> Waiting for ${SERVICE} to report healthy"
for _ in $(seq 1 45); do
  health="$(ssh_run "docker inspect ${SERVICE} --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}'" 2>/dev/null || echo missing)"
  case "${health}" in
    healthy|running) break ;;
    unhealthy) echo "!! ${SERVICE} is unhealthy"; ssh_run "docker logs --tail 40 ${SERVICE}"; exit 1 ;;
  esac
  sleep 2
done

# A wrong IP here means nginx-proxy-manager will 502 even though the container
# itself is fine, so fail loudly rather than leaving it to be discovered later.
ip="$(ssh_run "docker inspect ${SERVICE} --format '{{(index .NetworkSettings.Networks \"${DOCKER_NET}\").IPAddress}}'")"
if [ "${ip}" != "${STATIC_IP}" ]; then
  echo "!! ${SERVICE} came up on ${ip}, but nginx-proxy-manager forwards to ${STATIC_IP}" >&2
  echo "   The site will return 502 until this matches." >&2
  exit 1
fi

echo "==> Post-deploy status"
ssh_run "docker ps --filter name=^/${SERVICE}\$ --format '    {{.Names}}  {{.Image}}  {{.Status}}'"
echo "    ${DOCKER_NET} IP: ${ip} (matches nginx-proxy-manager)"
ssh_run "curl -sf -o /dev/null -w '    HTTP %{http_code} from localhost:${APP_PORT}\n' http://localhost:${APP_PORT}/ || echo '    !! app did not answer on ${APP_PORT}'"

echo "==> Deployed ${IMAGE}:${TAG} to ${SERVER_IP}"
