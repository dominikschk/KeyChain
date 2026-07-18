/**
 * Logo: Freistellen → max. 3 Originalfarben (weich am Rand, innen klar).
 */

import { processLogoForPrint, compositeOnWhite } from './logoProcess';

const MAX_LOGO_COLORS = 3;

function maxEdge(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 900;
  return 1400;
}

const PHOTO_MSG =
  'Das sieht nach einem Foto aus, nicht nach einem Logo. Bitte ein Logo mit klarem Motiv und einfachem Hintergrund hochladen (PNG/JPG/SVG).';

type Rgb = { r: number; g: number; b: number };

async function fileToRawImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    const edge = maxEdge();
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas nicht verfügbar.');
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    bitmap.close();
  }
}

function lum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sat(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Weiche Matte gegen Weiß (nur Außenkante). */
function alphaMatte(r: number, g: number, b: number): number {
  const L = lum(r, g, b);
  const S = sat(r, g, b);
  if (L > 248 && S < 0.06) return 0;
  const dr = 255 - r;
  const dg = 255 - g;
  const db = 255 - b;
  const a = Math.min(255, Math.round(Math.sqrt(dr * dr + dg * dg + db * db) * 1.3 + S * 80));
  return a < 8 ? 0 : a;
}

function buildPalette(samples: Rgb[], maxColors: number): Rgb[] {
  if (!samples.length) return [{ r: 18, g: 169, b: 224 }];
  maxColors = Math.max(1, Math.min(3, maxColors));

  const buckets = new Map<number, { color: Rgb; count: number }>();
  for (const p of samples) {
    // etwas gröber → weniger Mikrofarben
    const key = ((p.r >> 4) << 8) | ((p.g >> 4) << 4) | (p.b >> 4);
    const cur = buckets.get(key);
    if (cur) {
      const n = cur.count + 1;
      cur.color = {
        r: Math.round((cur.color.r * cur.count + p.r) / n),
        g: Math.round((cur.color.g * cur.count + p.g) / n),
        b: Math.round((cur.color.b * cur.count + p.b) / n),
      };
      cur.count = n;
    } else {
      buckets.set(key, { color: { ...p }, count: 1 });
    }
  }

  let clusters = [...buckets.values()].sort((a, b) => b.count - a.count);

  // ähnliche zusammenlegen
  const mergeThr = 48 * 48;
  const merged: { color: Rgb; count: number }[] = [];
  for (const c of clusters) {
    let hit: (typeof merged)[number] | null = null;
    let best = Infinity;
    for (const m of merged) {
      const d = dist2(c.color, m.color);
      if (d < mergeThr && d < best) {
        best = d;
        hit = m;
      }
    }
    if (hit) {
      const n = hit.count + c.count;
      hit.color = {
        r: Math.round((hit.color.r * hit.count + c.color.r * c.count) / n),
        g: Math.round((hit.color.g * hit.count + c.color.g * c.count) / n),
        b: Math.round((hit.color.b * hit.count + c.color.b * c.count) / n),
      };
      hit.count = n;
    } else {
      merged.push({ color: { ...c.color }, count: c.count });
    }
  }
  clusters = merged.sort((a, b) => b.count - a.count);

  while (clusters.length > maxColors) {
    let bi = 0;
    let bj = 1;
    let best = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = dist2(clusters[i]!.color, clusters[j]!.color);
        if (d < best) {
          best = d;
          bi = i;
          bj = j;
        }
      }
    }
    const a = clusters[bi]!;
    const b = clusters[bj]!;
    const n = a.count + b.count;
    const next = {
      color: {
        r: Math.round((a.color.r * a.count + b.color.r * b.count) / n),
        g: Math.round((a.color.g * a.count + b.color.g * b.count) / n),
        b: Math.round((a.color.b * a.count + b.color.b * b.count) / n),
      },
      count: n,
    };
    clusters = clusters.filter((_, idx) => idx !== bi && idx !== bj);
    clusters.push(next);
    clusters.sort((x, y) => y.count - x.count);
  }

  return clusters.slice(0, maxColors).map((c) => c.color);
}

