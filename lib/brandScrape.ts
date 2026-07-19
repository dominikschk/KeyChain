/**
 * Brand-Hinweise aus Website-URL oder PDF-Text – nur https, sanitisiert.
 */
import { toSafeHttpUrl } from './validation';

export interface BrandHints {
  company?: string;
  slogan?: string;
  description?: string;
  logoUrl?: string | null;
  accentColor?: string;
  websiteUrl?: string;
  industryGuess?: string;
  source: 'url' | 'pdf' | 'domain' | 'manual';
}

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|0\.0\.0\.0)/i;

/** Nur öffentliche https-URLs (keine localhost/Privat-IPs). */
export function toSafePublicHttpsUrl(raw: string): string | null {
  const url = toSafeHttpUrl(raw);
  if (!url || !url.startsWith('https://')) return null;
  try {
    const u = new URL(url);
    if (u.username || u.password) return null;
    if (PRIVATE_HOST.test(u.hostname)) return null;
    if (u.hostname === 'metadata.google.internal') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
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

function titleFromHtml(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return m?.[1]?.replace(/\s+/g, ' ').trim() || null;
}

function themeColorFromHtml(html: string): string | null {
  const raw = metaContent(html, 'theme-color');
  if (!raw) return null;
  const hex = raw.trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) return hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  return null;
}

function cleanCompanyName(raw: string): string {
  return raw
    .replace(/\s*[|\-–—•].*$/, '')
    .replace(/\s*(Home|Startseite|Willkommen|Official|Website)\s*$/i, '')
    .trim()
    .slice(0, 80);
}

/** HTML → sanfte Brand-Hints (für Edge Function + Tests). */
export function parseBrandHintsFromHtml(html: string, pageUrl: string): BrandHints {
  const title = titleFromHtml(html);
  const desc =
    metaContent(html, 'description') ||
    metaContent(html, 'og:description') ||
    undefined;
  const ogTitle = metaContent(html, 'og:title');
  const ogImage = metaContent(html, 'og:image');
  const company = cleanCompanyName(ogTitle || title || '') || undefined;
  let logoUrl: string | null = null;
  if (ogImage && /^https:\/\//i.test(ogImage)) {
    logoUrl = ogImage.slice(0, 2048);
  }
  const slogan = (desc || '').trim().slice(0, 120) || undefined;
  const accentColor = themeColorFromHtml(html) || undefined;
  return {
    company,
    slogan,
    description: slogan,
    logoUrl,
    accentColor,
    websiteUrl: pageUrl,
    industryGuess: guessIndustryFromText(`${company || ''} ${slogan || ''}`),
    source: 'url',
  };
}

export function guessIndustryFromText(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/bäck|baeck|brot|konditor|bakery/.test(t)) return 'bakery';
  if (/restaurant|café|cafe|gastro|bar|hotel/.test(t)) return 'gastro';
  if (/fitness|gym|yoga|sport/.test(t)) return 'fitness';
  if (/immobil|makler|real.?estate/.test(t)) return 'realestate';
  if (/wellness|spa|friseur|beauty|salon/.test(t)) return 'wellness';
  if (/handwerk|elektro|sanitär|bau/.test(t)) return 'craft';
  return undefined;
}

/** Fallback ohne Fetch: Name aus Domain ableiten. */
export function hintsFromWebsiteUrl(rawUrl: string): BrandHints | null {
  const url = toSafePublicHttpsUrl(rawUrl);
  if (!url) return null;
  const host = new URL(url).hostname.replace(/^www\./, '');
  const base = host.split('.')[0] || host;
  const company = base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 80);
  return {
    company: company || undefined,
    websiteUrl: url,
    industryGuess: guessIndustryFromText(company),
    source: 'domain',
  };
}

/**
 * Grobe Text-Extraktion aus PDF-Bytes (unkomprimierte Strings).
 * Kein vollständiger PDF-Parser – reicht für Firmenname/Slogan-Hinweise.
 */
export function extractRoughTextFromPdf(bytes: Uint8Array): string {
  const latin: string[] = [];
  let buf = '';
  const push = () => {
    if (buf.length >= 4) latin.push(buf);
    buf = '';
  };
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 0x20 && c <= 0x7e) {
      buf += String.fromCharCode(c);
    } else if (c === 0x0a || c === 0x0d || c === 0x09) {
      buf += ' ';
    } else {
      push();
    }
  }
  push();
  const joined = latin.join(' ')
    .replace(/\\([nrt])/g, ' ')
    .replace(/[()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return joined.slice(0, 8000);
}

export function hintsFromPdfText(text: string): BrandHints {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 4000);
  const firstLine = clean.split(/[.!?]/)[0]?.trim().slice(0, 80) || undefined;
  return {
    company: firstLine ? cleanCompanyName(firstLine) : undefined,
    slogan: clean.slice(0, 120) || undefined,
    description: clean.slice(0, 200) || undefined,
    industryGuess: guessIndustryFromText(clean),
    source: 'pdf',
  };
}

export function sanitizeBrandHints(raw: Partial<BrandHints> & { source?: BrandHints['source'] }): BrandHints {
  const websiteUrl = raw.websiteUrl ? toSafePublicHttpsUrl(raw.websiteUrl) || undefined : undefined;
  let logoUrl: string | null = null;
  if (raw.logoUrl && /^https:\/\//i.test(raw.logoUrl)) {
    logoUrl = String(raw.logoUrl).slice(0, 2048);
  }
  let accentColor: string | undefined;
  if (raw.accentColor && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(raw.accentColor)) {
    accentColor = raw.accentColor;
  }
  return {
    company: raw.company?.trim().slice(0, 80) || undefined,
    slogan: raw.slogan?.trim().slice(0, 120) || undefined,
    description: raw.description?.trim().slice(0, 200) || undefined,
    logoUrl,
    accentColor,
    websiteUrl,
    industryGuess: raw.industryGuess,
    source: raw.source || 'manual',
  };
}
