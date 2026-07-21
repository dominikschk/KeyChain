import React from 'react'

type Props = {
  widthMm: number
  heightMm: number
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
          className={horizontal ? 'border-l border-navy/25' : 'border-t border-navy/25'}
          style={horizontal ? { height: major ? 10 : 6 } : { width: major ? 10 : 6 }}
        />
        {major && mm > 0 && mm < lengthMm && (
          <span
            className={`absolute text-[8px] font-semibold tabular-nums text-navy/45 whitespace-nowrap ${
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

/** Dezentes mm-Lineal neben der Anhänger-Vorschau. */
export const PreviewRuler: React.FC<Props> = ({ widthMm, heightMm }) => {
  const w = Math.max(1, Math.round(widthMm))
  const h = Math.max(1, Math.round(heightMm))

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <div
        className="absolute left-0 top-[8%] bottom-[14%] w-7 flex flex-col items-end pr-1"
        title={`${h} mm hoch`}
      >
        <span className="text-[8px] font-bold uppercase tracking-wider text-navy/35 mb-1">mm</span>
        <div className="relative flex-1 w-full border-r border-navy/20">
          <RulerTicks lengthMm={h} horizontal={false} />
        </div>
        <span className="text-[8px] font-semibold tabular-nums text-navy/40 mt-1">{h}</span>
      </div>

      <div
        className="absolute left-[10%] right-[6%] bottom-1 h-6"
        title={`${w} mm breit`}
      >
        <div className="relative h-full border-t border-navy/20">
          <RulerTicks lengthMm={w} horizontal />
        </div>
        <div className="flex justify-between text-[8px] font-semibold tabular-nums text-navy/40 mt-0.5 px-0.5">
          <span>0</span>
          <span>{w} mm</span>
        </div>
      </div>
    </div>
  )
}
