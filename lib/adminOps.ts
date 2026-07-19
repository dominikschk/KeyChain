/**
 * Admin-Ops: Filter, Print-QC, CSV-Export, Fertigungs-SLA.
 */
import type { OrderRow } from './ordersApi';
import type { ConfigRow } from './configApi';
import { getPrintPngUrl } from './configApi';

export type PrintQcStatus = 'pending' | 'approved' | 'rejected';
export type OrderFilter = 'all' | 'paid' | 'qc_pending' | 'in_production' | 'shipped';

export const PRINT_QC_OPTIONS: PrintQcStatus[] = ['pending', 'approved', 'rejected'];

export function getPrintQcStatus(row: OrderRow): PrintQcStatus {
  const s = (row.print_qc_status || 'pending').toLowerCase();
  if (s === 'approved' || s === 'rejected') return s;
  return 'pending';
}

/** SLA: Produktionsstart innerhalb von 48h nach paid (updated_at wenn status paid). */
export function manufacturingSlaHours(row: OrderRow): number | null {
  if (row.status !== 'paid' && row.status !== 'in_production') return null;
  const start = row.updated_at || row.created_at;
  if (!start) return null;
  const ms = Date.now() - new Date(start).getTime();
  return Math.round((ms / 36e5) * 10) / 10;
}

export function isSlaOverdue(row: OrderRow, limitHours = 48): boolean {
  if (row.status !== 'paid') return false;
  if (getPrintQcStatus(row) === 'approved') return false;
  const h = manufacturingSlaHours(row);
  return h != null && h > limitHours;
}

export function filterOrders(orders: OrderRow[], filter: OrderFilter): OrderRow[] {
  switch (filter) {
    case 'paid':
      return orders.filter((o) => o.status === 'paid');
    case 'qc_pending':
      return orders.filter(
        (o) => (o.status === 'paid' || o.status === 'in_production') && getPrintQcStatus(o) === 'pending'
      );
    case 'in_production':
      return orders.filter((o) => o.status === 'in_production');
    case 'shipped':
      return orders.filter((o) => o.status === 'shipped' || o.status === 'delivered');
    default:
      return orders;
  }
}

export function buildProductionCsv(
  orders: OrderRow[],
  configs: ConfigRow[],
  baseUrl: string
): string {
  const byShort = new Map(configs.map((c) => [c.short_id, c]));
  const headers = [
    'order_number',
    'shopify_order_id',
    'short_id',
    'status',
    'print_qc_status',
    'stl_url',
    'print_png_url',
    'preview_image',
    'microsite_url',
    'sla_hours',
  ];
  const lines = [headers.join(',')];
  for (const o of orders) {
    const cfg = byShort.get(o.short_id);
    const printPng = cfg ? getPrintPngUrl(cfg) : null;
    const row = [
      o.order_number ?? '',
      o.shopify_order_id ?? '',
      o.short_id,
      o.status,
      getPrintQcStatus(o),
      cfg?.stl_url ?? '',
      printPng ?? '',
      cfg?.preview_image ?? '',
      `${baseUrl.replace(/\/$/, '')}/?id=${encodeURIComponent(o.short_id)}`,
      manufacturingSlaHours(o)?.toString() ?? '',
    ].map(csvEscape);
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Gründe bei QC-Ablehnung / Reprint (für Metrik). */
export const REPRINT_REASONS = [
  { id: 'colors', label: 'Farben / Logo zu unklar' },
  { id: 'geometry', label: 'Form / STL-Problem' },
  { id: 'customer', label: 'Kundenwunsch / Änderung' },
  { id: 'machine', label: 'Drucker / Material' },
  { id: 'other', label: 'Sonstiges' },
] as const;

export type ReprintReasonId = (typeof REPRINT_REASONS)[number]['id'];

export function formatReprintNote(reasonId: ReprintReasonId, extra?: string): string {
  const label = REPRINT_REASONS.find((r) => r.id === reasonId)?.label || reasonId;
  const more = (extra || '').trim();
  return more ? `Reprint: ${label} – ${more}` : `Reprint: ${label}`;
}

/**
 * STL-URL-Liste für die gefilterte Queue (Batch für Druckerei, ohne ZIP-Lib).
 */
export function buildStlUrlManifest(
  orders: OrderRow[],
  configs: ConfigRow[]
): string {
  const byShort = new Map(configs.map((c) => [c.short_id, c]));
  const lines = ['# NUDAIM STL-Batch', `# ${new Date().toISOString()}`, '# short_id\tstl_url', ''];
  let n = 0;
  for (const o of orders) {
    const cfg = byShort.get(o.short_id);
    const url = cfg?.stl_url;
    if (url && url.startsWith('https://')) {
      lines.push(`${o.short_id}\t${url}`);
      n += 1;
    }
  }
  lines.push('', `# ${n} STL-Links`);
  return lines.join('\n');
}

export function collectStlUrls(orders: OrderRow[], configs: ConfigRow[]): string[] {
  const byShort = new Map(configs.map((c) => [c.short_id, c]));
  const urls: string[] = [];
  for (const o of orders) {
    const url = byShort.get(o.short_id)?.stl_url;
    if (url && url.startsWith('https://')) urls.push(url);
  }
  return urls;
}
