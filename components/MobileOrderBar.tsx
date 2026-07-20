/**
 * Sticky Bestell-Leiste fürs Handy: Stückzahl ± und In-den-Warenkorb.
 */
import React from 'react'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { clampOrderQuantity } from '../lib/bulkOrder'

type Props = {
  quantity: number
  onQuantityChange: (n: number) => void
  onOrder: () => void
  orderLabel: string
  hint?: string
}

export function MobileOrderBar({
  quantity,
  onQuantityChange,
  onOrder,
  orderLabel,
  hint = 'Preis und Zahlung im Shopify-Warenkorb.',
}: Props) {
  const qty = clampOrderQuantity(quantity)

  return (
    <div className="md:hidden shrink-0 border-t border-zinc-200 bg-white px-3 pt-3 pb-2 z-[550]">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-zinc-200 overflow-hidden shrink-0">
          <button
            type="button"
            aria-label="Weniger"
            disabled={qty <= 1}
            onClick={() => onQuantityChange(clampOrderQuantity(qty - 1))}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-navy disabled:opacity-30 active:bg-zinc-50"
          >
            <Minus size={20} strokeWidth={2.5} />
          </button>
          <span className="min-w-[2.5rem] text-center text-base font-bold tabular-nums text-navy" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Mehr"
            disabled={qty >= 99}
            onClick={() => onQuantityChange(clampOrderQuantity(qty + 1))}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-navy disabled:opacity-30 active:bg-zinc-50"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
        <button
          type="button"
          onClick={onOrder}
          className="flex-1 min-h-[52px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] px-3"
        >
          <ShoppingCart size={18} />
          <span className="truncate">{orderLabel}</span>
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-[11px] text-zinc-500 leading-snug px-0.5">{hint}</p> : null}
    </div>
  )
}
