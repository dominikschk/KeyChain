/**
 * Regelbasierte Logo-Aufbereitung für 3D-Druck (ohne KI):
 * 1) Hintergrund entfernen
 * 2) Foto vs. Logo erkennen → Fotos ablehnen
 * 3) Druckbarkeit prüfen (Linienstärke, Fläche, Inseln)
 */

export type LogoProcessOk = {
  ok: true;
  image: ImageData;
  meta: {
    bgRemoved: boolean;
    foregroundRatio: number;
    uniqueColors: number;
    kind: 'logo';
  };
};

export type LogoProcessFail = {
  ok: false;
  reason: 'photo' | 'empty' | 'too_thin' | 'too_complex' | 'coverage';
  message: string;
};

export type LogoProcessResult = LogoProcessOk | LogoProcessFail;

const PHOTO_MSG =
  'Das sieht nach einem Foto aus, nicht nach einem Logo. Bitte ein Logo mit klarem Motiv und einfachem Hintergrund hochladen (PNG/JPG/SVG).';

const THIN_MSG =
  'Die Linien sind zu fein für den 3D-Druck. Bitte ein Logo mit kräftigeren Strichen verwenden (mind. ca. 1 mm Linienstärke).';

const COMPLEX_MSG =
  'Das Motiv ist zu detailliert für den 3D-Druck. Bitte ein einfacheres Logo ohne feine Schattierungen nutzen.';

const COVERAGE_MSG =
  'Nach der Aufbereitung bleibt zu wenig oder zu viel Motiv übrig. Bitte ein Logo mit klarem Kontrast wählen.';

function lum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Ecken + Kantenmitte als Hintergrund-Proben. */
function sampleEdgeColors(img: ImageData): { r: number; g: number; b: number }[] {
  const { width: w, height: h, data } = img;
  const pts: [number, number][] = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [Math.floor(w / 2), h - 1],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ];
  const out: { r: number; g: number; b: number }[] = [];
  for (const [x, y] of pts) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y * w + x) * 4;
    if (data[i + 3]! < 20) continue;
    out.push({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! });
  }
  return out;
}

function dominantColor(samples: { r: number; g: number; b: number }[]): { r: number; g: number; b: number } | null {
  if (!samples.length) return null;
  // Median je Kanal – robuster als Mittelwert bei gemischten Ecken
  const rs = samples.map((s) => s.r).sort((a, b) => a - b);
  const gs = samples.map((s) => s.g).sort((a, b) => a - b);
  const bs = samples.map((s) => s.b).sort((a, b) => a - b);
  const m = Math.floor(samples.length / 2);
  return { r: rs[m]!, g: gs[m]!, b: bs[m]! };
}

function edgeColorSpread(samples: { r: number; g: number; b: number }[]): number {
  if (samples.length < 2) return 0;
  const d = dominantColor(samples);
  if (!d) return 0;
  let sum = 0;
  for (const s of samples) sum += colorDist(s.r, s.g, s.b, d.r, d.g, d.b);
  return sum / samples.length;
}

/**
 * Hintergrund per Kanten-Floodfill + Farbnähe entfernen.
 * Kein ML – nur Geometrie/Farbregeln.
 */
