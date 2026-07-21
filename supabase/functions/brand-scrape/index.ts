// Supabase Edge Function: Brand-Hinweise aus öffentlicher https-Website
// POST { url: "https://…" } → { hints: BrandHints }
// Kein JWT nötig für anon; nur https, kein Redirect-Follow, Timeout, Größenlimit.

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_MICROSITE_HOSTS') ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Hostname-Patterns die nie gefetcht werden (SSRF). */
const BLOCKED_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[::1\]|::1$|0\.0\.0\.0|metadata\.google|metadata\.goog|100\.100\.100\.200)/i;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (BLOCKED_HOST.test(h)) return true;
  // IPv6 unique-local / link-local
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  // Bare IPv4 in dotted form
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((n) => n > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b === 64) return true; // CGNAT
  }
  return false;
}

function safeHttps(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!/^https:\/\//i.test(t) || t.length > 2048) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    if (isBlockedHostname(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function originAllowed(req: Request): boolean {
  if (ALLOWED_ORIGINS.length === 0) return true;
  const origin = (req.headers.get('origin') || '').trim();
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return ALLOWED_ORIGINS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function metaContent(html: string, key: string): string | null {
  const prop = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const prop2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    'i'
  );
  const m = html.match(prop) || html.match(prop2);
  return m?.[1]?.trim() || null;
}

function parseHints(html: string, pageUrl: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const ogTitle = metaContent(html, 'og:title') || '';
  const desc =
    metaContent(html, 'description') ||
    metaContent(html, 'og:description') ||
    '';
  const ogImage = metaContent(html, 'og:image');
  const theme = metaContent(html, 'theme-color');
  let company = (ogTitle || title)
    .replace(/\s*[|\-–—•].*$/, '')
    .replace(/\s*(Home|Startseite|Willkommen)\s*$/i, '')
    .trim()
    .slice(0, 80);
  let logoUrl: string | null = null;
  if (ogImage && /^https:\/\//i.test(ogImage) && safeHttps(ogImage)) {
    logoUrl = ogImage.slice(0, 2048);
  }
  let accentColor: string | undefined;
  if (theme && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(theme.trim())) {
    accentColor = theme.trim();
  }
  return {
    company: company || undefined,
    slogan: desc.trim().slice(0, 120) || undefined,
    description: desc.trim().slice(0, 200) || undefined,
    logoUrl,
    accentColor,
    websiteUrl: pageUrl,
    source: 'url',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST only' }, 405);
  }

  if (!originAllowed(req)) {
    return jsonResponse({ error: 'origin denied' }, 403);
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400);
  }

  const url = safeHttps(body.url);
  if (!url) {
    return jsonResponse({ error: 'nur öffentliche https-URLs erlaubt' }, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // Kein automatisches Redirect-Follow → SSRF über 302 auf internes Ziel blockiert
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'NUDAIM-BrandBot/1.0',
      },
    });
    if (res.status >= 300 && res.status < 400) {
      return jsonResponse({ error: 'Redirects nicht erlaubt' }, 400);
    }
    if (!res.ok) {
      return jsonResponse({ error: 'Seite nicht erreichbar', status: res.status }, 502);
    }
    const ctype = (res.headers.get('content-type') || '').toLowerCase();
    if (!ctype.includes('html') && !ctype.includes('text')) {
      return jsonResponse({ error: 'Keine HTML-Seite' }, 415);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 1_500_000) {
      return jsonResponse({ error: 'Seite zu groß' }, 413);
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const hints = parseHints(html, url);
    return jsonResponse({ hints });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === 'AbortError';
    return jsonResponse({ error: aborted ? 'Timeout' : 'Abruf fehlgeschlagen' }, 502);
  } finally {
    clearTimeout(timer);
  }
});
