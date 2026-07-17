// Supabase Edge Function: optional LLM-Verstärkung für Microsite-Chat
// Secrets: OPENAI_API_KEY (optional). Ohne Key → 503, Client nutzt geführten Fallback.
// POST { messages: [{ role, content }], hints?: object }
// Returns { message, ready, config? }

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_MICROSITE_HOSTS') ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `Du bist der NUDAIM-Assistent. Du hilfst Menschen OHNE Technik-Kenntnisse auf einfachem Deutsch.

Regeln für deine Antworten:
- Kurze Sätze, keine Fachwörter, keine Markdown-Sternchen.
- Stelle immer NUR EINE klare Frage.
- Erkläre kurz, warum die Frage hilft.
- Biete 2–4 Antwort-Beispiele an (zum Abtippen).
- Sei geduldig und freundlich.

Gesprächsfluss:
1) Firmenname
2) Branche
3) Slogan / Willkommenstext (darf übersprungen werden)
4) Logo (https-URL oder später)
5) Wunsch-Funktionen (WhatsApp, Instagram, Buchung, Bewertungen, WLAN, Stempelkarte, Karte, Website, Mail, Telefon)
6) Farb-/Stimmungsrichtung
Dann Config erzeugen.

Antworte IMMER als JSON-Objekt (kein Markdown drumherum):
{
  "message": "Text an den Nutzer",
  "ready": false,
  "config": null
}

Wenn genug Infos da sind, setze ready=true und config:
{
  "profileTitle": string (max 80),
  "accentColor": "#RRGGBB",
  "theme": "light" | "dark",
  "fontStyle": "luxury" | "modern" | "elegant",
  "profileIcon": einer von: briefcase, utensils, camera, dumbbell, heart, home, hammer, star, globe, user,
  "profileLogoUrl": string | null (nur https),
  "slogan": string,
  "blocks": [
    { "type": "headline"|"magic_button"|"map"|"spacer", "title": string, "content": string, "buttonType"?: string, "settings"?: object }
  ]
}

Regeln für config:
- Kein HTML/JS.
- buttonType nur: whatsapp, instagram, booking, review, wifi, stamp_card, custom_link, email, phone, action_card, youtube, tiktok, linkedin, google_profile
- Max 12 blocks.
- Links nur https oder leer.
- Zur Branche passend, aber Nutzerwünsche zuerst.`;

type InMsg = { role: string; content: string };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitizeConfig(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const title = String(c.profileTitle ?? '').trim().slice(0, 80);
  if (!title) return null;
  const accent = String(c.accentColor ?? '#11235A');
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(accent)) return null;
  const theme = c.theme === 'dark' ? 'dark' : 'light';
  const fontStyle = ['luxury', 'modern', 'elegant'].includes(String(c.fontStyle))
    ? String(c.fontStyle)
    : 'modern';
  let logo: string | null = c.profileLogoUrl ? String(c.profileLogoUrl) : null;
  if (logo && !/^https:\/\//i.test(logo)) logo = null;
  const blocksIn = Array.isArray(c.blocks) ? c.blocks.slice(0, 12) : [];
  const allowedBtn = new Set([
    'whatsapp', 'instagram', 'booking', 'review', 'wifi', 'stamp_card', 'custom_link',
    'email', 'phone', 'action_card', 'youtube', 'tiktok', 'linkedin', 'google_profile',
  ]);
  const blocks = blocksIn.map((b) => {
    const row = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
    const type = String(row.type ?? 'magic_button').slice(0, 32);
    const buttonType = row.buttonType ? String(row.buttonType).slice(0, 32) : undefined;
    return {
      type: ['headline', 'magic_button', 'map', 'spacer', 'text', 'image'].includes(type) ? type : 'magic_button',
      title: String(row.title ?? '').slice(0, 200),
      content: String(row.content ?? '').slice(0, 5000),
      buttonType: buttonType && allowedBtn.has(buttonType) ? buttonType : undefined,
      settings: row.settings && typeof row.settings === 'object' ? row.settings : undefined,
    };
  });
  return {
    profileTitle: title,
    accentColor: accent,
    theme,
    fontStyle,
    profileIcon: String(c.profileIcon ?? 'briefcase').slice(0, 32),
    profileLogoUrl: logo,
    slogan: String(c.slogan ?? '').slice(0, 200),
    blocks,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST only' }, 405);
  }
  if (!OPENAI_API_KEY) {
    return jsonResponse({ error: 'OPENAI_API_KEY not configured', fallback: true }, 503);
  }

  let body: { messages?: InMsg[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (messages.length === 0) {
    return jsonResponse({ error: 'messages required' }, 400);
  }

  const openaiMessages = [
    { role: 'system', content: SYSTEM },
    ...messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: String(m.content).slice(0, 4000),
      })),
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: openaiMessages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return jsonResponse({ error: 'OpenAI error', details: data }, 502);
  }

  const rawContent = data?.choices?.[0]?.message?.content ?? '{}';
  let parsed: { message?: string; ready?: boolean; config?: unknown };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return jsonResponse({
      message: 'Kurz haken – kannst du das nochmal anders formulieren?',
      ready: false,
      config: null,
    });
  }

  const config = parsed.ready ? sanitizeConfig(parsed.config) : null;
  return jsonResponse({
    message: String(parsed.message ?? 'Alles klar – erzähl mir mehr.').slice(0, 4000),
    ready: Boolean(parsed.ready && config),
    config,
    hostHint: ALLOWED_ORIGINS[0] ?? null,
  });
};

Deno.serve(handler);