function nearestIdx(p: Rgb, palette: Rgb[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = dist2(p, palette[i]!);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Max. 3 Farben + weiche Außenkante.
 * Innen: volle Deckkraft (keine Textur durchscheinend).
 * Kein Nearest-Upscale.
 */
function toThreeColorLogo(traceOnWhite: ImageData): { image: ImageData; dominant: Rgb } {
  const w = traceOnWhite.width;
  const h = traceOnWhite.height;
  const src = traceOnWhite.data;

  const alphas = new Float32Array(w * h);
  const samples: Rgb[] = [];

  for (let p = 0, i = 0; i < src.length; i += 4, p++) {
    const r = src[i]!;
    const g = src[i + 1]!;
    const b = src[i + 2]!;
    const a = alphaMatte(r, g, b) / 255;
    alphas[p] = a;
    // nur solide Pixel für Palette (kein AA-Rand → saubere 3 Farben)
    if (a > 0.72 && lum(r, g, b) < 235) {
      samples.push({ r, g, b });
    }
  }

  if (samples.length < 24) {
    for (let p = 0, i = 0; i < src.length; i += 4, p++) {
      if (alphas[p]! < 0.25) continue;
      samples.push({ r: src[i]!, g: src[i + 1]!, b: src[i + 2]! });
    }
  }

  const palette = buildPalette(samples, MAX_LOGO_COLORS);
  const labels = new Int16Array(w * h);
  labels.fill(-1);

  for (let p = 0, i = 0; i < src.length; i += 4, p++) {
    if (alphas[p]! < 0.04) continue;
    labels[p] = nearestIdx({ r: src[i]!, g: src[i + 1]!, b: src[i + 2]! }, palette);
  }

  // Leichte Glättung der Farbregionen (3×3 Mehrheitswahl) – weniger Sprenkel, ohne Upscale
  const cleaned = new Int16Array(labels);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (labels[p]! < 0) continue;
      const counts = new Array(palette.length).fill(0);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const lab = labels[(y + dy) * w + (x + dx)]!;
          if (lab >= 0) counts[lab]!++;
        }
      }
      let maj = labels[p]!;
      let majN = -1;
      for (let c = 0; c < counts.length; c++) {
        if (counts[c]! > majN) {
          majN = counts[c]!;
          maj = c;
        }
      }
      cleaned[p] = maj;
    }
  }

  // Alpha leicht glätten (Box-Blur 3×3) → weichere Außenkante
  const smoothA = new Float32Array(alphas);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          s += alphas[(y + dy) * w + (x + dx)]!;
        }
      }
      smoothA[y * w + x] = s / 9;
    }
  }

  const out = new ImageData(w, h);
  const d = out.data;
  const hist = new Array(palette.length).fill(0);

  for (let p = 0, i = 0; i < d.length; i += 4, p++) {
    let a = smoothA[p]!;
    const lab = cleaned[p]!;
    if (a < 0.03 || lab < 0) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }
    // Innen voll deckend
    if (a > 0.55) a = 1;
    const c = palette[lab]!;
    hist[lab]!++;
    d[i] = c.r;
    d[i + 1] = c.g;
    d[i + 2] = c.b;
    d[i + 3] = Math.round(a * 255);
  }

  let domIdx = 0;
  for (let c = 1; c < hist.length; c++) {
    if (hist[c]! > hist[domIdx]!) domIdx = c;
  }

  return { image: out, dominant: palette[domIdx]! };
}

