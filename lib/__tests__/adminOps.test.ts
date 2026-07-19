import { describe, expect, it } from 'vitest';
import {
  filterOrders,
  getPrintQcStatus,
  isSlaOverdue,
  buildProductionCsv,
  buildStlUrlManifest,
  formatReprintNote,
} from '../adminOps';
import type { OrderRow } from '../ordersApi';
import type { ConfigRow } from '../configApi';
import { parseFaqItems, serializeFaqItems, parseGalleryUrls } from '../contentBlocks';
import { t } from '../i18n';
import { buildScanInsight } from '../scanInsights';
import { filamentForProduct, filamentCustomerHint } from '../filamentProfiles';

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

describe('stl batch + reprint', () => {
  it('formatReprintNote', () => {
    expect(formatReprintNote('colors')).toMatch(/Reprint/);
    expect(formatReprintNote('machine', 'Düse verstopft')).toMatch(/Düse/);
  });

  it('STL-Manifest nur https', () => {
    const orders = [order({ short_id: 'ABCDEFGHJKLMNPQR' })];
    const configs: ConfigRow[] = [
      {
        id: '1',
        short_id: 'ABCDEFGHJKLMNPQR',
        profile_title: 'T',
        stl_url: 'https://cdn.example.com/a.stl',
      },
    ];
    const text = buildStlUrlManifest(orders, configs);
    expect(text).toContain('https://cdn.example.com/a.stl');
    expect(text).toContain('ABCDEFGHJKLMNPQR');
  });
});

describe('scanInsights', () => {
  it('ohne Scans', () => {
    expect(buildScanInsight(0, 0).headline).toMatch(/Keine|keine/i);
  });
  it('aktiv', () => {
    const i = buildScanInsight(40, 25);
    expect(i.activityPct).toBeGreaterThan(50);
  });
});

describe('filamentProfiles', () => {
  it('keychain profil', () => {
    expect(filamentForProduct('keychain').material).toMatch(/PLA/i);
    expect(filamentCustomerHint('badge')).toMatch(/Badge|PLA/i);
  });
});
