import React, { useId, useState } from 'react'
import { hexForColorInput, normalizeHexColor } from '../lib/hexColor'

type Props = {
  label: string
  value: string | undefined
  fallback: string
  swatches?: string[]
  onChange: (hex: string) => void
  compact?: boolean
}

export const HexColorField: React.FC<Props> = ({
  label,
  value,
  fallback,
  swatches = [],
  onChange,
  compact = false,
}) => {
  const id = useId()
  const resolved = hexForColorInput(value, fallback)
  const [draft, setDraft] = useState(resolved)

  React.useEffect(() => {
    setDraft(hexForColorInput(value, fallback))
  }, [value, fallback])

  const applyHex = (raw: string) => {
    const next = normalizeHexColor(raw)
    if (!next) return
    setDraft(next)
    onChange(next)
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      {swatches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {swatches.map((c) => {
            const hex = hexForColorInput(c, c)
            const active = resolved.toLowerCase() === hex.toLowerCase()
            return (
              <button
                key={hex}
                type="button"
                onClick={() => applyHex(hex)}
                className={`w-9 h-9 rounded-full border-2 transition-transform active:scale-95 ${
                  active
                    ? 'border-navy ring-2 ring-offset-2 ring-petrol/40 scale-105'
                    : 'border-white shadow-sm ring-1 ring-zinc-200'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`${label}: ${hex}`}
              />
            )
          })}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={resolved}
          onChange={(e) => applyHex(e.target.value)}
          className="w-11 h-10 rounded-xl border border-navy/10 bg-cream cursor-pointer shrink-0"
          aria-label={`${label} wählen`}
        />
        <div className="flex-1 min-w-0">
          <label htmlFor={id} className="sr-only">
            {label} als Farbcode
          </label>
          <input
            id={id}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => applyHex(draft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyHex(draft)
              }
            }}
            placeholder="#11235A"
            className="w-full h-10 px-3 rounded-xl border border-navy/10 text-xs font-mono text-navy bg-cream/50 outline-none focus:border-petrol/40 focus:bg-white"
          />
        </div>
      </div>
    </div>
  )
}