export function removeBackground(src: ImageData): { image: ImageData; removed: boolean; bgUniform: boolean } {
  const w = src.width;
  const h = src.height;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const d = out.data;

  const samples = sampleEdgeColors(src);
  const bg = dominantColor(samples);
  const spread = edgeColorSpread(samples);
  const bgUniform = spread < 38;

  // Toleranz: bei einheitlichem Rand enger, sonst etwas weiter
  const tol = bgUniform ? 42 : 28;

  if (!bg || (!bgUniform && spread > 70)) {
    // Kein klarer Rand-Hintergrund: nur sehr helle/weiße Pixel leicht ausdünnen
    let removedAny = false;
    for (let i = 0; i < d.length; i += 4) {
      const L = lum(d[i]!, d[i + 1]!, d[i + 2]!);
      if (L > 245 && d[i + 3]! > 10) {
        d[i + 3] = 0;
        removedAny = true;
      }
    }
    return { image: out, removed: removedAny, bgUniform: false };
  }

  const visited = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qh = 0;
  let qt = 0;

  const trySeed = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (d[i + 3]! < 10) {
      visited[idx] = 1;
      return;
    }
    if (colorDist(d[i]!, d[i + 1]!, d[i + 2]!, bg.r, bg.g, bg.b) > tol) return;
    visited[idx] = 1;
    qx[qt] = x;
    qy[qt] = y;
    qt++;
  };

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  const dirs = [1, 0, -1, 0, 0, 1, 0, -1];
  while (qh < qt) {
    const x = qx[qh]!;
    const y = qy[qh]!;
    qh++;
    const i = (y * w + x) * 4;
    d[i + 3] = 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + dirs[k * 2]!;
      const ny = y + dirs[k * 2 + 1]!;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nidx = ny * w + nx;
      if (visited[nidx]) continue;
      const ni = nidx * 4;
      if (d[ni + 3]! < 10) {
        visited[nidx] = 1;
        continue;
      }
      if (colorDist(d[ni]!, d[ni + 1]!, d[ni + 2]!, bg.r, bg.g, bg.b) > tol) continue;
      visited[nidx] = 1;
      qx[qt] = nx;
      qy[qt] = ny;
      qt++;
    }
  }

  // Zusätzlich: restliche Pixel nahe der BG-Farbe (Inseln im Motiv-Rand) nur wenn sehr nah
  const tight = Math.max(18, tol * 0.55);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 10) continue;
    if (colorDist(d[i]!, d[i + 1]!, d[i + 2]!, bg.r, bg.g, bg.b) <= tight) {
      d[i + 3] = 0;
    }
  }

  return { image: out, removed: qt > 0, bgUniform };
}

function quantKey(r: number, g: number, b: number): number {
  // 5 Bit je Kanal → max 32768 Buckets
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
}

function countUniqueColors(img: ImageData, onlyOpaque = true): number {
  const seen = new Set<number>();
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (onlyOpaque && d[i + 3]! < 40) continue;
    seen.add(quantKey(d[i]!, d[i + 1]!, d[i + 2]!));
    if (seen.size > 800) break;
  }
  return seen.size;
}

/** Lokale Farbvarianz im Vordergrund – Fotos schwanken stark. */
function foregroundLocalVariance(img: ImageData): number {
  const w = img.width;
  const h = img.height;
  const d = img.data;
  const step = Math.max(2, Math.floor(Math.min(w, h) / 48));
  let sumVar = 0;
  let n = 0;
  for (let y = step; y < h - step; y += step) {
    for (let x = step; x < w - step; x += step) {
      const i = (y * w + x) * 4;
      if (d[i + 3]! < 40) continue;
      const cL = lum(d[i]!, d[i + 1]!, d[i + 2]!);
      let acc = 0;
      let cnt = 0;
      for (let dy = -step; dy <= step; dy += step) {
        for (let dx = -step; dx <= step; dx += step) {
          const j = ((y + dy) * w + (x + dx)) * 4;
          if (d[j + 3]! < 40) continue;
          const L = lum(d[j]!, d[j + 1]!, d[j + 2]!);
          acc += (L - cL) * (L - cL);
          cnt++;
        }
      }
      if (cnt >= 4) {
        sumVar += acc / cnt;
        n++;
      }
    }
  }
  return n ? sumVar / n : 0;
}

/** Sobel-Kantendichte im Vordergrund. */
function edgeDensity(img: ImageData): number {
  const w = img.width;
  const h = img.height;
  const d = img.data;
  const L = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i + 3]! < 40) L[p] = Number.NaN;
    else L[p] = lum(d[i]!, d[i + 1]!, d[i + 2]!);
  }
  let edges = 0;
  let fg = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (Number.isNaN(L[p]!)) continue;
      const neighbors = [
        L[p - w - 1]!,
        L[p - w]!,
        L[p - w + 1]!,
        L[p - 1]!,
        L[p + 1]!,
        L[p + w - 1]!,
        L[p + w]!,
        L[p + w + 1]!,
      ];
      if (neighbors.some((v) => Number.isNaN(v))) continue;
      fg++;
      const gx =
        -neighbors[0]! +
        neighbors[2]! -
        2 * neighbors[3]! +
        2 * neighbors[4]! -
        neighbors[5]! +
        neighbors[7]!;
      const gy =
        -neighbors[0]! -
        2 * neighbors[1]! -
        neighbors[2]! +
        neighbors[5]! +
        2 * neighbors[6]! +
        neighbors[7]!;
      if (Math.abs(gx) + Math.abs(gy) > 90) edges++;
    }
  }
  return fg ? edges / fg : 0;
}

function foregroundRatio(img: ImageData): number {
  const d = img.data;
  let fg = 0;
  const total = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! >= 40) fg++;
  }
  return fg / Math.max(1, total);
}

