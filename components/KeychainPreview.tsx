/**
 * Produktvorschau: Anhänger-Foto + Logo (frei verschiebbar) + Text + optionales Lineal.
 */
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import type { ModelConfig } from '../types';
import { extractRasterPngFromSvg, isRasterLogoSvg, shouldShowOriginalLogoColors } from '../lib/logoFromRaster';
import { exportKeychainStl } from '../lib/stlExport';
import {
  KEYCHAIN_CONTENT_ZONE,
  KEYCHAIN_PLATE_BOUNDS,
  clipContentZone,
  rectCenter,
  rectToCssPercent,
  zoneToPixels,
} from '../lib/keychainPlacement';
import {
  clampLogoPos,
  engraveFontCanvas,
  engraveFontCss,
} from '../lib/engraveFonts';
import { PreviewRuler } from './PreviewRuler';
import { keychainPhotoForPlate } from '../lib/keychainPhotos';

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
  onConfigChange?: (patch: Partial<ModelConfig>) => void;
};

export const KeychainPreview = forwardRef<KeychainPreviewHandle, Props>(
  ({ config, svgContent, onConfigChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const baseImgRef = useRef<HTMLImageElement | null>(null);
    const zoneRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      originPosX: number;
      originPosY: number;
      zoneW: number;
      zoneH: number;
    } | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [showRuler, setShowRuler] = useState(true);
    const [dragging, setDragging] = useState(false);

    const plate = config.plateColor || '#F8F5F0';
    const plateW = config.plateWidth || 40;
    const plateH = config.plateHeight || 40;
    const logoColor = config.logoColor || '#111111';
    const textColor = config.engraveColor || config.logoColor || '#111111';
    const layout = config.engraveLayout || 'logo_above';
    const text = (config.engraveText || '').trim();
    const gap = Math.max(0, Math.min(100, config.engraveGap ?? 40));
    const engraveFont = config.engraveFont || 'bold';
    const platePhoto = keychainPhotoForPlate(plate);
    const showLogo =
      (layout === 'logo_only' || layout === 'logo_above' || layout === 'text_above') &&
      !!svgContent?.trim();
    const showText =
      (layout === 'text_only' || layout === 'logo_above' || layout === 'text_above') && !!text;
    const canDrag = !!onConfigChange && (showLogo || showText);
    /** Overlay nur wenn kein passendes Farbfoto – und dann weich, ohne harten Kantenrahmen */
    const useSoftPlateTint = !platePhoto.bakedIn;

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
              setLogoUrl(null);
              return;
            }
            if (shouldShowOriginalLogoColors(svgContent, logoColor)) {
              if (!cancelled) setLogoUrl(png);
              return;
            }
            const tinted = await colorizeLogoPng(png, logoColor);
            if (!cancelled) setLogoUrl(tinted);
            return;
          }
          if (!cancelled) setLogoUrl(svgToDataUrl(tintSvg(svgContent, logoColor)));
        } catch {
          if (!cancelled) setLogoUrl(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [svgContent, logoColor]);

    const loadBase = useCallback((): Promise<HTMLImageElement> => {
      const src = platePhoto.src;
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          baseImgRef.current = img;
          resolve(img);
        };
        img.onerror = () => reject(new Error('Basisbild fehlt'));
        img.src = src;
      });
    }, [platePhoto.src]);

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
        const drawW = size * 0.92;
        const drawH = drawW;
        const dx = (size - drawW) / 2;
        const dy = (size - drawH) / 2;
        ctx.drawImage(base, dx, dy, drawW, drawH);

        const platePx = zoneToPixels(KEYCHAIN_PLATE_BOUNDS, dx, dy, drawW, drawH);
        const zonePx = zoneToPixels(KEYCHAIN_CONTENT_ZONE, dx, dy, drawW, drawH);
        const center = rectCenter(KEYCHAIN_CONTENT_ZONE);
        const cx = dx + center.x * drawW + config.logoPosX * (zonePx.w * 0.02);
        const contentY = dy + center.y * drawH - config.logoPosY * (zonePx.h * 0.02);
        const gapPx = 8 + gap * 0.35;

        if (useSoftPlateTint) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = plate;
          roundRect(ctx, platePx.x, platePx.y, platePx.w, platePx.h, Math.min(platePx.w, platePx.h) * 0.12);
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        clipContentZone(ctx, dx, dy, drawW, drawH);

        if (showLogo && logoUrl) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const maxW = zonePx.w * 0.62 * config.logoScale;
              const ratio = img.height / Math.max(1, img.width);
              const lw = maxW;
              const lh = maxW * ratio;
              let ly = contentY;
              if (layout === 'logo_above' && showText) ly = contentY - gapPx / 2 - lh * 0.35;
              if (layout === 'text_above' && showText) ly = contentY + gapPx / 2 + lh * 0.2;
              if (layout === 'logo_only') ly = contentY;
              ctx.save();
              ctx.translate(cx, ly);
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
          let ty = contentY;
          if (layout === 'logo_above' && showLogo) ty = contentY + gapPx / 2 + zonePx.h * 0.12;
          if (layout === 'text_above' && showLogo) ty = contentY - gapPx / 2 - zonePx.h * 0.1;
          if (layout === 'text_only') ty = contentY;
          if (layout === 'logo_above' && !showLogo) ty = contentY;
          const fontPx = Math.round(zonePx.w * 0.09 * Math.min(1.35, config.logoScale));
          ctx.save();
          ctx.fillStyle = textColor;
          ctx.font = `700 ${fontPx}px ${engraveFontCanvas(engraveFont)}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText(text.slice(0, 28).toUpperCase(), cx, ty);
          ctx.restore();
        }

        ctx.restore();
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
      useSoftPlateTint,
      plate,
      showLogo,
      showText,
      logoUrl,
      text,
      layout,
      gap,
      textColor,
      engraveFont,
      config,
    ]);

    useEffect(() => {
      void paintCanvas();
    }, [paintCanvas]);

    useImperativeHandle(ref, () => ({
      takeScreenshot: () => paintCanvas(),
      exportSTL: () => exportKeychainStl(config, svgContent),
    }));

    const onDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canDrag || !zoneRef.current) return;
      e.preventDefault();
      const rect = zoneRef.current.getBoundingClientRect();
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originPosX: config.logoPosX,
        originPosY: config.logoPosY,
        zoneW: Math.max(1, rect.width),
        zoneH: Math.max(1, rect.height),
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    };

    const onDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId || !onConfigChange) return;
      const dxPx = e.clientX - d.startX;
      const dyPx = e.clientY - d.startY;
      // transform: translate(posX * 1.2%, -posY * 1.2%) of content zone
      const deltaPosX = (dxPx / d.zoneW) * 100 / 1.2;
      const deltaPosY = (-dyPx / d.zoneH) * 100 / 1.2;
      onConfigChange({
        logoPosX: clampLogoPos(d.originPosX + deltaPosX),
        logoPosY: clampLogoPos(d.originPosY + deltaPosY),
      });
    };

    const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setDragging(false);
    };

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
          <div className="relative aspect-square flex items-center justify-center overflow-visible">
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-navy/40 pointer-events-none">
                Live-Vorschau
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold tabular-nums text-navy/35 pointer-events-none">
                  {plateW}×{plateH} mm
                </span>
                <button
                  type="button"
                  onClick={() => setShowRuler((v) => !v)}
                  className={`min-h-[32px] px-2.5 rounded-lg border text-[10px] font-bold transition-colors ${
                    showRuler
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white/90 text-navy border-navy/15 hover:border-petrol/40'
                  }`}
                  aria-pressed={showRuler}
                >
                  {showRuler ? 'Lineal aus' : 'Lineal an'}
                </button>
              </div>
            </div>

            <div className={`relative w-[92%] max-w-[500px] ${showRuler ? 'mt-9 mb-7 mx-3' : 'mt-8'}`}>
              {showRuler && (
                <PreviewRuler
                  widthMm={plateW}
                  heightMm={plateH}
                  logoScale={config.logoScale}
                  onLogoScaleChange={
                    onConfigChange
                      ? (scale) => onConfigChange({ logoScale: Math.min(1.8, Math.max(0.4, scale)) })
                      : undefined
                  }
                />
              )}
              <img
                src={platePhoto.src}
                alt="Schlüsselanhänger"
                className="w-full h-auto select-none pointer-events-none"
                draggable={false}
              />
              {useSoftPlateTint && (
                <div
                  className="absolute pointer-events-none mix-blend-multiply opacity-30"
                  style={{
                    ...rectToCssPercent(KEYCHAIN_PLATE_BOUNDS),
                    backgroundColor: plate,
                    borderRadius: '18%',
                    filter: 'blur(0.6px)',
                  }}
                  aria-hidden
                />
              )}

              <div
                ref={zoneRef}
                className={`absolute overflow-hidden flex flex-col items-center justify-center z-10 ${
                  canDrag ? 'cursor-grab touch-none select-none' : 'pointer-events-none'
                } ${dragging ? 'cursor-grabbing' : ''}`}
                style={{
                  ...rectToCssPercent(KEYCHAIN_CONTENT_ZONE),
                  gap: `${4 + gap * 0.1}px`,
                  flexDirection: layout === 'text_above' ? 'column-reverse' : 'column',
                  transform: `translate(${config.logoPosX * 1.2}%, ${-config.logoPosY * 1.2}%)`,
                  borderRadius: '10%',
                  outline: dragging ? '1px dashed rgba(0,102,153,0.45)' : undefined,
                }}
                onPointerDown={canDrag ? onDragPointerDown : undefined}
                onPointerMove={canDrag ? onDragPointerMove : undefined}
                onPointerUp={canDrag ? endDrag : undefined}
                onPointerCancel={canDrag ? endDrag : undefined}
                role={canDrag ? 'button' : undefined}
                aria-label={canDrag ? 'Logo und Text verschieben' : undefined}
                title={canDrag ? 'Ziehen zum Verschieben' : undefined}
              >
                {showLogo && logoUrl && (
                  <img
                    src={logoUrl}
                    alt=""
                    className="max-w-[72%] max-h-[58%] object-contain drop-shadow-sm pointer-events-none"
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
                    className={`text-center uppercase tracking-wide leading-none px-1 max-w-full pointer-events-none ${engraveFontCss(engraveFont)}`}
                    style={{
                      color: textColor,
                      fontSize: `clamp(10px, ${2.1 * config.logoScale}vw, 18px)`,
                      textShadow: '0 1px 1px rgba(0,0,0,0.15)',
                    }}
                  >
                    {text}
                  </p>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] font-medium tracking-wide text-navy/40 max-w-sm mx-auto leading-snug">
            {canDrag
              ? 'Logo/Text ziehen · Lineal an/aus · Größe am rechten Griff · unverbindliche Vorschau'
              : 'Unverbindliche Vorschau – Farben können im 3D-Druck abweichen.'}
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
