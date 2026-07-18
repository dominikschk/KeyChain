/**
 * Produktvorschau im Shop-Stil (pens.com): weiße Karte, realistischer Anhänger, Logo + Text.
 */
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo, useCallback } from 'react';
import type { ModelConfig } from '../types';

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
    const cardRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const plate = config.plateColor || '#F8F5F0';
    const printColor = config.logoColor || '#111111';
    const hasChain = config.hasChain !== false;
    const layout = config.engraveLayout || 'logo_above';
    const text = (config.engraveText || '').trim();
    const gap = Math.max(0, Math.min(100, config.engraveGap ?? 40));
    const showLogo = (layout === 'logo_only' || layout === 'logo_above' || layout === 'text_above') && !!svgContent?.trim();
    const showText = (layout === 'text_only' || layout === 'logo_above' || layout === 'text_above') && !!text;

    const logoUrl = useMemo(() => {
      if (!svgContent?.trim()) return null;
      try {
        return svgToDataUrl(tintSvg(svgContent, printColor));
      } catch {
        return null;
      }
    }, [svgContent, printColor]);

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
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 48, 48, size - 96, size - 96, 8);
      ctx.fill();

      const plateSize = 420;
      const px = (size - plateSize) / 2;
      const py = (size - plateSize) / 2 + 10;
      const radius = 72;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.14)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      roundRect(ctx, px, py, plateSize, plateSize, radius);
      ctx.fillStyle = plate;
      ctx.fill();
      ctx.restore();

      roundRect(ctx, px, py, plateSize, plateSize, radius);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const holeR = 28;
      const hx = px + 52;
      const hy = py + 52;
      ctx.beginPath();
      ctx.arc(hx, hy, holeR, 0, Math.PI * 2);
      ctx.fillStyle = '#F3F4F6';
      ctx.fill();

      if (hasChain) {
        ctx.beginPath();
        ctx.arc(hx - 4, hy - 8, 34, 0, Math.PI * 2);
        ctx.strokeStyle = '#A8A8A8';
        ctx.lineWidth = 7;
        ctx.stroke();
      }

      // NFC hint (subtle)
      ctx.beginPath();
      ctx.arc(px + plateSize / 2, py + plateSize * 0.38, 58, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fill();

      const contentTop = py + plateSize * 0.52;
      const cx = px + plateSize / 2;
      const gapPx = 8 + gap * 0.35;

      if (showLogo && logoUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const maxW = plateSize * 0.42 * config.logoScale;
            const ratio = img.height / Math.max(1, img.width);
            const lw = maxW;
            const lh = maxW * ratio;
            let ly = contentTop;
            if (layout === 'logo_above' && showText) ly = contentTop - gapPx / 2 - lh / 2;
            if (layout === 'text_above' && showText) ly = contentTop + gapPx / 2 + lh / 2;
            if (layout === 'logo_only') ly = py + plateSize * 0.58;
            ctx.save();
            ctx.translate(cx + config.logoPosX * 2, ly - config.logoPosY * 2);
            ctx.rotate(((config.logoRotation || 0) * Math.PI) / 180);
            ctx.scale(config.mirrorX ? -1 : 1, 1);
            ctx.drawImage(img, -lw / 2, -lh / 2, lw, lh);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = logoUrl;
        });
      }

      if (showText) {
        let ty = contentTop;
        if (layout === 'logo_above' && showLogo) ty = contentTop + gapPx / 2 + 18;
        if (layout === 'text_above' && showLogo) ty = contentTop - gapPx / 2 - 10;
        if (layout === 'text_only') ty = py + plateSize * 0.58;
        ctx.fillStyle = printColor;
        ctx.font = `700 ${Math.round(28 * config.logoScale)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.slice(0, 28), cx, ty);
      }

      return canvas.toDataURL('image/jpeg', 0.9);
    }, [plate, hasChain, logoUrl, showLogo, showText, text, layout, gap, printColor, config]);

    useEffect(() => {
      void paintCanvas();
    }, [paintCanvas]);

    useImperativeHandle(ref, () => ({
      takeScreenshot: () => paintCanvas(),
      exportSTL: async () => null,
    }));

    const imprintBlock = (
      <div
        className="absolute left-1/2 flex flex-col items-center w-[70%]"
        style={{
          top: layout === 'logo_only' || layout === 'text_only' ? '54%' : '48%',
          transform: 'translate(-50%, -20%)',
          gap: `${6 + gap * 0.12}px`,
          flexDirection: layout === 'text_above' ? 'column-reverse' : 'column',
        }}
      >
        {showLogo && logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="max-w-[78%] max-h-[72px] object-contain pointer-events-none select-none"
            style={{
              transform: `scale(${config.mirrorX ? -config.logoScale : config.logoScale}, ${config.logoScale}) rotate(${config.logoRotation || 0}deg)`,
            }}
            draggable={false}
          />
        )}
        {showText && (
          <p
            className="text-center font-bold leading-tight px-2 break-words max-w-full"
            style={{
              color: printColor,
              fontSize: `${Math.round(15 * Math.min(1.4, config.logoScale))}px`,
            }}
          >
            {text}
          </p>
        )}
        {!showLogo && !showText && (
          <p className="text-[12px] text-zinc-400 font-medium">Logo oder Text wählen</p>
        )}
      </div>
    );

    return (
      <div className="w-full h-full bg-[#F3F4F6] flex items-center justify-center p-4 md:p-8">
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <div
          ref={cardRef}
          className="relative w-full max-w-[560px] aspect-square bg-white rounded-sm shadow-sm border border-zinc-200/80 flex items-center justify-center"
        >
          <div className="relative w-[72%] max-w-[340px]" style={{ aspectRatio: '1' }}>
            {hasChain && (
              <div
                className="absolute z-10 rounded-full border-[6px] border-zinc-300"
                style={{
                  width: 42,
                  height: 42,
                  top: -6,
                  left: 18,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                }}
                aria-hidden
              />
            )}
            <div
              className="relative w-full h-full overflow-hidden transition-colors duration-200"
              style={{
                backgroundColor: plate,
                borderRadius: '22%',
                boxShadow:
                  '0 18px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div
                className="absolute rounded-full bg-[#F3F4F6]"
                style={{ width: '13%', height: '13%', top: '8%', left: '8%' }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/5"
                style={{ width: '28%', aspectRatio: '1', top: '22%' }}
              />
              {imprintBlock}
            </div>
          </div>
          <button
            type="button"
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white border border-zinc-200 shadow-sm text-zinc-500 text-sm flex items-center justify-center"
            title="Vorschau"
            aria-label="Vorschau"
          >
            ⌕
          </button>
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
