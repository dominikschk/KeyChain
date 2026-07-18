/**
 * Logo für den Anhänger – neuer Ansatz:
 * Raster → Hintergrund weg → als PNG im SVG speichern (kein Trace-Chaos).
 * SVG-Dateien bleiben Vektor.
 * Vorschau färbt die Pixel ein; kein vecburner/Multi-Color-Trace.
 */

import { processLogoForPrint, compositeOnWhite, toPrintBinary } from './logoProcess';

function maxEdge(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 420;
  return 560;
}

const PHOTO_MSG =
  'Das sieht nach einem Foto aus, nicht nach einem Logo. Bitte ein Logo mit klarem Motiv und einfachem Hintergrund hochladen (PNG/JPG/SVG).';

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

/** Motiv-Maske: alles Nicht-Weiß = Logo, Alpha aus Kante (Anti-Alias). */
function toSoftLogoRgba(traceOnWhite: ImageData, printBinary: ImageData): ImageData {
  const w = traceOnWhite.width;
  const h = traceOnWhite.height;
  const out = new ImageData(w, h);
  const src = traceOnWhite.data;
  const sameSize = printBinary.width === w && printBinary.height === h;
  const mask = sameSize ? printBinary.data : null;
  const d = out.data;

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i]!;
    const g = src[i + 1]!;
    const b = src[i + 2]!;
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    // Druckmaske nur zum Entfernen von Rest-Hintergrund, nicht zum Verhärten
    const maskSaysBg = mask ? mask[i]! >= 128 : false;
    const looksLikeBg = L > 238 && sat < 0.1;
    if (maskSaysBg || looksLikeBg) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }

    // Weiche Deckkraft: dunkle/kräftige Pixel voll, helle AA-Ränder weicher
    const strength = Math.max(0, Math.min(1, (230 - L) / 90 + sat * 0.5));
    const a = Math.round(255 * Math.max(0.4, strength));
    d[i] = 0;
    d[i + 1] = 0;
    d[i + 2] = 0;
    d[i + 3] = a;
  }
  return out;
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

/** Minimales SVG mit eingebettetem PNG – kein Pfad-Trace. */
function pngDataUrlToSvg(dataUrl: string, width: number, height: number): string {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-nudaim-logo="raster">` +
    `<image width="${w}" height="${h}" href="${dataUrl}" xlink:href="${dataUrl}" ` +
    `preserveAspectRatio="xMidYMid meet"/>` +
    `</svg>`
  );
}

export function isRasterLogoSvg(svg: string | null | undefined): boolean {
  return !!svg && /data-nudaim-logo="raster"/i.test(svg);
}

/** PNG data-URL aus unserem Raster-SVG lesen. */
export function extractRasterPngFromSvg(svg: string): string | null {
  const m =
    /\shref="(data:image\/png;base64,[^"]+)"/i.exec(svg) ||
    /\sxlink:href="(data:image\/png;base64,[^"]+)"/i.exec(svg);
  return m?.[1] ?? null;
}

export type RasterLogoResult = {
  svg: string;
  bgRemoved: boolean;
  printReady: boolean;
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
    const preset = String(analysis.recommendedPreset || '').toLowerCase();
    forceLogo = preset === 'logo' || preset === 'simple' || preset === 'lineart' || preset === 'pixel' || !analysis.isPhoto;
  } catch (err) {
    if (err instanceof Error && err.message === PHOTO_MSG) throw err;
    // Analyse optional – ohne vecburner trotzdem weiter
  }

  const processed = processLogoForPrint(raw, { forceLogo });
  if (!processed.ok) {
    throw new Error(processed.message);
  }

  // Weiches Logo-PNG (keine Treppen-Vektoren)
  const soft = toSoftLogoRgba(processed.traceImage, processed.image);
  // Falls Maske andere Größe: nur Trace nutzen
  const rgba =
    soft.width === processed.traceImage.width
      ? soft
      : toSoftLogoRgba(processed.traceImage, toPrintBinary(processed.traceImage));

  const png = imageDataToPngDataUrl(rgba);
  const svg = pngDataUrlToSvg(png, rgba.width, rgba.height);

  return {
    svg,
    bgRemoved: processed.meta.bgRemoved,
    printReady: true,
  };
}

/** Firmenname als PNG-Schrift (ebenfalls ohne Trace). */
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
  // Nur nicht-transparente Pixel behalten
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]!;
    if (a < 20) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 0;
    } else {
      d[i] = d[i + 1] = d[i + 2] = 0;
      // Alpha aus Font-Antialiasing
    }
  }

  const png = imageDataToPngDataUrl(img);
  return pngDataUrlToSvg(png, canvas.width, canvas.height);
}

// Re-export für ggf. Tests
export { compositeOnWhite };
