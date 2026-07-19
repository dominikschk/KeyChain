/**
 * Preislisten + Section-Ausrichtung für Microsite-Blöcke.
 */

export type PriceItem = { name: string; price: string; note?: string };
export type SectionAlign = 'left' | 'center' | 'right';

export function parsePriceItems(raw: string | undefined | null): PriceItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PriceItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const name = String((item as PriceItem).name ?? '').trim();
      const price = String((item as PriceItem).price ?? '').trim();
      const note = String((item as PriceItem).note ?? '').trim();
      if (!name && !price) continue;
      out.push({ name, price, ...(note ? { note } : {}) });
      if (out.length >= 30) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function serializePriceItems(items: PriceItem[]): string {
  return JSON.stringify(
    items
      .map((i) => ({
        name: i.name.trim(),
        price: i.price.trim(),
        ...(i.note?.trim() ? { note: i.note.trim() } : {}),
      }))
      .filter((i) => i.name || i.price)
      .slice(0, 30)
  );
}

export function normalizeAlign(value: unknown): SectionAlign {
  if (value === 'left' || value === 'right' || value === 'center') return value;
  return 'center';
}

export function alignClass(align: SectionAlign): string {
  if (align === 'left') return 'text-left items-start';
  if (align === 'right') return 'text-right items-end';
  return 'text-center items-center';
}

/** Sehr grob: „jetzt geöffnet“, wenn eine Zeile den heutigen Wochentag und eine Uhrzeitspanne hat. */
export function isProbablyOpenNow(hoursText: string, now = new Date()): boolean {
  const days = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  const today = days[now.getDay()]!;
  const lines = hoursText
    .split(/\n+/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
  const hit = lines.find((l) => l.includes(today) || (today !== 'so' && today !== 'sa' && /mo\s*[-–]\s*fr/.test(l)));
  if (!hit) return false;
  const range = /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/.exec(hit);
  if (!range) return true; // Tag genannt, keine Zeit → vorsichtig „offen“ nicht behaupten
  const start = Number(range[1]) * 60 + Number(range[2]);
  const end = Number(range[3]) * 60 + Number(range[4]);
  const cur = now.getHours() * 60 + now.getMinutes();
  if (end < start) return cur >= start || cur <= end;
  return cur >= start && cur <= end;
}
