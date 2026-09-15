#!/usr/bin/env bash
# Adapter starten (Heim-PC, gleiches Netz wie Drucker)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ROOT}/.env.bambu.local"
set -a && source "$ENV_FILE" && set +a
export BAMBU_GATEWAY_URL="${BAMBU_GATEWAY_URL:-http://127.0.0.1:4844}"
export PORT="${PORT:-8787}"
cd "$ROOT"
exec node server.mjs
