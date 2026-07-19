/**
 * FAQ / Öffnungszeiten / Galerie – Hilfen für Microsite-Blöcke.
 */

export type FaqItem = { q: string; a: string };

export function parseFaqItems(raw: string | undefined | null): FaqItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const q = String((item as FaqItem).q ?? '').trim();
        const a = String((item as FaqItem).a ?? '').trim();
        if (!q && !a) return null;
        return { q, a };
      })
      .filter((x): x is FaqItem => !!x)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function serializeFaqItems(items: FaqItem[]): string {
  return JSON.stringify(
    items
      .map((i) => ({ q: i.q.trim(), a: i.a.trim() }))
      .filter((i) => i.q || i.a)
      .slice(0, 20)
  );
}

/** Galerie: eine https-URL pro Zeile */
export function parseGalleryUrls(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\n+/)
    .map((u) => u.trim())
    .filter((u) => /^https:\/\//i.test(u))
    .slice(0, 12);
}

export function serializeGalleryUrls(urls: string[]): string {
  return urls.filter((u) => /^https:\/\//i.test(u.trim())).slice(0, 12).join('\n');
}
