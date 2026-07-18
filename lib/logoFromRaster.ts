/**
 * Logo für den Anhänger:
 * RemBg → Originalfarben behalten (max. 3, sonst vereinfachen) → PNG im SVG.
 */

import { processLogoForPrint, compositeOnWhite, toPrintBinary } from './logoProcess';

const MAX_LOGO_COLORS = 3;

function maxEdge(): number {
  // Höher = weniger Verpixelung in der Vorschau
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 640;
  return 900;
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

function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function isBgPixel(r: number, g: number, b: number, maskBg: boolean): boolean {
  if (maskBg) return true;
  const L = lum(r, g, b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return L > 238 && sat < 0.1;
}

/** Palette auf max. k Farben reduzieren (häufigste + Merge). */
function buildPalette(samples: Rgb[], maxColors: number): Rgb[] {
  if (!samples.length) return [{ r: 0, g: 0, b: 0 }];
  if (maxColors < 1) maxColors = 1;

  // Grobe Buckets (5 Bit) zählen
  const buckets = new Map<number, { color: Rgb; count: number }>();
  for (const p of samples) {
    const key = ((p.r >> 3) << 10) | ((p.g >> 3) << 5) | (p.b >> 3);
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

  // Zu ähnliche Buckets mergen
  const mergeThr = 38 * 38;
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

  // Wenn mehr als maxColors: nächste Paare zusammenlegen bis Limit
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

function nearestColor(p: Rgb, palette: Rgb[]): Rgb {
  let best = palette[0]!;
  let bestD = Infinity;
  for (const c of palette) {
    const d = dist2(p, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Originalfarben behalten (max. 3), deckend, entstört, optional hochskaliert.
 * Ohne Binär-Maske (die machte Treppen) – nur „nahe Weiß = Hintergrund“.
 */
function toColorLimitedLogo(traceOnWhite: ImageData, _printBinary: ImageData, maxColors = MAX_LOGO_COLORS): {
  image: ImageData;
  palette: Rgb[];
  dominant: Rgb;
} {
  const w = traceOnWhite.width;
  const h = traceOnWhite.height;
  const src = traceOnWhite.data;

  const samples: Rgb[] = [];
  const fgFlags = new Uint8Array(w * h);

  for (let p = 0, i = 0; i < src.length; i += 4, p++) {
    const r = src[i]!;
    const g = src[i + 1]!;
    const b = src[i + 2]!;
    if (isBgPixel(r, g, b, false)) continue;
    fgFlags[p] = 1;
    const L = lum(r, g, b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    // Nur klare Motiv-Pixel in die Palette (kein AA-Grau)
    if (L < 210 && (sat > 0.06 || L < 160)) {
      samples.push({ r, g, b });
    }
  }

  if (samples.length < 30) {
    samples.length = 0;
    for (let p = 0, i = 0; i < src.length; i += 4, p++) {
      if (!fgFlags[p]) continue;
      samples.push({ r: src[i]!, g: src[i + 1]!, b: src[i + 2]! });
    }
  }

  const palette = buildPalette(samples, maxColors);
  const labels = new Int16Array(w * h);
  labels.fill(-1);

  for (let p = 0, i = 0; i < src.length; i += 4, p++) {
    if (!fgFlags[p]) continue;
    const pix = { r: src[i]!, g: src[i + 1]!, b: src[i + 2]! };
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < palette.length; c++) {
      const d = dist2(pix, palette[c]!);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    labels[p] = best;
  }

  // Sprenkel entfernen: 3×3 Mehrheitsfarbe (2 Durchläufe)
  const cleaned = new Int16Array(labels);
  for (let pass = 0; pass < 2; pass++) {
    const prev = pass === 0 ? labels : cleaned;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (prev[p]! < 0) continue;
        const counts = new Array(palette.length).fill(0);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const lab = prev[(y + dy) * w + (x + dx)]!;
            if (lab >= 0) counts[lab]++;
          }
        }
        let maj = prev[p]!;
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
  }

  const solid = new ImageData(w, h);
  const d = solid.data;
  for (let p = 0, i = 0; i < d.length; i += 4, p++) {
    const lab = cleaned[p]!;
    if (lab < 0) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }
    const c = palette[lab]!;
    d[i] = c.r;
    d[i + 1] = c.g;
    d[i + 2] = c.b;
    d[i + 3] = 255; // deckend = keine Textur durchscheinend
  }

  // 2× Nearest-Neighbor: schärfer in der Vorschau, ohne Weichzeichner-Matsch
  const up = upsampleNearest(solid, 2);

  // Dominant = Palette-Farbe mit den meisten Pixeln
  const hist = new Array(palette.length).fill(0);
  for (let p = 0; p < cleaned.length; p++) {
    const lab = cleaned[p]!;
    if (lab >= 0) hist[lab]!++;
  }
  let domIdx = 0;
  for (let c = 1; c < hist.length; c++) {
    if (hist[c]! > hist[domIdx]!) domIdx = c;
  }
  const dominant = palette[domIdx]!;

  return { image: up, palette, dominant };
}

function upsampleNearest(img: ImageData, factor: number): ImageData {
  if (factor <= 1) return img;
  const w = img.width;
  const h = img.height;
  const nw = w * factor;
  const nh = h * factor;
  const out = new ImageData(nw, nh);
  const s = img.data;
  const d = out.data;
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = (x / factor) | 0;
      const sy = (y / factor) | 0;
      const si = (sy * w + sx) * 4;
      const di = (y * nw + x) * 4;
      d[di] = s[si]!;
      d[di + 1] = s[si + 1]!;
      d[di + 2] = s[si + 2]!;
      d[di + 3] = s[si + 3]!;
    }
  }
  return out;
}

function rgbToHex(c: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
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

function pngDataUrlToSvg(dataUrl: string, width: number, height: number, keepColors: boolean): string {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const keep = keepColors ? '1' : '0';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-nudaim-logo="raster" data-keep-colors="${keep}">` +
    `<image width="${w}" height="${h}" href="${dataUrl}" xlink:href="${dataUrl}" ` +
    `preserveAspectRatio="xMidYMid meet"/>` +
    `</svg>`
  );
}

export function isRasterLogoSvg(svg: string | null | undefined): boolean {
  return !!svg && /data-nudaim-logo="raster"/i.test(svg);
}

/** Originalfarben beibehalten (nicht mit Druckfarbe überschreiben). */
export function keepsOriginalLogoColors(svg: string | null | undefined): boolean {
  return !!svg && /data-keep-colors="1"/i.test(svg);
}

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
  /** Dominante Originalfarbe (#rrggbb) – für Druckfarbe vorbelegen. */
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
    const preset = String(analysis.recommendedPreset || '').toLowerCase();
    forceLogo =
      preset === 'logo' || preset === 'simple' || preset === 'lineart' || preset === 'pixel' || !analysis.isPhoto;
  } catch (err) {
    if (err instanceof Error && err.message === PHOTO_MSG) throw err;
  }

  const processed = processLogoForPrint(raw, { forceLogo });
  if (!processed.ok) {
    throw new Error(processed.message);
  }

  const { image: rgba, dominant } = toColorLimitedLogo(
    processed.traceImage,
    processed.image,
    MAX_LOGO_COLORS
  );
  const png = imageDataToPngDataUrl(rgba);
  const svg = pngDataUrlToSvg(png, rgba.width, rgba.height, true);

  return {
    svg,
    bgRemoved: processed.meta.bgRemoved,
    printReady: true,
    dominantColor: rgbToHex(dominant),
  };
}

/** Firmenname: schwarz, wird in der Vorschau mit Druckfarbe eingefärbt. */
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
  return pngDataUrlToSvg(png, canvas.width, canvas.height, false);
}

export { compositeOnWhite };