/**
 * Foto vs. Logo – einfache Heuristiken (Farben, Textur, Kanten, Rand).
 * Fotos werden abgelehnt.
 */
export function classifyLogoOrPhoto(
  original: ImageData,
  afterBg: ImageData,
  bgUniform: boolean
): { kind: 'logo' | 'photo'; score: number; uniqueColors: number } {
  const colorsOrig = countUniqueColors(original, false);
  const colorsFg = countUniqueColors(afterBg, true);
  const variance = foregroundLocalVariance(afterBg);
  const edges = edgeDensity(afterBg);
  const fg = foregroundRatio(afterBg);
  const edgeSpread = edgeColorSpread(sampleEdgeColors(original));

  let photoScore = 0;

  // Viele Farben → typisch Foto
  if (colorsOrig > 220) photoScore += 3;
  else if (colorsOrig > 120) photoScore += 2;
  else if (colorsOrig > 60) photoScore += 1;
  else if (colorsOrig <= 24) photoScore -= 2;

  if (colorsFg > 100) photoScore += 2;
  else if (colorsFg <= 18) photoScore -= 1;

  // Hohe lokale Varianz im Motiv → Foto/Gradient
  if (variance > 900) photoScore += 3;
  else if (variance > 420) photoScore += 2;
  else if (variance < 80) photoScore -= 1;

  // Dichte Kanten überall → Foto
  if (edges > 0.28) photoScore += 2;
  else if (edges > 0.18) photoScore += 1;
  else if (edges < 0.06) photoScore -= 1;

  // Uneinheitlicher Rand → oft Foto ohne Studio-Hintergrund
  if (!bgUniform && edgeSpread > 55) photoScore += 2;
  if (bgUniform) photoScore -= 1;

  // Fast vollflächig nach RemBg → eher Foto-Ausschnitt
  if (fg > 0.78) photoScore += 2;
  if (fg > 0.9) photoScore += 1;
  // Sehr wenig Motiv nach RemBg bei buntem Original → oft Foto mit komplexem BG
  if (fg < 0.02 && colorsOrig > 80) photoScore += 2;

  const kind = photoScore >= 4 ? 'photo' : 'logo';
  return { kind, score: photoScore, uniqueColors: colorsFg };
}

/** Auf Bounding-Box des Vordergrunds zuschneiden (+ Padding). */
export function cropToForeground(img: ImageData, pad = 4): ImageData {
  const w = img.width;
  const h = img.height;
  const d = img.data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3]! < 40) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return img;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = new ImageData(cw, ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((minY + y) * w + (minX + x)) * 4;
      const di = (y * cw + x) * 4;
      out.data[di] = d[si]!;
      out.data[di + 1] = d[si + 1]!;
      out.data[di + 2] = d[si + 2]!;
      out.data[di + 3] = d[si + 3]!;
    }
  }
  return out;
}

/**
 * Binarisieren für Trace: Vordergrund schwarz, Hintergrund weiß.
 * Nutzt Alpha nach RemBg.
 */
export function toPrintBinary(img: ImageData): ImageData {
  const out = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
  const d = out.data;
  const luminances: number[] = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 40) continue;
    luminances.push(lum(d[i]!, d[i + 1]!, d[i + 2]!));
  }
  if (!luminances.length) {
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = 255;
    }
    return out;
  }
  let sum = 0;
  for (const L of luminances) sum += L;
  const avg = sum / luminances.length;
  const thr = Math.min(200, Math.max(70, avg * 0.9));

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 40) {
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = 255;
      continue;
    }
    const L = lum(d[i]!, d[i + 1]!, d[i + 2]!);
    // Dunkle Pixel = Motiv; sehr helle Motive auf dunklem BG umkehren
    const ink = L < thr;
    const v = ink ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }

  // Wenn Motiv fast weiß (Logo war hell), invertieren
  let black = 0;
  let white = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i]! < 128) black++;
    else white++;
  }
  if (black > 0 && black / (black + white) < 0.04) {
    // zu wenig Schwarz – ggf. helles Logo: invert
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i]! < 128 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  return out;
}

function binaryInkMask(img: ImageData): Uint8Array {
  const w = img.width;
  const h = img.height;
  const m = new Uint8Array(w * h);
  const d = img.data;
  for (let p = 0, i = 0; i < d.length; i += 4, p++) {
    m[p] = d[i]! < 128 ? 1 : 0;
  }
  return m;
}

