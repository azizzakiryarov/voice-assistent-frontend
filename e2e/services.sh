#!/bin/sh
# Runs docker compose for the e2e services, falling back to podman compose on machines without Docker.
set -e
cd "$(dirname "$0")"
if docker compose version >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  exec docker compose -f compose.yml "$@"
fi
# The images are public; an empty config avoids credential helpers from a missing Docker Desktop.
DOCKER_CONFIG="$(mktemp -d)"
export DOCKER_CONFIG
exec podman compose -f compose.yml "$@"
