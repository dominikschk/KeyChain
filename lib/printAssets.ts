/**
 * Druck-Assets aus der Logo-SVG für Speichern / Admin-Produktion.
 */
import { extractPrintPngFromSvg, isRasterLogoSvg, svgForProduction } from './logoFromRaster';

/** data:image/...;base64,... → Blob */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isBase64 = !!m[2];
  const data = m[3] || '';
  try {
    if (isBase64) {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(data)], { type: mime });
  } catch {
    return null;
  }
}

export type ProductionPrintAssets = {
  /** SVG nur mit Druckversion (max. 3 Farben bei Raster). */
  productionSvg: string;
  /** PNG-Blob für Storage-Upload, falls aus Raster extrahierbar. */
  printPngBlob: Blob | null;
};

/**
 * Bereitet druckfertige Assets vor. Vektor-SVG: kein PNG-Blob (SVG reicht).
 */
export function buildProductionPrintAssets(svgContent: string | null | undefined): ProductionPrintAssets | null {
  const raw = svgContent?.trim();
  if (!raw) return null;
  const productionSvg = svgForProduction(raw);
  let printPngBlob: Blob | null = null;
  if (isRasterLogoSvg(raw) || isRasterLogoSvg(productionSvg)) {
    const pngUrl = extractPrintPngFromSvg(productionSvg);
    if (pngUrl) printPngBlob = dataUrlToBlob(pngUrl);
  }
  return { productionSvg, printPngBlob };
}
