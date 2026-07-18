/**
 * Logo für den Anhänger – Qualität zuerst:
 * Hintergrund weg, Originalfarben 1:1 behalten (keine Posterize/Upscale-Pixel).
 * Andere Druckfarbe = sauberes Mono über Alpha.
 */

import { processLogoForPrint, compositeOnWhite } from './logoProcess';

function maxEdge(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 800;
  return 1200;
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

/**
 * Weiche Freistellung auf Weiß – RGB bleibt original.
 * Innenflächen voll deckend (kein Durchscheinen der Anhänger-Textur).
 */
function toCleanLogoRgba(traceOnWhite: ImageData): { image: ImageData; dominant: Rgb } {
  const w = traceOnWhite.width;
  const h = traceOnWhite.height;
  const src = traceOnWhite.data;
  const out = new ImageData(w, h);
  const d = out.data;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumW = 0;

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i]!;
    const g = src[i + 1]!;
    const b = src[i + 2]!;
    const L = lum(r, g, b);
    const S = sat(r, g, b);

    // klarer Hintergrund
    if (L > 246 && S < 0.07) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }

    // Distanz zu Weiß → Alpha
    const dr = 255 - r;
    const dg = 255 - g;
    const db = 255 - b;
    let a = Math.min(255, Math.round(Math.sqrt(dr * dr + dg * dg + db * db) * 1.25 + S * 70));
    if (a < 10) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }

    // Kern voll deckend → keine Textur durch die Vorschau
    if (a > 140 || (L < 210 && S > 0.05)) {
      a = 255;
      sumR += r;
      sumG += g;
      sumB += b;
      sumW += 1;
    }

    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = a;
  }

  const dominant: Rgb =
    sumW > 0
      ? {
          r: Math.round(sumR / sumW),
          g: Math.round(sumG / sumW),
          b: Math.round(sumB / sumW),
        }
      : { r: 18, g: 169, b: 224 };

  return { image: out, dominant };
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

/** Originalfarben, solange Druckfarbe ≈ Upload-Dominantfarbe. */
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

  // Keine 3-Farben-Posterize – Original sieht am besten aus
  const { image: rgba, dominant } = toCleanLogoRgba(processed.traceImage);
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
