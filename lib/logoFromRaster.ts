/**
 * Logo für den Anhänger (gratis-Stack):
 * RemBg + Checks → Trace aus sauberem Logo auf Weiß (nicht aus Binär-Treppen).
 */

import { processLogoForPrint } from './logoProcess';

function maxEdge(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 420;
  return 560;
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
  rightangleenhance: false,
};

const PHOTO_MSG =
  'Das sieht nach einem Foto aus, nicht nach einem Logo. Bitte ein Logo mit klarem Motiv und einfachem Hintergrund hochladen (PNG/JPG/SVG).';

function isLightFill(fill: string): boolean {
  const f = fill.trim().toLowerCase().replace(/\s+/g, '');
  if (!f || f === 'none') return true;
  if (f === '#fff' || f === '#ffffff' || f === 'white') return true;
  if (f === 'rgb(255,255,255)' || /^rgba\(255,255,255,/.test(f)) return true;
  // sehr helle Grautöne (Hintergrundreste)
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(f);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h[0]! + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (0.299 * r + 0.587 * g + 0.114 * b > 230) return true;
  }
  const rgb = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(f);
  if (rgb) {
    const r = +rgb[1]!;
    const g = +rgb[2]!;
    const b = +rgb[3]!;
    if (0.299 * r + 0.587 * g + 0.114 * b > 230) return true;
  }
  return false;
}

/** Hintergrund-Rects & helle Fills weg, Motiv einheitlich schwarz. */
function cleanEngraveSvg(svg: string): string {
  let out = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<rect\b[^>]*\/?>/gi, '');

  out = out.replace(/<path\b[^>]*\/?>/gi, (tag) => {
    const fillMatch = /\sfill="([^"]*)"/i.exec(tag);
    const fill = fillMatch?.[1] || '';
    if (isLightFill(fill)) return '';
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
  // Logo-Preset auf dem farbigen Motiv = glatte Kurven, keine Binär-Treppen
  const result = await Vecburner.vectorize(img, {
    preset: 'logo',
    numColors: 6,
    colorTolerance: 40,
    pathTolerance: 0.9,
    smoothness: 2,
    minPathLength: 24,
    mode: 'spline',
    binaryMode: false,
    blurSigma: 0.45,
    morphology: false,
    contourMethod: 'marching',
  });
  if (!result?.svg) throw new Error('Vektorisierung fehlgeschlagen.');
  return cleanEngraveSvg(result.svg);
}

async function imageDataToSvgImageTracer(img: ImageData): Promise<string> {
  const ImageTracer = (await import('imagetracerjs')).default;
  const svg = ImageTracer.imagedataToSVG(img, TRACE_OPTS) as string;
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

export async function rasterFileToSvg(file: File): Promise<string> {
  const result = await rasterFileToSvgDetailed(file);
  return result.svg;
}

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
  // Trace aus sauberer Vorlage, nicht aus der Binär-Maske
  const svg = await imageDataToSvg(processed.traceImage);
  return {
    svg,
    bgRemoved: processed.meta.bgRemoved,
    printReady: true,
  };
}

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
    return imageDataToSvg(img);
  }
  return imageDataToSvg(processed.traceImage);
}
