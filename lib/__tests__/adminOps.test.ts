import { describe, expect, it } from 'vitest';
import {
  filterOrders,
  getPrintQcStatus,
  isSlaOverdue,
  buildProductionCsv,
} from '../adminOps';
import type { OrderRow } from '../ordersApi';
import { parseFaqItems, serializeFaqItems, parseGalleryUrls } from '../contentBlocks';
import { t } from '../i18n';

function order(partial: Partial<OrderRow>): OrderRow {
  return {
    id: partial.id ?? '1',
    shopify_order_id: partial.shopify_order_id ?? null,
    order_number: partial.order_number ?? '#1',
    short_id: partial.short_id ?? 'ABCDEFGHJKLMNPQR',
    config_id: null,
    status: partial.status ?? 'paid',
    print_qc_status: partial.print_qc_status ?? 'pending',
    print_qc_note: null,
    print_qc_at: null,
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? new Date(Date.now() - 50 * 3600_000).toISOString(),
  };
}

describe('adminOps', () => {
  it('filtert QC-offen', () => {
    const rows = [
      order({ id: 'a', status: 'paid', print_qc_status: 'pending' }),
      order({ id: 'b', status: 'paid', print_qc_status: 'approved' }),
      order({ id: 'c', status: 'shipped', print_qc_status: 'pending' }),
    ];
    expect(filterOrders(rows, 'qc_pending').map((o) => o.id)).toEqual(['a']);
  });

  it('erkennt SLA-Überschreitung bei paid ohne QC', () => {
    const overdue = order({ status: 'paid', print_qc_status: 'pending' });
    expect(isSlaOverdue(overdue, 48)).toBe(true);
    expect(isSlaOverdue(order({ status: 'paid', print_qc_status: 'approved' }), 48)).toBe(false);
  });

  it('CSV enthält Header und Short-ID', () => {
    const csv = buildProductionCsv([order({})], [], 'https://example.com');
    expect(csv.split('\n')[0]).toContain('short_id');
    expect(csv).toContain('ABCDEFGHJKLMNPQR');
  });

  it('getPrintQcStatus normalisiert', () => {
    expect(getPrintQcStatus(order({ print_qc_status: 'approved' }))).toBe('approved');
    expect(getPrintQcStatus(order({ print_qc_status: null }))).toBe('pending');
  });
});

describe('contentBlocks', () => {
  it('FAQ roundtrip', () => {
    const json = serializeFaqItems([{ q: 'Wann?', a: 'Mo–Fr' }]);
    expect(parseFaqItems(json)).toEqual([{ q: 'Wann?', a: 'Mo–Fr' }]);
  });

  it('Galerie nur https', () => {
    expect(parseGalleryUrls('https://a.com/x.png\nhttp://bad.com\nftp://x')).toEqual([
      'https://a.com/x.png',
    ]);
  });
});

describe('i18n', () => {
  it('liefert DE und EN', () => {
    expect(t('admin.export', 'de')).toContain('CSV');
    expect(t('admin.export', 'en').toLowerCase()).toContain('csv');
  });
});
