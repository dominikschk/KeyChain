/**
 * Flache Produktvorschau des Schlüsselanhängers – ohne 3D.
 * Screenshot für Bestellung über Canvas.
 */
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo, useCallback } from 'react';
import type { ModelConfig } from '../types';

function tintSvg(svg: string, color: string): string {
  let out = svg;
  // ImageTracer / einfache Pfade: Füllungen auf Logo-Farbe
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
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const plate = config.plateColor || '#F8F5F0';
    const logoColor = config.logoColor || '#12A9E0';
    const hasChain = config.hasChain !== false;
    const w = config.plateWidth || 40;
    const h = config.plateHeight || 40;
    const aspect = w / h;

    const logoUrl = useMemo(() => {
      if (!svgContent?.trim()) return null;
      try {
        return svgToDataUrl(tintSvg(svgContent, logoColor));
      } catch {
        return null;
      }
    }, [svgContent, logoColor]);

    const logoStyle = useMemo(() => {
      // mm-Offsets grob auf % der Platte mappen (±15 mm ≈ ±35 %)
      const tx = (config.logoPosX / 15) * 32;
      const ty = (-config.logoPosY / 15) * 32;
      const s = Math.max(0.25, Math.min(2.2, config.logoScale));
      const sx = config.mirrorX ? -s : s;
      const rot = config.logoRotation || 0;
      return {
        transform: `translate(-50%, -50%) translate(${tx}%, ${ty}%) scale(${sx}, ${s}) rotate(${rot}deg)`,
        width: `${48 + config.logoDepth * 4}%`,
        opacity: 0.92 + Math.min(0.08, config.logoDepth / 50),
      } as React.CSSProperties;
    }, [
      config.logoPosX,
      config.logoPosY,
      config.logoScale,
      config.mirrorX,
      config.logoRotation,
      config.logoDepth,
    ]);

    const paintCanvas = useCallback(async (): Promise<string> => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      const size = 720;
      const pad = 80;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Hintergrund
      const grd = ctx.createRadialGradient(size * 0.35, size * 0.25, 40, size / 2, size / 2, size * 0.7);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.55, '#F8F5F0');
      grd.addColorStop(1, '#E5E0D6');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size, size);

      const side = size - pad * 2;
      const plateW = aspect >= 1 ? side : side * aspect;
      const plateH = aspect >= 1 ? side / aspect : side;
      const px = (size - plateW) / 2;
      const py = (size - plateH) / 2 + (hasChain ? 12 : 0);
      const radius = Math.min(plateW, plateH) * 0.18;

      // Schatten
      ctx.save();
      ctx.shadowColor = 'rgba(17,35,90,0.18)';
      ctx.shadowBlur = 36;
      ctx.shadowOffsetY = 18;
      roundRect(ctx, px, py, plateW, plateH, radius);
      ctx.fillStyle = plate;
      ctx.fill();
      ctx.restore();

      // Rand
      roundRect(ctx, px, py, plateW, plateH, radius);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Öse / Loch
      const holeR = Math.min(plateW, plateH) * 0.07;
      const hx = px + holeR * 1.6;
      const hy = py + holeR * 1.6;
      ctx.beginPath();
      ctx.arc(hx, hy, holeR, 0, Math.PI * 2);
      ctx.fillStyle = '#E5E0D6';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.stroke();

      // Metallring
      if (hasChain) {
        ctx.beginPath();
        ctx.arc(hx - holeR * 0.2, hy - holeR * 0.2, holeR * 1.55, 0, Math.PI * 2);
        ctx.strokeStyle = '#B8B8B8';
        ctx.lineWidth = holeR * 0.35;
        ctx.stroke();
      }

      // NFC-Scheibe
      const nfcR = Math.min(plateW, plateH) * 0.22;
      const nx = px + plateW / 2;
      const ny = py + plateH * 0.42;
      ctx.beginPath();
      ctx.arc(nx, ny, nfcR, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const r = nfcR * (0.92 - i * 0.12);
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#CD7F32';
        ctx.lineWidth = nfcR * 0.04;
        ctx.stroke();
      }

      // Logo
      if (logoUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const base = Math.min(plateW, plateH) * (0.42 * config.logoScale);
            const lw = base;
            const lh = base * (img.height / Math.max(1, img.width));
            const cx = nx + (config.logoPosX / 15) * plateW * 0.28;
            const cy = ny + plateH * 0.28 - (config.logoPosY / 15) * plateH * 0.28;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(((config.logoRotation || 0) * Math.PI) / 180);
            ctx.scale(config.mirrorX ? -1 : 1, 1);
            ctx.globalAlpha = 0.95;
            ctx.drawImage(img, -lw / 2, -lh / 2, lw, lh);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = logoUrl;
        });
      } else {
        ctx.fillStyle = 'rgba(17,35,90,0.35)';
        ctx.font = `600 ${Math.round(plateW * 0.06)}px system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Dein Logo hier', nx, py + plateH * 0.78);
      }

      return canvas.toDataURL('image/jpeg', 0.88);
    }, [aspect, plate, hasChain, logoUrl, config]);

    useEffect(() => {
      void paintCanvas();
    }, [paintCanvas]);

    useImperativeHandle(ref, () => ({
      takeScreenshot: () => paintCanvas(),
      exportSTL: async () => null,
    }));

    return (
      <div
        ref={stageRef}
        className="w-full h-full relative flex flex-col items-center justify-center px-6 py-10 overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 30% 18%, #ffffff 0%, #F8F5F0 42%, #E8E4DC 100%)',
        }}
      >
        <canvas ref={canvasRef} className="hidden" aria-hidden />

        <div className="relative" style={{ width: `min(72vw, ${aspect >= 1 ? 280 : 240}px)` }}>
          {hasChain && (
            <div
              className="absolute -top-3 left-3 w-10 h-10 rounded-full border-[5px] border-zinc-300 shadow-sm z-10"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 6px rgba(0,0,0,0.12)',
              }}
              aria-hidden
            />
          )}

          <div
            className="relative shadow-2xl transition-colors duration-300"
            style={{
              aspectRatio: `${w} / ${h}`,
              width: '100%',
              backgroundColor: plate,
              borderRadius: '22%',
              boxShadow:
                '0 24px 48px rgba(17,35,90,0.16), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            {/* Öse */}
            <div
              className="absolute rounded-full bg-[#E5E0D6] border border-black/10"
              style={{ width: '14%', height: '14%', top: '7%', left: '7%' }}
            />

            {/* NFC */}
            <div
              className="absolute left-1/2 rounded-full bg-zinc-950 shadow-inner"
              style={{
                width: '44%',
                aspectRatio: '1',
                top: '18%',
                transform: 'translateX(-50%)',
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 m-auto rounded-full border-2"
                  style={{
                    width: `${88 - i * 14}%`,
                    height: `${88 - i * 14}%`,
                    borderColor: '#CD7F32',
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>

            {/* Logo */}
            <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '22%' }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="absolute left-1/2 top-[68%] max-w-none pointer-events-none select-none"
                  style={logoStyle}
                  draggable={false}
                />
              ) : (
                <p className="absolute left-1/2 top-[72%] -translate-x-1/2 text-[11px] font-semibold text-navy/40 whitespace-nowrap">
                  Dein Logo hier
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-8 text-[10px] font-medium text-zinc-500 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full">
          So wirkt dein Anhänger · kein 3D-Drehen nötig
        </p>
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
