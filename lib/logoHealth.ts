/**
 * Logo-Hinweise vor dem Speichern – kundenfreundlich, nicht technisch.
 */
import { isRasterLogoSvg, keepsOriginalLogoColors } from './logoFromRaster';

export type LogoHealthLevel = 'ok' | 'info' | 'warn';

export type LogoHealth = {
  level: LogoHealthLevel;
  /** Kurzer Hinweis für die UI */
  message: string;
  /** true = beim Druck wird vereinfacht (max. 3 Farben) */
  willSimplifyForPrint: boolean;
};

function countVectorFills(svg: string): number {
  const fills = new Set<string>();
  const re = /\bfill="(#[0-9a-fA-F]{3,8}|rgb\([^"]+\))"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const v = m[1]!.toLowerCase();
    if (v !== 'none') fills.add(v);
  }
  return fills.size;
}

/** Sehr feine Linien wirken im Prägedruck oft unscharf. */
function hasVeryThinStrokes(svg: string): boolean {
  const re = /\bstroke-width="([0-9.]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const w = parseFloat(m[1]!);
    if (Number.isFinite(w) && w > 0 && w < 0.35) return true;
  }
  return false;
}

export function assessLogoHealth(svgContent: string | null | undefined): LogoHealth {
  const svg = svgContent?.trim() || '';
  if (!svg) {
    return {
      level: 'ok',
      message: '',
      willSimplifyForPrint: false,
    };
  }

  if (isRasterLogoSvg(svg)) {
    const hasPrint = /data-has-print="1"/i.test(svg) || keepsOriginalLogoColors(svg);
    // Sehr kleine eingebettete PNGs → unscharf auf dem Anhänger
    const tinyRaster = /data-width="(\d+)"/i.exec(svg);
    const w = tinyRaster ? parseInt(tinyRaster[1]!, 10) : 0;
    if (w > 0 && w < 200) {
      return {
        level: 'warn',
        message:
          'Dein Logo wirkt für den Druck eher klein/unscharf. Am besten eine klarere Datei hochladen.',
        willSimplifyForPrint: true,
      };
    }
    if (hasPrint || keepsOriginalLogoColors(svg)) {
      return {
        level: 'info',
        message:
          'Für den Druck wird dein Logo auf höchstens 3 Farben vereinfacht.',
        willSimplifyForPrint: true,
      };
    }
    return {
      level: 'ok',
      message: '',
      willSimplifyForPrint: false,
    };
  }

  const fillCount = countVectorFills(svg);
  if (fillCount > 3) {
    return {
      level: 'warn',
      message: `Dein Logo hat viele Farben (${fillCount}). Beim Druck bleiben höchstens 3.`,
      willSimplifyForPrint: true,
    };
  }

  if (hasVeryThinStrokes(svg)) {
    return {
      level: 'info',
      message:
        'Sehr feine Linien können beim Prägen weniger klar wirken – wir vereinfachen das für den Druck etwas.',
      willSimplifyForPrint: true,
    };
  }

  return {
    level: 'ok',
    message: '',
    willSimplifyForPrint: false,
  };
}
