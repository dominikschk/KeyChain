import { describe, expect, it } from 'vitest';
import {
  extractRoughTextFromPdf,
  hintsFromPdfText,
  hintsFromWebsiteUrl,
  parseBrandHintsFromHtml,
  toSafePublicHttpsUrl,
} from '../brandScrape';
import { bulkHintForQuantity, clampOrderQuantity } from '../bulkOrder';
import { decodeDraftShare, encodeDraftShare, slimConfigForShare } from '../draftShare';
import { DEFAULT_CONFIG } from '../../constants';
import { mergeBrandHintsIntoAnswers } from '../micrositeChatEngine';

describe('brandScrape', () => {
  it('blockiert http und localhost', () => {
    expect(toSafePublicHttpsUrl('http://example.com')).toBeNull();
    expect(toSafePublicHttpsUrl('https://localhost/foo')).toBeNull();
    expect(toSafePublicHttpsUrl('https://127.0.0.1/')).toBeNull();
    expect(toSafePublicHttpsUrl('https://example.com/shop')).toMatch(/^https:\/\/example\.com/);
  });

  it('parst HTML Meta', () => {
    const html = `
      <html><head>
        <title>Bäckerei Müller | Home</title>
        <meta name="description" content="Frisch jeden Tag" />
        <meta property="og:image" content="https://cdn.example.com/logo.png" />
        <meta name="theme-color" content="#8B5E3C" />
      </head></html>`;
    const h = parseBrandHintsFromHtml(html, 'https://baeckerei-mueller.de');
    expect(h.company).toContain('Bäckerei');
    expect(h.slogan).toMatch(/Frisch/);
    expect(h.logoUrl).toMatch(/^https:/);
    expect(h.accentColor).toBe('#8B5E3C');
  });

  it('Domain-Fallback', () => {
    const h = hintsFromWebsiteUrl('https://www.fitness-studio.de/');
    expect(h?.company).toMatch(/Fitness/i);
  });

  it('PDF-Text grob', () => {
    const sample = new TextEncoder().encode('%PDF-1.4 Bäckerei Sonnenschein Willkommen bei uns BT (Hallo) ET');
    const text = extractRoughTextFromPdf(sample);
    expect(text.length).toBeGreaterThan(5);
    const hints = hintsFromPdfText(text);
    expect(hints.source).toBe('pdf');
  });
});

describe('bulkOrder', () => {
  it('clamped quantity', () => {
    expect(clampOrderQuantity(0)).toBe(1);
    expect(clampOrderQuantity(150)).toBe(150);
    expect(clampOrderQuantity(20_000)).toBe(15_000);
    expect(clampOrderQuantity(12)).toBe(12);
  });

  it('Mengenhinweis ab 20', () => {
    expect(bulkHintForQuantity(1)).toMatch(/Firmen|Events|Stück/);
    expect(bulkHintForQuantity(25)).toMatch(/20/);
  });
});

describe('draftShare', () => {
  it('roundtrip slim config', async () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      profileTitle: 'Test Café',
      nfcBlocks: [
        { id: '1', type: 'headline' as const, title: 'Hi', content: '' },
      ],
    };
    const encoded = await encodeDraftShare(cfg);
    expect(encoded).toBeTruthy();
    const result = await decodeDraftShare(encoded!);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.profileTitle).toBe('Test Café');
      expect(result.config.nfcBlocks[0]?.title).toBe('Hi');
    }
  });

  it('slim lässt data-URLs weg', () => {
    const slim = slimConfigForShare({
      ...DEFAULT_CONFIG,
      profileLogoUrl: 'data:image/png;base64,xxx',
      headerImageUrl: 'https://cdn.example.com/a.jpg',
    });
    expect(slim.profileLogoUrl).toBeUndefined();
    expect(slim.headerImageUrl).toMatch(/^https:/);
  });
});

describe('mergeBrandHints', () => {
  it('übernimmt Firma und Website', () => {
    const a = mergeBrandHintsIntoAnswers(
      {},
      {
        company: 'Café Nord',
        websiteUrl: 'https://cafe-nord.de',
        source: 'url',
      }
    );
    expect(a.company).toBe('Café Nord');
    expect(a.websiteUrl).toMatch(/cafe-nord/);
    expect(a.features).toContain('web');
  });
});
