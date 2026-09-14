/**
 * Client: nach QC-Freigabe Druckauftrag an Edge Function schicken.
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';
import { getAdminSession } from './adminAuth';
import type { OrderRow } from './ordersApi';
import type { PrintDispatchStatus } from './printDispatch';

export type DispatchPrintResult = {
  ok: boolean;
  status: PrintDispatchStatus;
  message?: string;
  order?: OrderRow | null;
};

export async function dispatchPrintJob(
  orderId: string,
  opts?: { force?: boolean }
): Promise<DispatchPrintResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 'skipped', message: 'Supabase nicht konfiguriert' };
  }
  const session = await getAdminSession();
  if (!session?.access_token) {
    return { ok: false, status: 'failed', message: 'Nicht angemeldet' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dispatch-print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ order_id: orderId, force: !!opts?.force }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      status?: PrintDispatchStatus;
      message?: string;
      error?: string;
      order?: OrderRow;
    };
    if (!res.ok) {
      return {
        ok: false,
        status: data.status === 'skipped' ? 'skipped' : 'failed',
        message: data.error || data.message || `HTTP ${res.status}`,
        order: data.order ?? null,
      };
    }
    return {
      ok: data.ok !== false,
      status: data.status || 'dispatched',
      message: data.message,
      order: data.order ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'failed',
      message: e instanceof Error ? e.message : 'Netzwerkfehler',
    };
  }
}
