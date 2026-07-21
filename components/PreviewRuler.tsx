import React from 'react'

type Props = {
  widthMm: number
  heightMm: number
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
    const major = mm === 0 || mm === lengthMm || mm % (step * 2) === 0
    const pct = lengthMm > 0 ? (mm / lengthMm) * 100 : 0
    ticks.push(
      <div
        key={mm}
        className="absolute"
        style={
          horizontal
            ? { left: `${pct}%`, bottom: 0, transform: 'translateX(-50%)' }
            : { top: `${pct}%`, left: 0, transform: 'translateY(-50%)' }
        }
      >
        <div
          className={horizontal ? 'bg-navy/35' : 'bg-navy/35'}
          style={
            horizontal
              ? { width: 1, height: major ? 8 : 4 }
              : { height: 1, width: major ? 8 : 4 }
          }
        />
      </div>
    )
  }
  return <>{ticks}</>
}

/**
 * Dezentes mm-Lineal. Container lässt Klicks durch (pointer-events-none),
 * nur der Größen-Griff fängt Pointer – sonst blockiert das Lineal das Logo-Ziehen.
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
      const scale = 1.8 - t * (1.8 - 0.4)
      onLogoScaleChange(Math.round(scale * 100) / 100)
    }
    apply(e.clientY)

    const onMove = (ev: PointerEvent) => apply(ev.clientY)
    const onUp = () => {
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div className="absolute inset-0 z-20 pointer-events-none" aria-hidden>
      {/* Links: Höhe */}
      <div className="absolute left-1 top-[12%] bottom-[14%] w-5 flex flex-col">
        <div className="relative flex-1 border-l border-navy/20 pl-0.5">
          <RulerTicks lengthMm={h} horizontal={false} />
        </div>
        <span className="text-[7px] font-semibold tabular-nums text-navy/40 mt-0.5">{h}</span>
      </div>

      {/* Unten: Breite */}
      <div className="absolute left-[10%] right-[12%] bottom-1 h-5">
        <div className="relative w-full border-b border-navy/20 h-2">
          <RulerTicks lengthMm={w} horizontal />
        </div>
        <div className="flex justify-between text-[7px] font-semibold tabular-nums text-navy/40 mt-0.5">
          <span>0</span>
          <span>{w} mm</span>
        </div>
      </div>

      {/* Rechts: Größen-Griff (einziger klickbarer Teil) */}
      {onLogoScaleChange && (
        <div
          className="absolute right-0.5 top-[14%] bottom-[16%] w-7 flex flex-col items-center touch-none cursor-ns-resize select-none pointer-events-auto"
          onPointerDown={onScalePointerDown}
          role="slider"
          aria-label="Logo-Größe"
          aria-valuemin={40}
          aria-valuemax={180}
          aria-valuenow={Math.round(logoScale * 100)}
          title="Ziehen: Logo größer oder kleiner"
        >
          <span className="text-[7px] font-bold tabular-nums text-navy/45 mb-1">
            {Math.round(logoScale * 100)}%
          </span>
          <div className="relative flex-1 w-1.5 rounded-full bg-navy/10">
            <div
              className="absolute left-1/2 w-3.5 h-3.5 rounded-full bg-petrol border-2 border-white shadow-sm"
              style={{ top: `${scalePct}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
