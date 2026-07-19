import { describe, expect, it } from 'vitest';
import {
  extractShortIdFromProperties,
  extractShortIdsFromOrder,
  mapShopifyFinancialStatus,
  shopifyOrderId,
  shopifyOrderNumber,
  timingSafeEqualString,
} from '../shopifyWebhook';

describe('shopifyWebhook parsing', () => {
  it('liest Config-ID aus Properties', () => {
    const id = extractShortIdFromProperties([
      { name: 'Config-ID', value: 'ABCDEFGHJKLMNPQR' },
      { name: 'Preview', value: 'https://example.com/x.png' },
    ]);
    expect(id).toBe('ABCDEFGHJKLMNPQR');
  });

  it('fällt auf Handy-Seite ?id= zurück', () => {
    const id = extractShortIdFromProperties([
      { name: 'Handy-Seite', value: 'https://konfigurator.nudaim3d.de/?id=ABCDEFGHJKLMNPQR' },
    ]);
    expect(id).toBe('ABCDEFGHJKLMNPQR');
  });

  it('verwirft ungültige Short-IDs', () => {
    expect(extractShortIdFromProperties([{ name: 'Config-ID', value: 'short' }])).toBeNull();
    expect(extractShortIdFromProperties([{ name: 'Config-ID', value: 'javascript:alert(1)' }])).toBeNull();
  });

  it('sammelt Short-IDs aus Order-Line-Items', () => {
    const ids = extractShortIdsFromOrder({
      id: 99,
      line_items: [
        { properties: [{ name: 'Config-ID', value: 'ABCDEFGHJKLMNPQR' }] },
        { properties: [{ name: 'Config-ID', value: 'ABCDEFGHJKLMNPQR' }] },
        { properties: [{ name: 'Config-ID', value: 'ZZZZZZZZZZZZZZZZ' }] },
      ],
    });
    expect(ids).toEqual(['ABCDEFGHJKLMNPQR', 'ZZZZZZZZZZZZZZZZ']);
  });

  it('mappt financial_status und Topic auf Order-Status', () => {
    expect(mapShopifyFinancialStatus('paid')).toBe('paid');
    expect(mapShopifyFinancialStatus('pending', 'orders/paid')).toBe('paid');
    expect(mapShopifyFinancialStatus('pending', 'orders/create')).toBe('pending');
    expect(mapShopifyFinancialStatus('refunded')).toBe('cancelled');
  });

  it('normalisiert Order-Nummer und ID', () => {
    expect(shopifyOrderId({ id: 12345 })).toBe('12345');
    expect(shopifyOrderNumber({ name: '#1001' })).toBe('#1001');
    expect(shopifyOrderNumber({ order_number: 1002 })).toBe('#1002');
  });

  it('timingSafeEqualString', () => {
    expect(timingSafeEqualString('abc', 'abc')).toBe(true);
    expect(timingSafeEqualString('abc', 'abd')).toBe(false);
    expect(timingSafeEqualString('abc', 'ab')).toBe(false);
  });
});
