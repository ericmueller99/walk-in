#!/usr/bin/env bash
#
# Build the walk-in image for the deploy target.
#
# The build host is arm64 (Apple Silicon) and the server is x86_64, so the
# image is always built for linux/amd64 regardless of where this runs.
#
# .env.production must be present: the Dockerfile copies it into the runtime
# image, and `next build` reads it during the build.
#
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-hollyburnproperties/walk-in}"
TAG="${TAG:?TAG is required (set by the Makefile)}"
PLATFORM="${PLATFORM:-linux/amd64}"
LOCAL_ENV="${LOCAL_ENV:-.env.production}"

[ -f "${LOCAL_ENV}" ] || {
  echo "!! ${LOCAL_ENV} not found -- it is not in git. Run 'make check-env' for what it needs." >&2
  exit 1
}

# The old Dockerfile needed this key to fetch salesforce-connect over SSH. The
# git deps are public and now come over HTTPS, so a stale key lying around is
# only a way to leak it into a build context.
if [ -f salesforce-connect-deploy ]; then
  echo "   note: salesforce-connect-deploy is present but no longer used (and is .dockerignored)"
fi

echo "==> Building ${IMAGE}:${TAG} for ${PLATFORM}"

# --provenance/--sbom off: attestations turn the result into a manifest list,
# which `docker save | docker load` on the server cannot ingest.
docker buildx build \
  --platform "${PLATFORM}" \
  --provenance=false \
  --sbom=false \
  --tag "${IMAGE}:${TAG}" \
  --tag "${IMAGE}:latest" \
  --load \
  .

# Note: on Apple Silicon you cannot usefully run the resulting amd64 image
# locally -- node wedges under Docker Desktop's Rosetta emulation (the process
# starts but never binds its port, with no log output). To smoke-test the image
# on this machine, rebuild it for the native arch:
#     docker buildx build --platform linux/arm64 -t walk-in:native --load .
# The deploy target is native x86_64, where the amd64 image runs normally.

echo "==> Built:"
docker images "${IMAGE}" --format '    {{.Repository}}:{{.Tag}}  {{.Size}}  {{.CreatedSince}}'
