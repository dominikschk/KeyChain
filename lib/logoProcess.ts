/**
 * Regelbasierte Logo-Aufbereitung für 3D-Druck (ohne KI):
 * 1) Hintergrund entfernen
 * 2) Foto vs. Logo erkennen → Fotos ablehnen
 * 3) Druckbarkeit prüfen (Linienstärke, Fläche, Inseln)
 */

export type LogoProcessOk = {
  ok: true;
  /** Druck-/Prüfmaske (binär). */
  image: ImageData;
  /** Saubere Vorlage fürs Vektorisieren (Logo auf Weiß, ohne Treppen-Maske). */
  traceImage: ImageData;
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

  // Bereits transparente Logos: Alpha behalten, nur Rest ggf. säubern
  let transparentShare = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 40) transparentShare++;
  }
  transparentShare /= d.length / 4;

  const samples = sampleEdgeColors(src);
  const bg = dominantColor(samples);
  const spread = edgeColorSpread(samples);
  const bgUniform = spread < 48;
  const bgLum = bg ? lum(bg.r, bg.g, bg.b) : 255;
  const bgIsLight = bgLum > 220;
  const bgIsDark = bgLum < 40;

  // Helle Studio-/PNG-Hintergründe etwas großzügiger entfernen
  let tol = bgUniform ? 52 : 34;
  if (bgIsLight) tol = Math.max(tol, 58);
  if (bgIsDark) tol = Math.max(tol, 48);

  const wipeNearNeutral = (threshold: number) => {
    let removedAny = false;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3]! < 10) continue;
      const L = lum(d[i]!, d[i + 1]!, d[i + 2]!);
      const max = Math.max(d[i]!, d[i + 1]!, d[i + 2]!);
      const min = Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (L > threshold && sat < 0.14) {
        d[i + 3] = 0;
        removedAny = true;
      }
    }
    return removedAny;
  };

  if (!bg || (!bgUniform && spread > 85)) {
    const removedAny = wipeNearNeutral(242);
    return { image: out, removed: removedAny || transparentShare > 0.02, bgUniform: false };
  }

  const visited = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qh = 0;
  let qt = 0;

  const matchesBg = (r: number, g: number, b: number, limit: number) => {
    if (colorDist(r, g, b, bg.r, bg.g, bg.b) <= limit) return true;
    // Zusätzlich: fast weiß/schwarz wie der Rand
    const L = lum(r, g, b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (bgIsLight && L > 232 && sat < 0.16) return true;
    if (bgIsDark && L < 28 && sat < 0.2) return true;
    return false;
  };

  const trySeed = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (d[i + 3]! < 10) {
      visited[idx] = 1;
      return;
    }
    if (!matchesBg(d[i]!, d[i + 1]!, d[i + 2]!, tol)) return;
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
      if (!matchesBg(d[ni]!, d[ni + 1]!, d[ni + 2]!, tol)) continue;
      visited[nidx] = 1;
      qx[qt] = nx;
      qy[qt] = ny;
      qt++;
    }
  }

  // Restnahe BG-Farbe (JPEG-Rauschen) vorsichtig nachziehen
  const tight = Math.max(22, tol * 0.62);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 10) continue;
    if (matchesBg(d[i]!, d[i + 1]!, d[i + 2]!, tight)) {
      d[i + 3] = 0;
    }
  }

  if (bgIsLight) wipeNearNeutral(248);

  return { image: out, removed: qt > 0 || transparentShare > 0.02, bgUniform };
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
 * Foto vs. Logo – nur klare Fotos ablehnen.
 * Im Zweifel = Logo (JPEG-Kompression / Anti-Aliasing erzeugen viele Farben).
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

  let transparentShare = 0;
  const od = original.data;
  for (let i = 0; i < od.length; i += 4) {
    if (od[i + 3]! < 40) transparentShare++;
  }
  transparentShare /= od.length / 4;

  let photoScore = 0;
  let strong = 0;

  // JPEG-Logos haben oft 80–200 „Farben“ durch Dithering – das allein ist kein Foto
  if (colorsOrig > 380) {
    photoScore += 2;
    strong++;
  } else if (colorsOrig > 260) {
    photoScore += 1;
  }
  if (colorsOrig <= 40) photoScore -= 2;

  if (colorsFg > 180) {
    photoScore += 1;
    strong++;
  } else if (colorsFg <= 28) {
    photoScore -= 1;
  }

  if (variance > 1400) {
    photoScore += 3;
    strong++;
  } else if (variance > 800) {
    photoScore += 1;
  } else if (variance < 120) {
    photoScore -= 2;
  }

  if (edges > 0.38) {
    photoScore += 2;
    strong++;
  } else if (edges > 0.26) {
    photoScore += 1;
  } else if (edges < 0.08) {
    photoScore -= 1;
  }

  if (!bgUniform && edgeSpread > 75) {
    photoScore += 2;
    strong++;
  }
  if (bgUniform) photoScore -= 2;

  if (fg > 0.92 && variance > 500) {
    photoScore += 2;
    strong++;
  } else if (fg > 0.85 && !bgUniform) {
    photoScore += 1;
  }

  // PNG mit Alpha → sehr wahrscheinlich Logo
  if (transparentShare > 0.08) photoScore -= 3;
  if (transparentShare > 0.25) photoScore -= 2;

  // Nur ablehnen, wenn mehrere starke Foto-Signale zusammenkommen
  const kind = photoScore >= 7 && strong >= 2 ? 'photo' : 'logo';
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
 * Binarisieren: nach RemBg ist fast alles Opake = Motiv (auch helle/farbige Logos).
 */
