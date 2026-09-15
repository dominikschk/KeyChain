#!/usr/bin/env node
/**
 * NUDAIM → bambu-gateway Adapter
 *
 * Nutzt das Open-Source-Projekt leolobato/bambu-gateway
 * (FTPS + MQTT zum Drucker). Wir erfinden kein eigenes Printer-Protokoll.
 *
 * Flow:
 *   NUDAIM QC-Freigabe → dispatch-print Webhook → dieser Adapter
 *   → POST /api/print-sessions (STL) auf bambu-gateway
 *   → optional warten + POST /api/print-sessions/{id}/print
 *
 * Start:
 *   BAMBU_GATEWAY_URL=http://127.0.0.1:4844 \
 *   BAMBU_PRINTER_ID=DEIN_SERIAL \
 *   BAMBU_BRIDGE_SECRET=… \
 *   node tools/bambu-bridge/server.mjs
 *
 * Gateway braucht ORCASLICER_API_URL für STL→Slice.
 * Agent-Druck: ALLOW_AGENT_PRINT=true im Gateway.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const PORT = Number(process.env.PORT || 8787);
const SECRET = (process.env.BAMBU_BRIDGE_SECRET || '').trim();
const INBOX = path.resolve(process.env.BAMBU_INBOX_DIR || path.join(process.cwd(), 'inbox'));
const GATEWAY = (process.env.BAMBU_GATEWAY_URL || 'http://127.0.0.1:4844').replace(/\/$/, '');
const PRINTER_ID = (process.env.BAMBU_PRINTER_ID || '').trim();
const MACHINE_PROFILE = (process.env.BAMBU_MACHINE_PROFILE || '').trim();
const PROCESS_PROFILE = (process.env.BAMBU_PROCESS_PROFILE || '').trim();
const AUTO_PRINT = /^(1|true|yes)$/i.test(process.env.BAMBU_AUTO_PRINT || '');
const SLICE = !/^(0|false|no)$/i.test(process.env.BAMBU_SLICE || 'true');
const POLL_MS = Math.max(1000, Number(process.env.BAMBU_SLICE_POLL_MS || 3000));
const POLL_MAX = Math.max(1, Number(process.env.BAMBU_SLICE_POLL_MAX || 60));

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function downloadToFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status} ${url}`);
  if (!res.body) throw new Error('Leerer Download');
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function gatewayHealth() {
  try {
    const res = await fetch(`${GATEWAY}/api/health`);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, body: await res.json().catch(() => ({})) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function createPrintSession(stlPath, filename) {
  if (!PRINTER_ID) {
    throw new Error('BAMBU_PRINTER_ID fehlt (Serial aus Gateway-Settings)');
  }
  const bytes = await fs.readFile(stlPath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'model/stl' }), filename);
  form.append('printer_id', PRINTER_ID);
  form.append('slice', SLICE ? 'true' : 'false');
  if (MACHINE_PROFILE) form.append('machine_profile', MACHINE_PROFILE);
  if (PROCESS_PROFILE) form.append('process_profile', PROCESS_PROFILE);

  const res = await fetch(`${GATEWAY}/api/print-sessions`, {
    method: 'POST',
    body: form,
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(`print-sessions ${res.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

async function waitUntilSliced(sessionId) {
  for (let i = 0; i < POLL_MAX; i++) {
    const res = await fetch(`${GATEWAY}/api/print-sessions/${encodeURIComponent(sessionId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`session poll ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
    }
    const status = String(data.status || '');
    if (data.sliced || status === 'ready') return data;
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Slice ${status}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error('Slice-Timeout – Job liegt im Gateway, Druck manuell starten');
}

async function startPrint(sessionId) {
  const res = await fetch(`${GATEWAY}/api/print-sessions/${encodeURIComponent(sessionId)}/print`, {
    method: 'POST',
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(`print start ${res.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

async function handleJob(job) {
  if (job?.event !== 'print.dispatch') {
    return { ok: false, error: 'Unerwartetes event' };
  }
  if (job.target && job.target !== 'bambu_lab') {
    return { ok: false, error: `target ${job.target} nicht unterstützt` };
  }
  if (!job.stl_url) {
    return { ok: false, error: 'stl_url fehlt – Bambu braucht die Geometrie' };
  }

  const shortId = String(job.short_id || 'unknown');
  const dir = path.join(INBOX, shortId);
  await fs.mkdir(dir, { recursive: true });

  const hints = job.file_hints || {};
  const stlName = hints.stl_filename || `nudaim-${shortId}.stl`;
  const stlPath = path.join(dir, stlName);
  await downloadToFile(job.stl_url, stlPath);

  if (job.print_png_url && hints.print_png_filename) {
    await downloadToFile(job.print_png_url, path.join(dir, hints.print_png_filename));
  }

  const health = await gatewayHealth();
  if (!health.ok) {
    await fs.writeFile(
      path.join(dir, 'job.json'),
      JSON.stringify({ ...job, received_at: new Date().toISOString(), gateway: health, local_stl: stlPath }, null, 2)
    );
    return {
      ok: false,
      error: 'bambu-gateway nicht erreichbar',
      gateway: health,
      inbox: dir,
      hint: 'Docker: ghcr.io/leolobato/bambu-gateway:latest – siehe tools/bambu-bridge/README.md',
    };
  }

  const session = await createPrintSession(stlPath, stlName);
  const sessionId = session.job_id || session.id;
  let sliceStatus = null;
  let printResult = null;

  if (SLICE && sessionId) {
    try {
      sliceStatus = await waitUntilSliced(sessionId);
    } catch (e) {
      sliceStatus = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (AUTO_PRINT && sessionId && sliceStatus && !sliceStatus.error) {
    printResult = await startPrint(sessionId);
  }

  const result = {
    ok: true,
    inbox: dir,
    gateway_url: GATEWAY,
    session,
    handoff_url: session.handoff_url || null,
    slice: sliceStatus,
    print: printResult,
    auto_print: AUTO_PRINT,
    note: AUTO_PRINT
      ? 'Auftrag an bambu-gateway → FTPS/MQTT → Drucker'
      : 'Session im Gateway angelegt – Druck in der Gateway-UI oder mit BAMBU_AUTO_PRINT=true',
  };

  await fs.writeFile(path.join(dir, 'job.json'), JSON.stringify({ ...job, result }, null, 2));
  console.log(`[nudaim→bambu] ${shortId} session=${sessionId || '?'} auto=${AUTO_PRINT}`);
  return result;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, x-webhook-secret',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    const gw = await gatewayHealth();
    json(res, 200, {
      ok: true,
      service: 'nudaim-bambu-adapter',
      gateway: GATEWAY,
      gateway_ok: gw.ok,
      printer_id: PRINTER_ID || null,
      auto_print: AUTO_PRINT,
      inbox: INBOX,
    });
    return;
  }

  if (req.method === 'POST' && (req.url === '/' || req.url === '/print' || req.url?.startsWith('/print'))) {
    if (SECRET) {
      const got = (req.headers['x-webhook-secret'] || '').toString().trim();
      if (got !== SECRET) {
        json(res, 401, { error: 'Ungültiges Secret' });
        return;
      }
    }
    try {
      const job = await readJson(req);
      const result = await handleJob(job);
      json(res, result.ok ? 200 : 502, result);
    } catch (e) {
      console.error(e);
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : 'Fehler' });
    }
    return;
  }

  json(res, 404, { error: 'not found' });
});

await fs.mkdir(INBOX, { recursive: true });
server.listen(PORT, () => {
  console.log(`[nudaim→bambu] :${PORT} → gateway ${GATEWAY}`);
  console.log(`[nudaim→bambu] printer_id=${PRINTER_ID || '(fehlt)'} auto_print=${AUTO_PRINT}`);
});
