# STOP – nur das

**Wichtig:** Gateway auf deinem **Heim-PC** (gleiches WLAN wie der Bambu).  
Cloud-Agent: kein Docker, kein Zugriff auf `192.168.188.23`.

## A) Software-Check

```bash
git fetch origin && git checkout cursor/auto-print-dispatch-da6f && git pull
npm run bambu:go
```

Muss: `✅ SOFTWARE KLAPPT`

## B) Echter Drucker – OHNE Docker

**Terminal 1** (Gateway):
```bash
cd tools/bambu-bridge
cat > .env.bambu.local <<'EOF'
BAMBU_BRIDGE_SECRET=local-test-secret
BAMBU_AUTO_PRINT=false
BAMBU_GATEWAY_URL=http://127.0.0.1:4844
BAMBU_PRINTER_IP=192.168.188.23
BAMBU_PRINTER_ACCESS_CODE=13623236
BAMBU_PRINTER_ID=03900D5A0405958
EOF
chmod +x start-gateway-no-docker.sh start-adapter.sh
./start-gateway-no-docker.sh
```

Browser: http://localhost:4844 – Drucker online?

**Terminal 2** (Adapter):
```bash
cd tools/bambu-bridge
./start-adapter.sh
```

## Docker nur auf dem Heim-PC
Wenn Docker Desktop installiert ist:
```bash
docker compose -f tools/bambu-bridge/docker-compose.yml --env-file tools/bambu-bridge/.env.bambu.local up -d
```
