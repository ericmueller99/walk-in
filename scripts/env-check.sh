#!/usr/bin/env bash
#
# Compare the keys in .env.production against what the running container
# actually has. Deployments drift exactly this way: a compose file carrying an
# inline `environment:` block that was never updated, so a key works locally
# and is missing in production.
#
set -euo pipefail

cd "$(dirname "$0")/.."

SERVER_IP="${SERVER_IP:-216.128.182.35}"
SERVER_USER="${SERVER_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_IP}"
SERVICE="${SERVICE:-walk-in}"
LOCAL_ENV="${LOCAL_ENV:-.env.production}"

[ -f "${LOCAL_ENV}" ] || { echo "!! ${LOCAL_ENV} not found" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "${tmp}"' EXIT

sed -E 's/=.*//' "${LOCAL_ENV}" | grep -E '^[A-Z]' | sort -u > "${tmp}/local"
ssh -o ConnectTimeout=15 "${SERVER}" "docker exec ${SERVICE} env" \
  | sed -E 's/=.*//' | sort -u > "${tmp}/remote"

missing="$(comm -23 "${tmp}/local" "${tmp}/remote")"

if [ -n "${missing}" ]; then
  echo "!! present in ${LOCAL_ENV} but MISSING from the ${SERVICE} container:"
  echo "${missing}" | sed 's/^/    /'
  exit 1
fi

echo "==> All $(wc -l < "${tmp}/local" | tr -d ' ') keys from ${LOCAL_ENV} are set in the container"
