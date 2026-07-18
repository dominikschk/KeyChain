/**
 * Produktvorschau: Anhänger-Foto + Logo (Raster eingefärbt oder SVG-Pfade).
 */
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import type { ModelConfig } from '../types';
import { extractRasterPngFromSvg, isRasterLogoSvg } from '../lib/logoFromRaster';

const BASE_IMG = '/keychain-base.png';

function tintSvg(svg: string, color: string): string {
  let out = svg;
  out = out.replace(/\sfill="(?!none)[^"]*"/gi, ` fill="${color}"`);
  out = out.replace(/\sstroke="(?!none)[^"]*"/gi, ` stroke="${color}"`);
  if (!/\sfill=/i.test(out) && /<path\b/i.test(out)) {
    out = out.replace(/<path\b/gi, `<path fill="${color}"`);
  }
  return out;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function parseCssColor(color: string): { r: number; g: number; b: number } {
  const c = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (rgb) return { r: +rgb[1]!, g: +rgb[2]!, b: +rgb[3]! };
  return { r: 17, g: 17, b: 17 };
}

/** Schwarzes Logo-PNG in Druckfarbe einfärben (Alpha bleibt). */
async function colorizeLogoPng(pngDataUrl: string, color: string): Promise<string> {
  const { r, g, b } = parseCssColor(color);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Logo-PNG fehlt'));
    el.src = pngDataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return pngDataUrl;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 8) continue;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

export type KeychainPreviewHandle = {
  takeScreenshot: () => Promise<string>;
  exportSTL: () => Promise<Blob | null>;
};

type Props = {
  config: ModelConfig;
  svgContent: string | null;
};

export const KeychainPreview = forwardRef<KeychainPreviewHandle, Props>(
  ({ config, svgContent }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const baseImgRef = useRef<HTMLImageElement | null>(null);
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

    const plate = config.plateColor || '#F8F5F0';
    const printColor = config.logoColor || '#111111';
    const layout = config.engraveLayout || 'logo_above';
    const text = (config.engraveText || '').trim();
    const gap = Math.max(0, Math.min(100, config.engraveGap ?? 40));
    const showLogo =
      (layout === 'logo_only' || layout === 'logo_above' || layout === 'text_above') &&
      !!svgContent?.trim();
    const showText =
      (layout === 'text_only' || layout === 'logo_above' || layout === 'text_above') && !!text;

    const isDefaultPlate =
      !config.plateColor ||
      config.plateColor.toLowerCase() === '#f8f5f0' ||
      config.plateColor.toLowerCase() === '#ffffff';

    useEffect(() => {
      let cancelled = false;
      (async () => {
        if (!svgContent?.trim()) {
          setLogoUrl(null);
          return;
        }
        try {
          if (isRasterLogoSvg(svgContent)) {
            const png = extractRasterPngFromSvg(svgContent);
            if (!png) {
              if (!cancelled) setLogoUrl(null);
              return;
            }
            const colored = await colorizeLogoPng(png, printColor);
            if (!cancelled) setLogoUrl(colored);
            return;
          }
          if (!cancelled) setLogoUrl(svgToDataUrl(tintSvg(svgContent, printColor)));
        } catch {
          if (!cancelled) setLogoUrl(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [svgContent, printColor]);

    const loadBase = useCallback(() => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        if (baseImgRef.current?.complete && baseImgRef.current.naturalWidth) {
          resolve(baseImgRef.current);
          return;
        }
        const img = new Image();
        img.onload = () => {
          baseImgRef.current = img;
          resolve(img);
        };
        img.onerror = () => reject(new Error('Basisbild fehlt'));
        img.src = BASE_IMG;
      });
    }, []);

    const paintCanvas = useCallback(async (): Promise<string> => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      const size = 900;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(0, 0, size, size);

      try {
        const base = await loadBase();
        const drawW = size * 0.82;
        const drawH = drawW;
        const dx = (size - drawW) / 2;
        const dy = (size - drawH) / 2;
        ctx.drawImage(base, dx, dy, drawW, drawH);

        if (!isDefaultPlate) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = plate;
          ctx.beginPath();
          const pad = drawW * 0.12;
          roundRect(ctx, dx + pad, dy + pad * 1.15, drawW - pad * 2, drawH - pad * 2.1, drawW * 0.12);
          ctx.fill();
          ctx.restore();
        }

        const cx = size / 2;
        const contentY = dy + drawH * 0.52;
        const gapPx = 10 + gap * 0.4;

        if (showLogo && logoUrl) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const maxW = drawW * 0.28 * config.logoScale;
              const ratio = img.height / Math.max(1, img.width);
              const lw = maxW;
              const lh = maxW * ratio;
              let ly = contentY;
              if (layout === 'logo_above' && showText) ly = contentY - gapPx / 2 - lh * 0.35;
              if (layout === 'text_above' && showText) ly = contentY + gapPx / 2 + lh * 0.2;
              if (layout === 'logo_only') ly = contentY - drawH * 0.02;
              ctx.save();
              ctx.translate(cx + config.logoPosX * 3, ly - config.logoPosY * 3);
              ctx.rotate(((config.logoRotation || 0) * Math.PI) / 180);
              ctx.scale(config.mirrorX ? -1 : 1, 1);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.shadowColor = 'rgba(0,0,0,0.18)';
              ctx.shadowBlur = 2;
              ctx.shadowOffsetY = 1;
              ctx.drawImage(img, -lw / 2, -lh / 2, lw, lh);
              ctx.restore();
              resolve();
            };
            img.onerror = () => resolve();
            img.src = logoUrl;
          });
        }

        if (showText) {
          let ty = contentY + drawH * 0.12;
          if (layout === 'logo_above' && showLogo) ty = contentY + gapPx / 2 + drawH * 0.08;
          if (layout === 'text_above' && showLogo) ty = contentY - gapPx / 2 - drawH * 0.06;
          if (layout === 'text_only') ty = contentY + drawH * 0.04;
          ctx.save();
          ctx.fillStyle = printColor;
          ctx.font = `800 ${Math.round(26 * Math.min(1.35, config.logoScale))}px Arial, Helvetica, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText(text.slice(0, 28).toUpperCase(), cx, ty);
          ctx.restore();
        }
      } catch {
        ctx.fillStyle = '#fff';
        ctx.fillRect(80, 80, size - 160, size - 160);
        ctx.fillStyle = '#999';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Vorschau nicht geladen', size / 2, size / 2);
      }

      return canvas.toDataURL('image/jpeg', 0.92);
    }, [
      loadBase,
      isDefaultPlate,
      plate,
      showLogo,
      showText,
      logoUrl,
      text,
      layout,
      gap,
      printColor,
      config,
    ]);

    useEffect(() => {
      void paintCanvas();
    }, [paintCanvas]);

    useImperativeHandle(ref, () => ({
      takeScreenshot: () => paintCanvas(),
      exportSTL: async () => null,
    }));

    return (
      <div
        className="w-full h-full flex items-center justify-center p-4 md:p-10 relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, #ffffff 0%, #e8eef5 45%, #d4dde8 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(18,169,224,0.12), transparent 40%), radial-gradient(circle at 80% 70%, rgba(17,35,90,0.08), transparent 45%)',
          }}
          aria-hidden
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <div className="relative w-full max-w-[560px]">
          <div className="absolute -inset-3 rounded-[1.25rem] bg-white/40 blur-xl" aria-hidden />
          <div className="relative aspect-square rounded-2xl bg-white/90 border border-navy/10 shadow-[0_20px_60px_-28px_rgba(17,35,90,0.45)] flex items-center justify-center overflow-hidden">
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-navy/40">Live-Vorschau</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-petrol/70">Druckfertig</span>
            </div>
            <div className="relative w-[86%] max-w-[440px] mt-2">
              <img
                src={BASE_IMG}
                alt="Schlüsselanhänger"
                className="w-full h-auto select-none pointer-events-none drop-shadow-md"
                draggable={false}
              />
              {!isDefaultPlate && (
                <div
                  className="absolute inset-[14%] rounded-[18%] pointer-events-none mix-blend-multiply opacity-45"
                  style={{ backgroundColor: plate, top: '16%', bottom: '12%', left: '14%', right: '14%' }}
                  aria-hidden
                />
              )}

              <div
                className="absolute left-1/2 flex flex-col items-center justify-center pointer-events-none"
                style={{
                  width: '48%',
                  top: '38%',
                  height: '42%',
                  transform: 'translateX(-50%)',
                  gap: `${4 + gap * 0.1}px`,
                  flexDirection: layout === 'text_above' ? 'column-reverse' : 'column',
                }}
              >
                {showLogo && logoUrl && (
                  <img
                    src={logoUrl}
                    alt=""
                    className="max-w-full max-h-[55%] object-contain drop-shadow-sm"
                    style={{
                      transform: `scale(${config.mirrorX ? -config.logoScale : config.logoScale}, ${config.logoScale}) rotate(${config.logoRotation || 0}deg)`,
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.18))',
                      imageRendering: 'auto',
                    }}
                    draggable={false}
                  />
                )}
                {showText && (
                  <p
                    className="text-center font-extrabold uppercase tracking-wide leading-none px-1"
                    style={{
                      color: printColor,
                      fontSize: `clamp(11px, ${2.4 * config.logoScale}vw, 20px)`,
                      textShadow: '0 1px 1px rgba(0,0,0,0.15)',
                    }}
                  >
                    {text}
                  </p>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] font-semibold tracking-wide text-navy/35 uppercase">
            Produktvorschau · Maßstab approximativ
          </p>
        </div>
      </div>
    );
  }
);

KeychainPreview.displayName = 'KeychainPreview';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
