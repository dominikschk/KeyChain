#!/usr/bin/env node
/**
 * One-Shot lokaler Test: Mock-Gateway + Adapter + Fake-Dispatch.
 * Kein echter Bambu nötig.
 *
 *   npm run test:bambu-local
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const STL = path.join(ROOT, 'fixtures', 'test-keychain.stl');
const SECRET = 'local-test-secret';
const PRINTER_ID = 'MOCK-PRINTER-001';
const GATEWAY_PORT = 4844;
const ADAPTER_PORT = 8787;
const FILES_PORT = 8790;
const INBOX = path.join(ROOT, 'inbox-test');

const children = [];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function start(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  child.stdout.on('data', (d) => process.stdout.write(`[${args[0]?.split('/').pop()}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${args[0]?.split('/').pop()}] ${d}`));
  return child;
}

function cleanup() {
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

async function waitOk(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await sleep(150);
  }
  return false;
}

function startFileServer() {
  const stlBytes = fs.readFileSync(STL);
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/test-keychain.stl')) {
      res.writeHead(200, {
        'Content-Type': 'model/stl',
        'Content-Length': stlBytes.length,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(stlBytes);
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  return new Promise((resolve) => {
    server.listen(FILES_PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  if (!fs.existsSync(STL)) {
    console.error('Fixture fehlt:', STL);
    process.exit(1);
  }
  fs.mkdirSync(INBOX, { recursive: true });

  console.log('1/4 Mock-Gateway starten…');
  start(process.execPath, [path.join(ROOT, 'mock-gateway.mjs')], {
    MOCK_GATEWAY_PORT: String(GATEWAY_PORT),
    BAMBU_PRINTER_ID: PRINTER_ID,
  });

  console.log('2/4 STL-Dateiserver starten…');
  const fileServer = await startFileServer();

  console.log('3/4 NUDAIM-Adapter starten…');
  start(process.execPath, [path.join(ROOT, 'server.mjs')], {
    PORT: String(ADAPTER_PORT),
    BAMBU_GATEWAY_URL: `http://127.0.0.1:${GATEWAY_PORT}`,
    BAMBU_PRINTER_ID: PRINTER_ID,
    BAMBU_BRIDGE_SECRET: SECRET,
    BAMBU_AUTO_PRINT: 'true',
    BAMBU_SLICE: 'true',
    BAMBU_SLICE_POLL_MS: '200',
    BAMBU_SLICE_POLL_MAX: '30',
    BAMBU_INBOX_DIR: INBOX,
  });

  const healthOk = await waitOk(`http://127.0.0.1:${ADAPTER_PORT}/health`);
  if (!healthOk) {
    console.error('Adapter/Health nicht erreichbar');
    cleanup();
    fileServer.close();
    process.exit(1);
  }

  console.log('4/4 Fake QC-Dispatch senden…');
  const payload = {
    event: 'print.dispatch',
    target: 'bambu_lab',
    order_id: 'local-order-1',
    short_id: 'LOCALTEST01',
    order_number: '#LOCAL-1',
    stl_url: `http://127.0.0.1:${FILES_PORT}/test-keychain.stl`,
    print_png_url: null,
    plate_color: '#2A2A2A',
    needs_slice: true,
    file_hints: {
      preferred_name: 'nudaim-LOCALTEST01',
      stl_filename: 'nudaim-LOCALTEST01.stl',
      print_png_filename: null,
    },
    dispatched_at: new Date().toISOString(),
  };

  const res = await fetch(`http://127.0.0.1:${ADAPTER_PORT}/print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': SECRET,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  console.log(JSON.stringify(body, null, 2));

  const inboxStl = path.join(INBOX, 'LOCALTEST01', 'nudaim-LOCALTEST01.stl');
  const ok =
    res.ok &&
    body.ok === true &&
    body.session?.job_id &&
    body.print?.ok === true &&
    fs.existsSync(inboxStl);

  cleanup();
  fileServer.close();

  if (!ok) {
    console.error('\n❌ Lokaler Bambu-Flow fehlgeschlagen');
    process.exit(1);
  }

  console.log('\n✅ Lokaler Test OK');
  console.log('   - STL in Inbox:', inboxStl);
  console.log('   - Mock-Gateway hat Slice + Print angenommen');
  console.log('\nNächster Schritt mit echtem Drucker:');
  console.log('   1. docker compose -f tools/bambu-bridge/docker-compose.yml up -d');
  console.log('   2. http://localhost:4844/settings → Drucker anlegen');
  console.log('   3. .env.bambu.local ausfüllen und Adapter neu starten');
  console.log('   Siehe tools/bambu-bridge/LOCAL_TEST.md');
}

main().catch((e) => {
  console.error(e);
  cleanup();
  process.exit(1);
});
