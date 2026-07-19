import { describe, expect, it } from 'vitest';
import { generateShortId, generateWriteToken, formatFileSize } from '../utils';
import {
  isSafeHttpUrl,
  toSafeHttpUrl,
  validateProfileTitle,
  validateLogoEngraveFile,
} from '../validation';
import { dataUrlToBlob, buildProductionPrintAssets } from '../printAssets';
import { isLikelyStlAscii, exportKeychainStl } from '../stlExport';
import { DEFAULT_CONFIG } from '../../constants';

describe('utils', () => {
  it('generateShortId liefert 16 Zeichen aus sicherem Alphabet', () => {
    const id = generateShortId();
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it('generateWriteToken liefert 64 Hex-Zeichen', () => {
    const t = generateWriteToken();
    expect(t).toHaveLength(64);
    expect(t).toMatch(/^[0-9a-f]+$/);
  });

  it('formatFileSize formatiert Bytes lesbar', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });
});

describe('validation', () => {
  it('lehnt unsichere URL-Schemas ab', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false);
    expect(toSafeHttpUrl('javascript:alert(1)')).toBeNull();
  });

  it('akzeptiert http(s) und ergänzt Schema', () => {
    expect(isSafeHttpUrl('https://nudaim3d.de')).toBe(true);
    expect(toSafeHttpUrl('nudaim3d.de')?.startsWith('https://')).toBe(true);
  });

  it('validateProfileTitle prüft Länge', () => {
    expect(validateProfileTitle('').valid).toBe(false);
    expect(validateProfileTitle('Cafe').valid).toBe(true);
    expect(validateProfileTitle('x'.repeat(201)).valid).toBe(false);
  });

  it('validateLogoEngraveFile akzeptiert PNG/SVG', () => {
    const png = new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' });
    const bad = new File([new Uint8Array([1])], 'notes.txt', { type: 'text/plain' });
    expect(validateLogoEngraveFile(png).valid).toBe(true);
    expect(validateLogoEngraveFile(bad).valid).toBe(false);
  });
});

describe('printAssets', () => {
  it('dataUrlToBlob dekodiert base64-PNG', () => {
    // 1x1 PNG
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).not.toBeNull();
    expect(blob!.type).toBe('image/png');
    expect(blob!.size).toBeGreaterThan(10);
  });

  it('buildProductionPrintAssets liefert Produktions-SVG für Vektor', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M0 0h10v10H0z" fill="#111"/></svg>';
    const assets = buildProductionPrintAssets(svg);
    expect(assets).not.toBeNull();
    expect(assets!.productionSvg).toContain('<svg');
    expect(assets!.printPngBlob).toBeNull();
  });
});

describe('stlExport', () => {
  it('isLikelyStlAscii erkennt ASCII-STL', () => {
    expect(isLikelyStlAscii('solid keychain\nfacet normal 0 0 1\nendsolid')).toBe(true);
    expect(isLikelyStlAscii('not an stl')).toBe(false);
  });

  it('exportKeychainStl erzeugt Platten-STL ohne Logo', async () => {
    const blob = await exportKeychainStl(DEFAULT_CONFIG, null);
    expect(blob).not.toBeNull();
    expect(blob!.type).toBe('model/stl');
    const text = await blob!.text();
    expect(isLikelyStlAscii(text)).toBe(true);
    expect(text.length).toBeGreaterThan(200);
  }, 30_000);

  it('exportKeychainStl extrudiert Vektor-Logo-Pfade', async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
      '<path d="M5 5 H35 V35 H5 Z" fill="#12A9E0"/>' +
      '</svg>';
    const blob = await exportKeychainStl(DEFAULT_CONFIG, svg);
    expect(blob).not.toBeNull();
    const text = await blob!.text();
    expect(isLikelyStlAscii(text)).toBe(true);
    // Mit Logo sollte die Facet-Zahl spürbar höher sein als nur Platte
    const facets = (text.match(/facet normal/gi) || []).length;
    expect(facets).toBeGreaterThan(50);
  }, 30_000);
});