function imageDataToPngDataUrl(img: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas nicht verfügbar.');
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function rgbToHex(c: Rgb): string {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function pngDataUrlToSvg(dataUrl: string, width: number, height: number, dominantHex: string): string {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-nudaim-logo="raster" data-keep-colors="1" data-dominant="${dominantHex}">` +
    `<image width="${w}" height="${h}" href="${dataUrl}" xlink:href="${dataUrl}" ` +
    `preserveAspectRatio="xMidYMid meet"/>` +
    `</svg>`
  );
}

export function isRasterLogoSvg(svg: string | null | undefined): boolean {
  return !!svg && /data-nudaim-logo="raster"/i.test(svg);
}

export function keepsOriginalLogoColors(svg: string | null | undefined): boolean {
  return !!svg && /data-keep-colors="1"/i.test(svg);
}

export function extractDominantFromSvg(svg: string): string | null {
  const m = /data-dominant="(#[0-9a-fA-F]{3,8})"/i.exec(svg);
  return m?.[1] ?? null;
}

export function extractRasterPngFromSvg(svg: string): string | null {
  const m =
    /\shref="(data:image\/png;base64,[^"]+)"/i.exec(svg) ||
    /\sxlink:href="(data:image\/png;base64,[^"]+)"/i.exec(svg);
  return m?.[1] ?? null;
}

function hexClose(a: string, b: string, tol = 32): boolean {
  const parse = (h: string) => {
    let s = h.replace('#', '');
    if (s.length === 3) s = s[0]! + s[0] + s[1]! + s[1] + s[2]! + s[2];
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
    };
  };
  try {
    const A = parse(a);
    const B = parse(b);
    return Math.abs(A.r - B.r) + Math.abs(A.g - B.g) + Math.abs(A.b - B.b) <= tol * 3;
  } catch {
    return false;
  }
}

export function shouldShowOriginalLogoColors(svg: string, printColor: string): boolean {
  if (!keepsOriginalLogoColors(svg)) return false;
  const dom = extractDominantFromSvg(svg);
  if (!dom) return true;
  return hexClose(dom, printColor);
}

export type RasterLogoResult = {
  svg: string;
  bgRemoved: boolean;
  printReady: boolean;
  dominantColor?: string;
};

export async function rasterFileToSvg(file: File): Promise<string> {
  const result = await rasterFileToSvgDetailed(file);
  return result.svg;
}

export async function rasterFileToSvgDetailed(file: File): Promise<RasterLogoResult> {
  const raw = await fileToRawImageData(file);

  let forceLogo = true;
  try {
    const { Vecburner } = await import('vecburner');
    const analysis = Vecburner.analyzeImage(raw);
    if (analysis.isPhoto) {
      throw new Error(PHOTO_MSG);
    }
  } catch (err) {
    if (err instanceof Error && err.message === PHOTO_MSG) throw err;
  }

  const processed = processLogoForPrint(raw, { forceLogo });
  if (!processed.ok) {
    throw new Error(processed.message);
  }

  const { image: rgba, dominant } = toThreeColorLogo(processed.traceImage);
  const dominantHex = rgbToHex(dominant);
  const png = imageDataToPngDataUrl(rgba);
  const svg = pngDataUrlToSvg(png, rgba.width, rgba.height, dominantHex);

  return {
    svg,
    bgRemoved: processed.meta.bgRemoved,
    printReady: true,
    dominantColor: dominantHex,
  };
}

export async function textToEngraveSvg(raw: string): Promise<string> {
  const text = raw.trim().replace(/\s+/g, ' ').slice(0, 28);
  if (!text) throw new Error('Bitte einen Namen eingeben.');

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 280;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas nicht verfügbar.');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let size = 140;
  ctx.font = `800 ${size}px Arial Black, Arial, sans-serif`;
  while (size > 28 && ctx.measureText(text).width > canvas.width - 48) {
    size -= 4;
    ctx.font = `800 ${size}px Arial Black, Arial, sans-serif`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + size * 0.05);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 20) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 0;
    } else {
      d[i] = d[i + 1] = d[i + 2] = 0;
    }
  }

  const png = imageDataToPngDataUrl(img);
  const w = canvas.width;
  const h = canvas.height;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-nudaim-logo="raster" data-keep-colors="0">` +
    `<image width="${w}" height="${h}" href="${png}" xlink:href="${png}" preserveAspectRatio="xMidYMid meet"/>` +
    `</svg>`
  );
}

export { compositeOnWhite };
