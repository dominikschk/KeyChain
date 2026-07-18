/**
 * Logo für den Anhänger (gratis-Stack):
 * 1) Regelbasierte Aufbereitung (Hintergrund, Foto-Check, Druckbarkeit)
 * 2) Vektorisieren mit vecburner (geglättete Kurven)
 * 3) Fallback: imagetracerjs
 */

import { processLogoForPrint } from './logoProcess';

function maxEdge(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 480;
  return 640;
}

const TRACE_OPTS = {
  ltres: 0.5,
  qtres: 0.5,
  pathomit: 12,
  colorsampling: 0,
  numberofcolors: 2,
  mincolorratio: 0,
  colorquantcycles: 1,
  blurradius: 1,
  blurdelta: 20,
  strokewidth: 0,
  linefilter: true,
  scale: 1,
  roundcoords: 2,
  viewbox: true,
  desc: false,
  // false = weniger Treppen an Diagonalen
  rightangleenhance: false,
};

const PHOTO_MSG =
  'Das sieht nach einem Foto aus, nicht nach einem Logo. Bitte ein Logo mit klarem Motiv und einfachem Hintergrund hochladen (PNG/JPG/SVG).';

/** Soft-Upscale (bilinear) – mehr Punkte für weichere Kurven. */
function upsampleForTrace(img: ImageData, factor = 2): ImageData {
  const w = img.width;
  const h = img.height;
  const nw = Math.max(1, Math.round(w * factor));
  const nh = Math.max(1, Math.round(h * factor));
  if (nw === w && nh === h) return img;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d');
  if (!sctx) return img;
  sctx.putImageData(img, 0, 0);
  const dst = document.createElement('canvas');
  dst.width = nw;
  dst.height = nh;
  const dctx = dst.getContext('2d', { willReadFrequently: true });
  if (!dctx) return img;
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';
  dctx.drawImage(src, 0, 0, nw, nh);
  // Nach Soft-Scale wieder klar binär (Anti-Alias-Grau → schwarz/weiß)
  const out = dctx.getImageData(0, 0, nw, nh);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const L = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    const v = L < 160 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  return out;
}

/** Leichte Kantenrundung vor dem Trace (3×3 Mehrheit). */
function softenBinaryEdges(img: ImageData): ImageData {
  const w = img.width;
  const h = img.height;
  const src = img.data;
  const out = new ImageData(w, h);
  const dst = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ink = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          n++;
          if (src[(ny * w + nx) * 4]! < 128) ink++;
        }
      }
      const i = (y * w + x) * 4;
      const v = ink >= Math.ceil(n * 0.45) ? 0 : 255;
      dst[i] = dst[i + 1] = dst[i + 2] = v;
      dst[i + 3] = 255;
    }
  }
  return out;
}

/** Vecburner legt oft ein Hintergrund-Rect und helle Fills an – für Prägung entfernen. */
function cleanEngraveSvg(svg: string): string {
  let out = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<rect\b[^>]*\/?>/gi, '');

  out = out.replace(/<path\b[^>]*\/?>/gi, (tag) => {
    const fillMatch = /\sfill="([^"]*)"/i.exec(tag);
    const fill = (fillMatch?.[1] || '').trim().toLowerCase().replace(/\s+/g, '');
    const isLight =
      fill === 'none' ||
      fill === '#fff' ||
      fill === '#ffffff' ||
      fill === 'white' ||
      fill === 'rgb(255,255,255)' ||
      /^rgba\(255,255,255,/.test(fill);
    if (isLight) return '';
    let next = tag.replace(/\sfill="[^"]*"/gi, ' fill="#000000"');
    if (!/\sfill=/i.test(next)) next = next.replace(/<path\b/i, '<path fill="#000000"');
    next = next.replace(/\sstroke="[^"]*"/gi, ' stroke="none"');
    next = next.replace(/\sstroke-width="[^"]*"/gi, '');
    return next;
  });

  if (!/<path\b/i.test(out)) {
    throw new Error(
      'Kein klares Motiv erkannt. Bitte ein Logo mit klarem Kontrast verwenden (dunkles Logo auf hell oder umgekehrt).'
    );
  }
  if (/<svg\b/i.test(out) && !/shape-rendering=/i.test(out)) {
    out = out.replace(/<svg\b/i, '<svg shape-rendering="geometricPrecision"');
  }
  return out;
}

async function imageDataToSvgVecburner(img: ImageData): Promise<string> {
  const { Vecburner } = await import('vecburner');
  const prepared = softenBinaryEdges(upsampleForTrace(img, 2));
  // Mehr Glättung als Stock-Lineart → weniger Treppen an Diagonalen
  const result = await Vecburner.vectorize(prepared, {
    preset: 'logo',
    binaryMode: true,
    numColors: 2,
    colorTolerance: 50,
    pathTolerance: 1.35,
    smoothness: 2.5,
    minPathLength: 20,
    mode: 'spline',
    blurSigma: 1.1,
    morphology: true,
    contourMethod: 'marching',
  });
  if (!result?.svg) throw new Error('Vektorisierung fehlgeschlagen.');
  return cleanEngraveSvg(result.svg);
}

async function imageDataToSvgImageTracer(img: ImageData): Promise<string> {
  const ImageTracer = (await import('imagetracerjs')).default;
  const prepared = softenBinaryEdges(upsampleForTrace(img, 2));
  const svg = ImageTracer.imagedataToSVG(prepared, TRACE_OPTS) as string;
  if (!svg || !/<svg[\s>]/i.test(svg) || !/<path\b/i.test(svg)) {
    throw new Error(
      'Kein klares Motiv erkannt. Bitte ein Logo mit klarem Kontrast verwenden (dunkles Logo auf hell oder umgekehrt).'
    );
  }
  return cleanEngraveSvg(svg);
}

async function imageDataToSvg(img: ImageData): Promise<string> {
  try {
    return await imageDataToSvgVecburner(img);
  } catch (err) {
    console.warn('vecburner failed, falling back to imagetracerjs', err);
    return imageDataToSvgImageTracer(img);
  }
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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

  let forceLogo = false;
  try {
    const { Vecburner } = await import('vecburner');
    const analysis = Vecburner.analyzeImage(raw);
    if (analysis.isPhoto) {
      throw new Error(PHOTO_MSG);
    }
    const preset = String(analysis.recommendedPreset || '').toLowerCase();
    if (preset === 'logo' || preset === 'simple' || preset === 'lineart' || preset === 'pixel') {
      forceLogo = true;
    }
  } catch (err) {
    if (err instanceof Error && err.message === PHOTO_MSG) throw err;
    console.warn('vecburner analyze skipped', err);
  }

  const processed = processLogoForPrint(raw, { forceLogo });
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
  const processed = processLogoForPrint(img, { forceLogo: true });
  if (!processed.ok) {
    for (let i = 0; i < img.data.length; i += 4) {
      const v = img.data[i]! < 128 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    return imageDataToSvg(img);
  }
  return imageDataToSvg(processed.image);
}
