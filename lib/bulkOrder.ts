/**
 * Mengenstaffel-Hinweise für B2B (kundenfreundlich, keine Tech-Sprache).
 */
export interface BulkTier {
  minQty: number;
  label: string;
}

export const BULK_TIERS: BulkTier[] = [
  { minQty: 20, label: 'Ab 20 Stück gilt der Mengenpreis aus der Preisliste.' },
  { minQty: 50, label: 'Ab 50 Stück: nächste Staffel – günstigerer Stückpreis.' },
  { minQty: 100, label: 'Ab 100 Stück: Firmensatz mit besserem Mengenpreis.' },
  { minQty: 250, label: 'Ab 250 Stück: große Menge – Staffelpreis aus der Preisliste.' },
];

export const BULK_CONTACT_HINT =
  'Für Firmen und Events: Schreib uns nach der Bestellung oder vorab – wir klären Lieferung und Sonderwünsche.';

/** Max. Stückzahl pro Design / Bestellzeile (Firmen- und Event-Mengen). */
export const MAX_ORDER_QUANTITY = 15_000;

export function clampOrderQuantity(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(x)) return 1;
  return Math.min(MAX_ORDER_QUANTITY, Math.max(1, Math.round(x)));
}

/** Passender Hinweis zur gewählten Menge (oder Basis-Hinweis). */
export function bulkHintForQuantity(qty: number): string {
  const q = clampOrderQuantity(qty);
  let best = BULK_CONTACT_HINT;
  for (const tier of BULK_TIERS) {
    if (q >= tier.minQty) best = tier.label;
  }
  if (q < 20) {
    return `${BULK_CONTACT_HINT} Aktuell: ${q} Stück.`;
  }
  return best;
}
