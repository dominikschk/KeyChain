/**
 * Entwurf teilen ohne Checkout – kompakte URL (?draft=…).
 * Kein SVG/Logo-Binärdaten (URL sonst zu groß).
 */
import type { ModelConfig } from '../types';
import { getDefaultConfig, importConfigFromJson, type ImportResult } from './configStorage';

const DRAFT_PARAM = 'draft';
const MAX_ENCODED = 12_000;

export interface DraftSharePayload {
  v: 1;
  profileTitle: string;
  accentColor: string;
  surfaceColor?: string;
  textColor?: string;
  theme: ModelConfig['theme'];
  fontStyle: ModelConfig['fontStyle'];
  layoutMode?: ModelConfig['layoutMode'];
  navEnabled?: boolean;
  profileLogoUrl?: string;
  headerImageUrl?: string;
  faviconUrl?: string;
  landingMode?: ModelConfig['landingMode'];
  externalUrl?: string;
  plateColor?: string;
  logoColor?: string;
  engraveText?: string;
  engraveFont?: ModelConfig['engraveFont'];
  nfcBlocks: ModelConfig['nfcBlocks'];
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array | null {
  try {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function gzipEncode(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    return new TextEncoder().encode(text);
  }
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function gzipDecode(bytes: Uint8Array): Promise<string | null> {
  try {
    if (typeof DecompressionStream === 'undefined') {
      return new TextDecoder().decode(bytes);
    }
    // gzip magic
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).text();
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function slimConfigForShare(config: ModelConfig): DraftSharePayload {
  return {
    v: 1,
    profileTitle: (config.profileTitle || '').slice(0, 80),
    accentColor: config.accentColor,
    surfaceColor: config.surfaceColor,
    textColor: config.textColor,
    theme: config.theme,
    fontStyle: config.fontStyle,
    layoutMode: config.layoutMode,
    navEnabled: config.navEnabled,
    profileLogoUrl: config.profileLogoUrl?.startsWith('https://') ? config.profileLogoUrl : undefined,
    headerImageUrl: config.headerImageUrl?.startsWith('https://') ? config.headerImageUrl : undefined,
    faviconUrl: config.faviconUrl?.startsWith('https://') ? config.faviconUrl : undefined,
    landingMode: config.landingMode,
    externalUrl: config.externalUrl,
    plateColor: config.plateColor,
    logoColor: config.logoColor,
    engraveText: (config.engraveText || '').slice(0, 40),
    engraveFont: config.engraveFont || 'bold',
    nfcBlocks: (config.nfcBlocks || []).slice(0, 40).map((b) => ({
      ...b,
      imageUrl: b.imageUrl?.startsWith('https://') ? b.imageUrl : undefined,
      content: (b.content || '').slice(0, 2000),
    })),
  };
}

export async function encodeDraftShare(config: ModelConfig): Promise<string | null> {
  const payload = slimConfigForShare(config);
  const json = JSON.stringify(payload);
  const compressed = await gzipEncode(json);
  const encoded = toBase64Url(compressed);
  if (encoded.length > MAX_ENCODED) return null;
  return encoded;
}

export async function buildDraftShareUrl(origin: string, config: ModelConfig): Promise<string | null> {
  const encoded = await encodeDraftShare(config);
  if (!encoded) return null;
  const base = origin.replace(/\/$/, '');
  return `${base}/?${DRAFT_PARAM}=${encoded}`;
}

export async function decodeDraftShare(encoded: string): Promise<ImportResult> {
  const bytes = fromBase64Url(encoded.trim());
  if (!bytes) return { success: false, error: 'Link ungültig.' };
  const json = await gzipDecode(bytes);
  if (!json) return { success: false, error: 'Link konnte nicht gelesen werden.' };
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { success: false, error: 'Link beschädigt.' };
  }
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Link ungültig.' };
  }
  const obj = data as Record<string, unknown>;
  // Slim-Payload → vollständige Config
  const base = getDefaultConfig();
  const merged = {
    ...base,
    ...obj,
    profileTitle: String(obj.profileTitle ?? base.profileTitle),
    nfcBlocks: Array.isArray(obj.nfcBlocks) ? obj.nfcBlocks : base.nfcBlocks,
  };
  return importConfigFromJson(JSON.stringify(merged));
}

export function readDraftParamFromLocation(search: string): string | null {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const v = params.get(DRAFT_PARAM);
  return v && v.length > 8 ? v : null;
}
