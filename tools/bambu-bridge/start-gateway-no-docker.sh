#!/usr/bin/env bash
# Startet bambu-gateway OHNE Docker (Python) – muss auf dem Heim-PC laufen,
# der im gleichen Netz wie der Drucker ist (nicht im Cloud-Agent).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ROOT}/.env.bambu.local"
GW_DIR="${ROOT}/.bambu-gateway-src"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fehlt: $ENV_FILE"
  echo "Kopiere .env.bambu.local.example und trage IP/Code/Serial ein."
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

if [[ -z "${BAMBU_PRINTER_IP:-}" || -z "${BAMBU_PRINTER_ACCESS_CODE:-}" || -z "${BAMBU_PRINTER_ID:-}" ]]; then
  echo "In .env.bambu.local müssen gesetzt sein:"
  echo "  BAMBU_PRINTER_IP, BAMBU_PRINTER_ACCESS_CODE, BAMBU_PRINTER_ID"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 fehlt. Installiere Python 3.12+ oder Docker Desktop."
  exit 1
fi

if [[ ! -d "$GW_DIR/.git" ]]; then
  echo "→ bambu-gateway klonen…"
  git clone --depth 1 https://github.com/leolobato/bambu-gateway.git "$GW_DIR"
fi

echo "→ Dependencies…"
python3 -m pip install -q -r "$GW_DIR/requirements.txt"

export BAMBU_PRINTER_IP
export BAMBU_PRINTER_ACCESS_CODE
export BAMBU_PRINTER_SERIAL="$BAMBU_PRINTER_ID"
export ALLOW_AGENT_PRINT="${ALLOW_AGENT_PRINT:-true}"
export SERVER_PORT="${SERVER_PORT:-4844}"

echo "→ Gateway auf http://127.0.0.1:${SERVER_PORT}"
echo "   Drucker ${BAMBU_PRINTER_IP} / Serial ${BAMBU_PRINTER_ID}"
cd "$GW_DIR"
exec python3 -m app
