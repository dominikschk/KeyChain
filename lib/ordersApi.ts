/**
 * Bestellungen: Short-ID ↔ Bestellung ↔ Status (manuell oder Shopify-Webhook).
 * Print-QC: Freigabe vor Produktion.
 */
import { supabase } from './supabase';
import type { PrintQcStatus } from './adminOps';

export interface OrderRow {
  id: string;
  shopify_order_id: string | null;
  order_number: string | null;
  short_id: string;
  config_id: string | null;
  status: string;
  print_qc_status?: string | null;
  print_qc_note?: string | null;
  print_qc_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const STATUS_OPTIONS = ['pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof STATUS_OPTIONS)[number];

export function getOrderStatusOptions(): OrderStatus[] {
  return [...STATUS_OPTIONS];
}

export function isShopifySyncedOrder(row: OrderRow): boolean {
  return !!(row.shopify_order_id && String(row.shopify_order_id).trim());
}

export async function getOrdersList(): Promise<OrderRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as OrderRow[];
}

export async function createOrder(payload: {
  short_id: string;
  order_number?: string;
  shopify_order_id?: string;
  config_id?: string;
  status?: string;
}): Promise<OrderRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('orders')
    .insert({
      short_id: payload.short_id,
      order_number: payload.order_number ?? null,
      shopify_order_id: payload.shopify_order_id ?? null,
      config_id: payload.config_id ?? null,
      status: payload.status ?? 'pending',
      print_qc_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return null;
  return data as OrderRow;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  return !error;
}

export async function updateOrderPrintQc(
  orderId: string,
  printQcStatus: PrintQcStatus,
  note?: string,
  /** Bei Freigabe optional Status auf in_production setzen */
  promoteToProduction = false
): Promise<OrderRow | null> {
  if (!supabase) return null;
  const patch: Record<string, unknown> = {
    print_qc_status: printQcStatus,
    print_qc_note: note?.trim() || null,
    print_qc_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (promoteToProduction && printQcStatus === 'approved') {
    patch.status = 'in_production';
  }
  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .select()
    .single();
  if (error) return null;
  return data as OrderRow;
}