export function toPrintBinary(img: ImageData): ImageData {
  const out = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
  const d = out.data;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]!;
    if (a < 40) {
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = 255;
      continue;
    }
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const L = lum(r, g, b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    // Rest-Hintergrund (fast weiß, ungesättigt) verwerfen – farbige/helle Logos behalten
    const leftoverBg = L > 236 && sat < 0.12;
    const ink = !leftoverBg;
    const v = ink ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }

  let black = 0;
  let white = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i]! < 128) black++;
    else white++;
  }
  // Falls RemBg nichts getan hat und Motiv dunkel auf hell: klassische Schwelle
  if (black / Math.max(1, black + white) < 0.015) {
    for (let i = 0; i < img.data.length; i += 4) {
      const L = lum(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!);
      const v = L < 160 ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
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

/** Ein Schritt morphologische Dilatation (4-Nachbarschaft) – Linien verdicken. */
function dilate(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (mask[p]) continue;
      if (mask[p - 1] || mask[p + 1] || mask[p - w] || mask[p + w]) out[p] = 1;
    }
  }
  return out;
}

/**
 * 3D-Druck-Regeln – im Zweifel akzeptieren und feine Linien verdicken.
 */
export function checkPrintability(binary: ImageData): LogoProcessFail | { ok: true; image: ImageData; foregroundRatio: number } {
  const w = binary.width;
  const h = binary.height;
  let mask = binaryInkMask(binary);
  const minIsland = Math.max(8, Math.floor((w * h) * 0.00025));
  const cleaned = removeSmallIslands(mask, w, h, minIsland);
  mask = cleaned.mask;

  let ink = countInk(mask);
  let ratio = ink / (w * h);

  if (ink < 24 || ratio < 0.006) {
    return { ok: false, reason: 'coverage', message: COVERAGE_MSG };
  }

  // Fast vollflächig: eher Rest-Hintergrund – versuchen, nur dunklere Kerne zu behalten hilft selten;
  // hier trotzdem durchlassen bis 88 %, Trace braucht Motiv.
  if (ratio > 0.88) {
    return { ok: false, reason: 'coverage', message: COVERAGE_MSG };
  }
  if (cleaned.islands > 90) {
    return { ok: false, reason: 'too_complex', message: COMPLEX_MSG };
  }

  const e1 = erode(mask, w, h);
  const survive = countInk(e1) / Math.max(1, ink);

  // Zu dünn → einmal verdicken (nicht 2× – sonst Treppen/Rauschen)
  if (survive < 0.22 && ink > 80) {
    mask = dilate(mask, w, h);
    ink = countInk(mask);
    ratio = ink / (w * h);
  }

  return { ok: true, image: maskToImageData(mask, w, h), foregroundRatio: ratio };
}

