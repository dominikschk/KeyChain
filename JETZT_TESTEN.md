# STOP – nur das

**Wichtig:** Gateway auf deinem **Heim-PC** (gleiches WLAN wie der Bambu).  
Cloud-Agent: kein Docker, kein Zugriff auf `192.168.188.x`.

## A) Software-Check

```bash
git fetch origin && git checkout cursor/auto-print-dispatch-da6f && git pull
npm run bambu:go
```

Muss: `✅ SOFTWARE KLAPPT`

## B) Echter Drucker – OHNE Docker (Heim-PC)

**Terminal 1** (Gateway):
```bash
cd tools/bambu-bridge
# .env.bambu.local mit IP / Access Code / Serial füllen (nicht committen)
cp -n .env.bambu.local.example .env.bambu.local
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
