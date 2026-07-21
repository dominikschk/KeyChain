/**
 * Mengenstaffeln für NFC-Schlüsselanhänger.
 *
 * Standard = Preisliste NFC Chips. Überschreiben per Env-String, z. B.:
 *   VITE_PRICE_KEYCHAIN_TIERS=1:1.50,20:1.50,50:1.45,100:1.40,250:1.30,400:1.20,600:1.10,800:1.00,1000:0.95
 *   PRICE_KEYCHAIN_TIERS=…  (Supabase Edge – derselbe Inhalt)
 *
 * Format: menge:euro[,menge:euro…]  (Komma oder Semikolon, Euro mit Punkt oder Komma)
 * Du kannst Stufen beliebig hinzufügen/ändern – ohne Code-Änderung, nur Env neu setzen.
 */

export type PriceTierDef = {
  minQty: number
  unitPriceCents: number
  label: string
}

/** Aktuelle Preisliste NFC Chips (Ab-Staffel). Unter 20 Stück = Preis der 20er-Stufe. */
export const DEFAULT_KEYCHAIN_TIERS: PriceTierDef[] = [
  { minQty: 1, unitPriceCents: 150, label: 'Ab 1 Stück' },
  { minQty: 20, unitPriceCents: 150, label: 'Ab 20 Stück' },
  { minQty: 50, unitPriceCents: 145, label: 'Ab 50 Stück' },
  { minQty: 100, unitPriceCents: 140, label: 'Ab 100 Stück' },
  { minQty: 250, unitPriceCents: 130, label: 'Ab 250 Stück' },
  { minQty: 400, unitPriceCents: 120, label: 'Ab 400 Stück' },
  { minQty: 600, unitPriceCents: 110, label: 'Ab 600 Stück' },
  { minQty: 800, unitPriceCents: 100, label: 'Ab 800 Stück' },
  { minQty: 1000, unitPriceCents: 95, label: 'Ab 1000 Stück' },
]

export const DEFAULT_BADGE_TIERS: PriceTierDef[] = [
  { minQty: 1, unitPriceCents: 3990, label: 'Einzelpreis' },
  { minQty: 10, unitPriceCents: 3490, label: 'Ab 10 Stück' },
  { minQty: 25, unitPriceCents: 2990, label: 'Ab 25 Stück' },
]

/** Ein Euro-/Cent-Betrag → Cent. */
export function parseMoneyToCents(raw: string, fallback: number): number {
  const t = raw.trim()
  if (!t) return fallback
  if (/^\d+$/.test(t) && t.length >= 3) {
    const n = parseInt(t, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  const euros = parseFloat(t.replace(',', '.'))
  if (!Number.isFinite(euros) || euros <= 0) return fallback
  return Math.round(euros * 100)
}

/**
 * Parst `20:1.50,50:1.45,…` → Staffeln.
 * Ungültige Einträge werden übersprungen; bei leerem Ergebnis → fallback.
 */
export function parseTiersEnvString(
  raw: string | undefined | null,
  fallback: PriceTierDef[]
): PriceTierDef[] {
  const s = (raw ?? '').trim()
  if (!s) return fallback.map((t) => ({ ...t }))

  const parts = s.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)
  const parsed: PriceTierDef[] = []

  for (const part of parts) {
    const m = part.match(/^(\d+)\s*[:=]\s*(.+)$/)
    if (!m) continue
    const minQty = parseInt(m[1]!, 10)
    const cents = parseMoneyToCents(m[2]!, 0)
    if (!Number.isFinite(minQty) || minQty < 1 || cents < 50) continue
    parsed.push({
      minQty,
      unitPriceCents: cents,
      label: minQty === 1 ? 'Ab 1 Stück' : `Ab ${minQty} Stück`,
    })
  }

  if (parsed.length === 0) return fallback.map((t) => ({ ...t }))

  parsed.sort((a, b) => a.minQty - b.minQty)
  // Deduplizieren: gleiche minQty → letzter Eintrag gewinnt
  const byQty = new Map<number, PriceTierDef>()
  for (const t of parsed) byQty.set(t.minQty, t)
  const unique = [...byQty.values()].sort((a, b) => a.minQty - b.minQty)
  if (unique[0]!.minQty > 1) {
    unique.unshift({
      minQty: 1,
      unitPriceCents: unique[0]!.unitPriceCents,
      label: 'Ab 1 Stück',
    })
  }
  return unique
}

export function pickTierFromList(tiers: PriceTierDef[], quantity: number): PriceTierDef {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty)
  let chosen = sorted[0]!
  for (const t of sorted) {
    if (quantity >= t.minQty) chosen = t
  }
  return chosen
}
