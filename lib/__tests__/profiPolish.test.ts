import { describe, expect, it } from 'vitest';
import { assessLogoHealth } from '../logoHealth';
import { isProbablyOpenNow, parsePriceItems, serializePriceItems } from '../sectionContent';

describe('logoHealth', () => {
  it('ohne Logo: info', () => {
    const h = assessLogoHealth(null);
    expect(h.level).toBe('info');
    expect(h.willSimplifyForPrint).toBe(false);
  });

  it('Raster mit keep-colors: vereinfachen', () => {
    const svg =
      '<svg data-nudaim-logo="raster" data-keep-colors="1" data-has-print="1"></svg>';
    const h = assessLogoHealth(svg);
    expect(h.willSimplifyForPrint).toBe(true);
    expect(h.level).toBe('info');
  });

  it('Vektor mit vielen fills: warn', () => {
    const svg =
      '<svg><path fill="#111"/><path fill="#222"/><path fill="#333"/><path fill="#444"/></svg>';
    const h = assessLogoHealth(svg);
    expect(h.level).toBe('warn');
    expect(h.willSimplifyForPrint).toBe(true);
  });
});

describe('sectionContent', () => {
  it('Preise roundtrip', () => {
    const json = serializePriceItems([{ name: 'Schnitt', price: '25 €', note: '30 Min' }]);
    expect(parsePriceItems(json)[0]?.name).toBe('Schnitt');
  });

  it('Öffnungszeiten Mo–Fr grob erkannt', () => {
    // Mittwoch 12:00
    const wedNoon = new Date('2026-07-15T12:00:00');
    expect(isProbablyOpenNow('Mo–Fr 9:00–18:00', wedNoon)).toBe(true);
    expect(isProbablyOpenNow('Mo–Fr 9:00–11:00', wedNoon)).toBe(false);
  });
});
