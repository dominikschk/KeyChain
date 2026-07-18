/**
 * Logo für den Anhänger: PNG/JPG → Hintergrund weg → Logo-Check → 3D-Druck-Check → SVG.
 * ImageTracer wird erst beim Upload dynamisch geladen.
 */

import { processLogoForPrint } from './logoProcess';

function maxEdge(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 360;
  return 480;
}

const TRACE_OPTS = {
  ltres: 1,
  qtres: 1,
  pathomit: 8,
  colorsampling: 0,
  numberofcolors: 2,
  mincolorratio: 0,
  colorquantcycles: 1,
  blurradius: 0,
  blurdelta: 20,
  strokewidth: 0,
  linefilter: true,
  scale: 1,
  roundcoords: 1,
  viewbox: true,
  desc: false,
  rightangleenhance: true,
};

async function imageDataToSvg(img: ImageData): Promise<string> {
  const ImageTracer = (await import('imagetracerjs')).default;
  const svg = ImageTracer.imagedataToSVG(img, TRACE_OPTS) as string;
  if (!svg || !/<svg[\s>]/i.test(svg) || !/<path\b/i.test(svg)) {
    throw new Error(
      'Kein klares Motiv erkannt. Bitte ein Logo mit klarem Kontrast verwenden (dunkles Logo auf hell oder umgekehrt).'
    );
  }
  return svg;
}

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
    ctx.drawImage(bitmap, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    bitmap.close();
  }
}

export type RasterLogoResult = {
  svg: string;
  bgRemoved: boolean;
  printReady: boolean;
};

/** PNG/JPG/WebP/GIF → geprüftes, druckbares SVG. */
export async function rasterFileToSvg(file: File): Promise<string> {
  const result = await rasterFileToSvgDetailed(file);
  return result.svg;
}

/** Wie rasterFileToSvg, inkl. Meta für die UI. */
export async function rasterFileToSvgDetailed(file: File): Promise<RasterLogoResult> {
  const raw = await fileToRawImageData(file);
  const processed = processLogoForPrint(raw);
  if (!processed.ok) {
    throw new Error(processed.message);
  }
  const svg = await imageDataToSvg(processed.image);
  return {
    svg,
    bgRemoved: processed.meta.bgRemoved,
    printReady: true,
  };
}

/** Firmenname als Prägetext (ohne Datei) – schon druckfreundlich (bold sans). */
export async function textToEngraveSvg(raw: string): Promise<string> {
  const text = raw.trim().replace(/\s+/g, ' ').slice(0, 28);
  if (!text) throw new Error('Bitte einen Namen eingeben.');

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 320;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas nicht verfügbar.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  // Text ist bereits Logo-ähnlich – Pipeline trotzdem für Einheitlichkeit
  const processed = processLogoForPrint(img);
  if (!processed.ok) {
    // Fallback: direkte Binarisierung ohne Foto-Check (reiner Text)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = img.data[i]! < 128 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    return imageDataToSvg(img);
  }
  return imageDataToSvg(processed.image);
}
