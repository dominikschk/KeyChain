import { describe, expect, it } from 'vitest';
import {
  buildPrintDispatchJob,
  buildPrintShopEmailText,
  hasPrintableAssets,
  normalizePrintDispatchStatus,
  printDispatchLabel,
} from '../printDispatch';

describe('printDispatch', () => {
  it('baut Payload mit https-Assets', () => {
    const job = buildPrintDispatchJob({
      orderId: 'ord-1',
      shortId: 'ABCDEFGHJKLMNPQR',
      orderNumber: '#1001',
      stlUrl: 'https://cdn.example.com/a.stl',
      printPngUrl: 'http://insecure.example.com/a.png',
      plateColor: '#2A2A2A',
      dispatchedAt: '2026-09-14T12:00:00.000Z',
    });
    expect(job.event).toBe('print.dispatch');
    expect(job.target).toBe('bambu_lab');
    expect(job.needs_slice).toBe(true);
    expect(job.file_hints.stl_filename).toContain('.stl');
    expect(job.stl_url).toContain('https://');
    expect(job.print_png_url).toBeNull();
    expect(hasPrintableAssets(job)).toBe(true);
  });

  it('erkennt fehlende Assets', () => {
    const job = buildPrintDispatchJob({
      orderId: 'ord-2',
      shortId: 'XYZ',
      stlUrl: 'ftp://bad',
    });
    expect(hasPrintableAssets(job)).toBe(false);
  });

  it('normalisiert Status und Labels', () => {
    expect(normalizePrintDispatchStatus('dispatched')).toBe('dispatched');
    expect(normalizePrintDispatchStatus(null)).toBe('idle');
    expect(printDispatchLabel('failed')).toContain('Bambu');
    expect(printDispatchLabel('dispatched')).toContain('Bambu');
  });

  it('baut Klartext-Mail mit Links', () => {
    const job = buildPrintDispatchJob({
      orderId: 'ord-3',
      shortId: 'SHORTID16CHARSXX',
      stlUrl: 'https://cdn.example.com/x.stl',
      printPngUrl: 'https://cdn.example.com/x.png',
      dispatchedAt: '2026-09-14T12:00:00.000Z',
    });
    const text = buildPrintShopEmailText(job);
    expect(text).toContain('SHORTID16CHARSXX');
    expect(text).toContain('https://cdn.example.com/x.stl');
  });
});