/** Motiv auf Weiß – behält weiche Kanten für sauberes Tracing. */
export function compositeOnWhite(img: ImageData): ImageData {
  const out = new ImageData(img.width, img.height);
  const s = img.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const a = s[i + 3]! / 255;
    d[i] = Math.round(s[i]! * a + 255 * (1 - a));
    d[i + 1] = Math.round(s[i + 1]! * a + 255 * (1 - a));
    d[i + 2] = Math.round(s[i + 2]! * a + 255 * (1 - a));
    d[i + 3] = 255;
  }
  return out;
}

export type ProcessLogoOptions = {
  /** Wenn vecburner Logo/Simple/Lineart empfiehlt: Foto-Reject überspringen. */
  forceLogo?: boolean;
};

function okResult(
  printImage: ImageData,
  traceImage: ImageData,
  meta: LogoProcessOk['meta']
): LogoProcessOk {
  return { ok: true, image: printImage, traceImage, meta };
}

/**
 * Vollpipeline: RemBg → Logo/Foto → Binär-Check → Trace-Vorlage separat.
 */
export function processLogoForPrint(src: ImageData, options: ProcessLogoOptions = {}): LogoProcessResult {
  const { image: cut, removed, bgUniform } = removeBackground(src);
  let cropped = cropToForeground(cut, 6);
  let cls = classifyLogoOrPhoto(src, cropped, bgUniform);

  if (foregroundRatio(cropped) < 0.008) {
    const soft = removeBackground(src);
    cropped = soft.image;
    cls = classifyLogoOrPhoto(src, cropped, soft.bgUniform);
  }

  if (cls.kind === 'photo' && !options.forceLogo) {
    return { ok: false, reason: 'photo', message: PHOTO_MSG };
  }

  const baseMeta = {
    bgRemoved: removed,
    uniqueColors: cls.uniqueColors,
    kind: 'logo' as const,
  };

  if (foregroundRatio(cropped) < 0.004) {
    const opaque = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    const d = opaque.data;
    for (let i = 0; i < d.length; i += 4) d[i + 3] = 255;
    const fallback = toPrintBinary(opaque);
    const printFb = checkPrintability(fallback);
    if (!printFb.ok) return { ok: false, reason: 'empty', message: COVERAGE_MSG };
    return okResult(printFb.image, compositeOnWhite(opaque), {
      ...baseMeta,
      bgRemoved: false,
      foregroundRatio: printFb.foregroundRatio,
    });
  }

  const traceImage = compositeOnWhite(cropped);
  const binary = toPrintBinary(cropped);
  const print = checkPrintability(binary);
  if (!print.ok) {
    const copy = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    const d = copy.data;
    for (let i = 0; i < d.length; i += 4) {
      const L = lum(d[i]!, d[i + 1]!, d[i + 2]!);
      const max = Math.max(d[i]!, d[i + 1]!, d[i + 2]!);
      const min = Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (L > 240 && sat < 0.1) d[i + 3] = 0;
      else d[i + 3] = 255;
    }
    const cropped2 = cropToForeground(copy, 4);
    const direct = toPrintBinary(cropped2);
    const print2 = checkPrintability(direct);
    if (!print2.ok) return print;
    return okResult(print2.image, compositeOnWhite(cropped2), {
      ...baseMeta,
      foregroundRatio: print2.foregroundRatio,
    });
  }

  return okResult(print.image, traceImage, {
    ...baseMeta,
    foregroundRatio: print.foregroundRatio,
  });
}
