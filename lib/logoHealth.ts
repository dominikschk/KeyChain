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

  // Vektor-SVG: grobe Farbvielfalt an path/fill
  const fills = new Set<string>();
  const re = /\bfill="(#[0-9a-fA-F]{3,8}|rgb\([^"]+\))"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const v = m[1]!.toLowerCase();
    if (v !== 'none') fills.add(v);
  }
  if (fills.size > 3) {
    return {
      level: 'warn',
      message: `Dein Logo hat viele Farben (${fills.size}). Beim Druck bleiben höchstens 3.`,
      willSimplifyForPrint: true,
    };
  }

  return {
    level: 'ok',
    message: '',
    willSimplifyForPrint: false,
  };
}
