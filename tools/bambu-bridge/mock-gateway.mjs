#!/usr/bin/env node
/**
 * Minimal-Mock von bambu-gateway für lokale Tests ohne echten Drucker.
 * Endpoints: /api/health, /api/print-sessions, /api/print-sessions/:id, …/print
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.MOCK_GATEWAY_PORT || 4844);
const jobs = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

async function readRaw(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

function parseMultipart(buf, contentType) {
  const m = /boundary=(.+)$/i.exec(contentType || '');
  if (!m) return { fields: {}, file: null };
  const boundary = m[1].trim();
  const parts = buf.toString('binary').split(`--${boundary}`);
  const fields = {};
  let file = null;
  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--') continue;
    const sep = part.indexOf('\r\n\r\n');
    if (sep < 0) continue;
    const head = part.slice(0, sep);
    let body = part.slice(sep + 4);
    if (body.endsWith('\r\n')) body = body.slice(0, -2);
    const nameMatch = /name="([^"]+)"/i.exec(head);
    const fileMatch = /filename="([^"]+)"/i.exec(head);
    if (!nameMatch) continue;
    if (fileMatch) {
      file = {
        field: nameMatch[1],
        filename: fileMatch[1],
        size: Buffer.from(body, 'binary').length,
      };
    } else {
      fields[nameMatch[1]] = body.replace(/\r\n$/, '');
    }
  }
  return { fields, file };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    json(res, 200, { ok: true, service: 'bambu-gateway-mock', printers: 1 });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/printers') {
    json(res, 200, {
      printers: [
        {
          id: process.env.BAMBU_PRINTER_ID || 'MOCK-PRINTER-001',
          name: 'Mock Bambu',
          online: true,
          state: 'idle',
        },
      ],
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/print-sessions') {
    const raw = await readRaw(req);
    const { fields, file } = parseMultipart(raw, req.headers['content-type']);
    if (!file) {
      json(res, 400, { detail: 'file is required' });
      return;
    }
    const id = randomUUID();
    const slice = String(fields.slice || 'false').toLowerCase() === 'true';
    const job = {
      id,
      status: slice ? 'slicing' : 'ready',
      sliced: !slice,
      printer_id: fields.printer_id || 'MOCK-PRINTER-001',
      filename: file.filename,
      bytes: file.size,
      created_at: Date.now(),
      handoff_url: `http://127.0.0.1:${PORT}/mock-handoff/${id}`,
      printed: false,
    };
    jobs.set(id, job);
    if (slice) {
      setTimeout(() => {
        const j = jobs.get(id);
        if (j) {
          j.status = 'ready';
          j.sliced = true;
        }
      }, 400);
    }
    json(res, 200, {
      job_id: id,
      sliced: slice,
      handoff_url: job.handoff_url,
    });
    return;
  }

  const sessionMatch = url.pathname.match(/^\/api\/print-sessions\/([^/]+)(\/print)?$/);
  if (sessionMatch) {
    const id = decodeURIComponent(sessionMatch[1]);
    const job = jobs.get(id);
    if (!job) {
      json(res, 404, { detail: 'Session not found' });
      return;
    }
    if (req.method === 'GET' && !sessionMatch[2]) {
      json(res, 200, {
        job_id: job.id,
        status: job.status,
        sliced: job.sliced,
        printer_id: job.printer_id,
        handoff_url: job.handoff_url,
      });
      return;
    }
    if (req.method === 'POST' && sessionMatch[2] === '/print') {
      if (!job.sliced || job.status !== 'ready') {
        json(res, 409, { detail: `Job is ${job.status}, not printable` });
        return;
      }
      job.printed = true;
      job.status = 'printing';
      json(res, 200, {
        ok: true,
        job_id: job.id,
        printer_id: job.printer_id,
        message: 'mock print started (kein echter Drucker)',
      });
      return;
    }
  }

  json(res, 404, { detail: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-gateway] http://127.0.0.1:${PORT}`);
});
