/**
 * Optional: Brand-Hinweise von Website holen (Edge Function brand-scrape).
 * Ohne Deploy → Client-Fallback (Domain-Name).
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';
import {
  hintsFromWebsiteUrl,
  sanitizeBrandHints,
  toSafePublicHttpsUrl,
  type BrandHints,
} from './brandScrape';

export async function fetchBrandHintsFromUrl(rawUrl: string): Promise<BrandHints | null> {
  const url = toSafePublicHttpsUrl(rawUrl);
  if (!url) return null;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/brand-scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = (await res.json()) as { hints?: BrandHints };
        if (data.hints) return sanitizeBrandHints({ ...data.hints, source: 'url' });
      }
    } catch {
      /* Fallback unten */
    }
  }

  return hintsFromWebsiteUrl(url);
}
