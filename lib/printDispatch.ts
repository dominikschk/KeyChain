/**
 * Auto-Druck: Payload + Status-Helfer für den Dispatch nach QC-Freigabe.
 * Zielpfad: Webhook → lokale Bambu-Bridge (Farm Manager / LAN).
 */

export type PrintDispatchStatus = 'idle' | 'dispatched' | 'failed' | 'skipped';

export const PRINT_DISPATCH_STATUSES: PrintDispatchStatus[] = [
  'idle',
  'dispatched',
  'failed',
  'skipped',
];

export type PrintDispatchJob = {
  event: 'print.dispatch';
  /** Empfänger-System; Bridge filtert darauf */
  target: 'bambu_lab';
  order_id: string;
  short_id: string;
  order_number: string | null;
  shopify_order_id: string | null;
  stl_url: string | null;
  print_png_url: string | null;
  plate_color: string | null;
  preview_image: string | null;
  /** Hinweis für Bridge: STL muss vor dem Druck gesliced werden */
  needs_slice: true;
  file_hints: {
    preferred_name: string;
    stl_filename: string;
    print_png_filename: string | null;
  };
  dispatched_at: string;
};

export type PrintDispatchInput = {
  orderId: string;
  shortId: string;
  orderNumber?: string | null;
  shopifyOrderId?: string | null;
  stlUrl?: string | null;
  printPngUrl?: string | null;
  plateColor?: string | null;
  previewImage?: string | null;
  dispatchedAt?: string;
};

function httpsOrNull(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const t = url.trim();
  return t.startsWith('https://') ? t : null;
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 32) || 'job';
}

/** Baue den JSON-Payload für die Bambu-Bridge / Druckerei-Automation. */
export function buildPrintDispatchJob(input: PrintDispatchInput): PrintDispatchJob {
  const short = safeFilePart(input.shortId);
  const stlUrl = httpsOrNull(input.stlUrl);
  const pngUrl = httpsOrNull(input.printPngUrl);
  return {
    event: 'print.dispatch',
    target: 'bambu_lab',
    order_id: input.orderId,
    short_id: input.shortId,
    order_number: input.orderNumber?.trim() || null,
    shopify_order_id: input.shopifyOrderId?.trim() || null,
    stl_url: stlUrl,
    print_png_url: pngUrl,
    plate_color: input.plateColor?.trim() || null,
    preview_image: httpsOrNull(input.previewImage),
    needs_slice: true,
    file_hints: {
      preferred_name: `nudaim-${short}`,
      stl_filename: `nudaim-${short}.stl`,
      print_png_filename: pngUrl ? `nudaim-${short}-print.png` : null,
    },
    dispatched_at: input.dispatchedAt || new Date().toISOString(),
  };
}

/** Ohne STL und ohne Print-PNG gibt es nichts Sinnvolles zu drucken. */
export function hasPrintableAssets(job: Pick<PrintDispatchJob, 'stl_url' | 'print_png_url'>): boolean {
  return !!(job.stl_url || job.print_png_url);
}

export function normalizePrintDispatchStatus(value: string | null | undefined): PrintDispatchStatus {
  const s = (value || 'idle').toLowerCase();
  if (s === 'dispatched' || s === 'failed' || s === 'skipped') return s;
  return 'idle';
}

/** Kurztext für Admin-Tabelle. */
export function printDispatchLabel(status: PrintDispatchStatus): string {
  switch (status) {
    case 'dispatched':
      return 'An Bambu-Bridge gesendet';
    case 'failed':
      return 'Bambu-Versand fehlgeschlagen';
    case 'skipped':
      return 'Kein Auto-Druck';
    default:
      return 'Noch nicht gesendet';
  }
}

export function buildPrintShopEmailHtml(job: PrintDispatchJob): string {
  const lines = [
    `<p><strong>NUDAIM – Druckauftrag (Bambu)</strong></p>`,
    `<p>Short-ID: <code>${escapeHtml(job.short_id)}</code></p>`,
    job.order_number ? `<p>Bestellung: ${escapeHtml(job.order_number)}</p>` : '',
    job.plate_color ? `<p>Plattenfarbe: ${escapeHtml(job.plate_color)}</p>` : '',
    job.stl_url
      ? `<p><a href="${escapeHtml(job.stl_url)}">STL herunterladen</a> → in Bambu Studio / Farm Manager slicen</p>`
      : '<p>Kein STL vorhanden.</p>',
    job.print_png_url
      ? `<p><a href="${escapeHtml(job.print_png_url)}">Print-PNG herunterladen</a></p>`
      : '<p>Kein Print-PNG vorhanden.</p>',
    `<p style="color:#666;font-size:12px;">Automatisch nach QC-Freigabe · ${escapeHtml(job.dispatched_at)}</p>`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildPrintShopEmailText(job: PrintDispatchJob): string {
  return [
    'NUDAIM – Druckauftrag (Bambu)',
    `Short-ID: ${job.short_id}`,
    job.order_number ? `Bestellung: ${job.order_number}` : null,
    job.plate_color ? `Plattenfarbe: ${job.plate_color}` : null,
    job.stl_url ? `STL: ${job.stl_url}` : 'Kein STL vorhanden.',
    job.print_png_url ? `Print-PNG: ${job.print_png_url}` : 'Kein Print-PNG vorhanden.',
    'Hinweis: STL vor dem Druck in Bambu Studio / Farm Manager slicen.',
    `Zeit: ${job.dispatched_at}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
