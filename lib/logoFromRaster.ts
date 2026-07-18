/**
 * Logo für den Anhänger: PNG/Foto/Text → SVG-Pfade (ohne SVG-Kenntnisse).
 * ImageTracer wird erst beim Upload dynamisch geladen.
 */

function maxEdge(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 320;
  return 420;
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

function toHighContrast(img: ImageData): void {
  const d = img.data;
  let sum = 0;
  const luminances: number[] = new Array(d.length / 4);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const a = d[i + 3] / 255;
    const r = d[i] * a + 255 * (1 - a);
    const g = d[i + 1] * a + 255 * (1 - a);
    const b = d[i + 2] * a + 255 * (1 - a);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminances[p] = lum;
    sum += lum;
  }
  const avg = sum / luminances.length;
  const thr = Math.min(200, Math.max(80, avg * 0.92));
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = luminances[p]! < thr ? 0 : 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
}

async function imageDataToSvg(img: ImageData): Promise<string> {
  const ImageTracer = (await import('imagetracerjs')).default;
  const svg = ImageTracer.imagedataToSVG(img, TRACE_OPTS) as string;
  if (!svg || !/<svg[\s>]/i.test(svg) || !/<path\b/i.test(svg)) {
    throw new Error('Kein klares Motiv erkannt. Bitte ein Logo mit klarem Kontrast (z. B. dunkles Logo auf hell) verwenden.');
  }
  return svg;
}

async function fileToImageData(file: File): Promise<ImageData> {
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    toHighContrast(img);
    return img;
  } finally {
    bitmap.close();
  }
}

/** PNG/JPG/WebP/GIF → SVG für Extrusion. */
export async function rasterFileToSvg(file: File): Promise<string> {
  const img = await fileToImageData(file);
  return imageDataToSvg(img);
}

/** Firmenname als Prägetext (ohne Datei). */
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
  toHighContrast(img);
  return imageDataToSvg(img);
}