function countInk(mask: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
  return n;
}

/** Ein Schritt morphologische Erosion (4-Nachbarschaft). */
function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (
        mask[p] &&
        mask[p - 1] &&
        mask[p + 1] &&
        mask[p - w] &&
        mask[p + w]
      ) {
        out[p] = 1;
      }
    }
  }
  return out;
}

/** Kleine Inseln entfernen (unter minPixels). */
function removeSmallIslands(mask: Uint8Array, w: number, h: number, minPixels: number): { mask: Uint8Array; islands: number } {
  const visited = new Uint8Array(mask.length);
  const out = new Uint8Array(mask);
  let islands = 0;
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    islands++;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    const comp: number[] = [];
    while (stack.length) {
      const p = stack.pop()!;
      comp.push(p);
      const x = p % w;
      const y = (p / w) | 0;
      const nbs = [p - 1, p + 1, p - w, p + w];
      for (const n of nbs) {
        if (n < 0 || n >= mask.length) continue;
        const nx = n % w;
        const ny = (n / w) | 0;
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        if (!mask[n] || visited[n]) continue;
        visited[n] = 1;
        stack.push(n);
      }
    }
    if (comp.length < minPixels) {
      for (const p of comp) out[p] = 0;
      islands--;
    }
  }
  return { mask: out, islands };
}

function maskToImageData(mask: Uint8Array, w: number, h: number): ImageData {
  const img = new ImageData(w, h);
  const d = img.data;
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    const v = mask[p] ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  return img;
}

/**
 * 3D-Druck-Regeln (FDM-typisch, konservativ):
 * - Emboss-Linien ~≥ 0.8–1.0 mm → bei Analyseauflösung mind. ~2 px nach Erosion
 * - Motivanteil sinnvoll
 * - nicht zu viele Mikro-Inseln
 */
export function checkPrintability(binary: ImageData): LogoProcessFail | { ok: true; image: ImageData; foregroundRatio: number } {
  const w = binary.width;
  const h = binary.height;
  let mask = binaryInkMask(binary);
  const minIsland = Math.max(12, Math.floor((w * h) * 0.0004));
  const cleaned = removeSmallIslands(mask, w, h, minIsland);
  mask = cleaned.mask;

  const ink = countInk(mask);
  const ratio = ink / (w * h);

  if (ink < 40 || ratio < 0.012) {
    return { ok: false, reason: 'coverage', message: COVERAGE_MSG };
  }
  if (ratio > 0.62) {
    return { ok: false, reason: 'coverage', message: COVERAGE_MSG };
  }
  if (cleaned.islands > 48) {
    return { ok: false, reason: 'too_complex', message: COMPLEX_MSG };
  }

  // Zwei Erosionen: überlebt zu wenig, sind Linien zu dünn für FDM (~1 mm)
  const e1 = erode(mask, w, h);
  const e2 = erode(e1, w, h);
  const after = countInk(e2);
  const survive = after / Math.max(1, ink);
  if (survive < 0.12 && ink > 200) {
    return { ok: false, reason: 'too_thin', message: THIN_MSG };
  }
  // Sehr kleine Motive: eine Erosion reicht als Check
  if (ink <= 200) {
    const eOnce = countInk(e1);
    if (eOnce / Math.max(1, ink) < 0.2) {
      return { ok: false, reason: 'too_thin', message: THIN_MSG };
    }
  }

  return { ok: true, image: maskToImageData(mask, w, h), foregroundRatio: ratio };
}

/**
 * Vollpipeline: RemBg → Logo/Foto → Binär → Druckbarkeit.
 */
export function processLogoForPrint(src: ImageData): LogoProcessResult {
  const { image: cut, removed, bgUniform } = removeBackground(src);
  const cropped = cropToForeground(cut, 6);
  const cls = classifyLogoOrPhoto(src, cropped, bgUniform);

  if (cls.kind === 'photo') {
    return { ok: false, reason: 'photo', message: PHOTO_MSG };
  }

  if (foregroundRatio(cropped) < 0.008) {
    return { ok: false, reason: 'empty', message: COVERAGE_MSG };
  }

  const binary = toPrintBinary(cropped);
  const print = checkPrintability(binary);
  if (!print.ok) return print;

  return {
    ok: true,
    image: print.image,
    meta: {
      bgRemoved: removed,
      foregroundRatio: print.foregroundRatio,
      uniqueColors: cls.uniqueColors,
      kind: 'logo',
    },
  };
}
