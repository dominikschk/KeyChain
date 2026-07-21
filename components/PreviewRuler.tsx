import React from 'react'

type Props = {
  widthMm: number
  heightMm: number
  /** Optional: Logo-Größe (0.4–1.8) – Drag am rechten Lineal */
  logoScale?: number
  onLogoScaleChange?: (scale: number) => void
}

function tickStep(mm: number): number {
  if (mm <= 50) return 5
  if (mm <= 120) return 10
  return 20
}

function RulerTicks({ lengthMm, horizontal }: { lengthMm: number; horizontal: boolean }) {
  const step = tickStep(lengthMm)
  const ticks: React.ReactNode[] = []
  for (let mm = 0; mm <= lengthMm; mm += step) {
    const major = mm % (step * 2) === 0
    const pct = lengthMm > 0 ? (mm / lengthMm) * 100 : 0
    ticks.push(
      <div
        key={mm}
        className="absolute flex items-end justify-center"
        style={
          horizontal
            ? { left: `${pct}%`, bottom: 0, transform: 'translateX(-50%)' }
            : { top: `${pct}%`, right: 0, transform: 'translateY(-50%)' }
        }
      >
        <div
          className={horizontal ? 'border-l border-navy/30' : 'border-t border-navy/30'}
          style={horizontal ? { height: major ? 10 : 6 } : { width: major ? 10 : 6 }}
        />
        {major && mm > 0 && mm < lengthMm && (
          <span
            className={`absolute text-[8px] font-semibold tabular-nums text-navy/50 whitespace-nowrap ${
              horizontal ? '-top-3.5' : '-left-7'
            }`}
          >
            {mm}
          </span>
        )}
      </div>
    )
  }
  return <>{ticks}</>
}

/**
 * mm-Lineal an den Seiten der Anhänger-Vorschau.
 * Am rechten Lineal kann man die Logo-Größe ziehen (wenn onLogoScaleChange gesetzt).
 */
export const PreviewRuler: React.FC<Props> = ({
  widthMm,
  heightMm,
  logoScale = 1,
  onLogoScaleChange,
}) => {
  const w = Math.max(1, Math.round(widthMm))
  const h = Math.max(1, Math.round(heightMm))
  const scalePct = ((Math.min(1.8, Math.max(0.4, logoScale)) - 0.4) / (1.8 - 0.4)) * 100

  const onScalePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onLogoScaleChange) return
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()

    const apply = (clientY: number) => {
      const t = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height)))
      // Oben = größer, unten = kleiner
      const scale = 1.8 - t * (1.8 - 0.4)
      onLogoScaleChange(Math.round(scale * 100) / 100)
    }
    apply(e.clientY)

    const onMove = (ev: PointerEvent) => apply(ev.clientY)
    const onUp = () => {
      el.releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div className="absolute inset-0 z-20" aria-hidden={!onLogoScaleChange}>
      {/* Linkes Lineal (Höhe) */}
      <div className="absolute left-0 top-[8%] bottom-[16%] w-8 flex flex-col items-end pr-1 pointer-events-none">
        <span className="text-[8px] font-bold uppercase tracking-wider text-navy/40 mb-1">mm</span>
        <div className="relative flex-1 w-full border-r border-navy/25">
          <RulerTicks lengthMm={h} horizontal={false} />
        </div>
        <span className="text-[8px] font-semibold tabular-nums text-navy/45 mt-1">{h}</span>
      </div>

      {/* Unteres Lineal (Breite) */}
      <div className="absolute left-[12%] right-[14%] bottom-0.5 h-7 pointer-events-none">
        <div className="relative h-full border-t border-navy/25">
          <RulerTicks lengthMm={w} horizontal />
        </div>
        <div className="flex justify-between text-[8px] font-semibold tabular-nums text-navy/45 mt-0.5 px-0.5">
          <span>0</span>
          <span>{w} mm</span>
        </div>
      </div>

      {/* Rechtes Lineal = Logo-Größe ziehen */}
      {onLogoScaleChange && (
        <div
          className="absolute right-0 top-[10%] bottom-[18%] w-9 flex flex-col items-center touch-none cursor-ns-resize select-none"
          onPointerDown={onScalePointerDown}
          role="slider"
          aria-label="Logo-Größe"
          aria-valuemin={40}
          aria-valuemax={180}
          aria-valuenow={Math.round(logoScale * 100)}
          title="Ziehen: Logo größer/kleiner"
        >
          <span className="text-[8px] font-bold uppercase tracking-wider text-navy/45 mb-1">
            {Math.round(logoScale * 100)}%
          </span>
          <div className="relative flex-1 w-2 rounded-full bg-navy/10 border border-navy/15">
            <div
              className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-petrol border-2 border-white shadow-sm"
              style={{ top: `${scalePct}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <span className="text-[8px] font-semibold text-navy/40 mt-1">Größe</span>
        </div>
      )}
    </div>
  )
}
