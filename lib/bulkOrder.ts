/**
 * Mengenstaffel-Hinweise für B2B (kundenfreundlich, keine Tech-Sprache).
 */
export interface BulkTier {
  minQty: number;
  label: string;
}

export const BULK_TIERS: BulkTier[] = [
  { minQty: 10, label: 'Ab 10 Stück oft günstiger – wir machen dir ein Angebot.' },
  { minQty: 25, label: 'Ab 25 Stück: Sammelbestellung mit Mengenpreis.' },
  { minQty: 50, label: 'Ab 50 Stück: Firmensatz – melde dich kurz bei uns.' },
];

export const BULK_CONTACT_HINT =
  'Für Firmen und Events: Schreib uns nach der Bestellung oder vorab – wir klären Mengenpreis und Lieferung.';

export function clampOrderQuantity(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(x)) return 1;
  return Math.min(99, Math.max(1, Math.round(x)));
}

/** Passender Hinweis zur gewählten Menge (oder Basis-Hinweis). */
export function bulkHintForQuantity(qty: number): string {
  const q = clampOrderQuantity(qty);
  let best = BULK_CONTACT_HINT;
  for (const tier of BULK_TIERS) {
    if (q >= tier.minQty) best = tier.label;
  }
  if (q < 10) {
    return `${BULK_CONTACT_HINT} Aktuell: ${q} Stück.`;
  }
  return best;
}
