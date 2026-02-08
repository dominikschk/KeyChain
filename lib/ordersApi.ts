/**
 * Bestellungen: Short-ID ↔ Bestellung ↔ Status (manuell oder später Shopify-Sync).
 */
import { supabase } from './supabase';

export interface OrderRow {
  id: string;
  shopify_order_id: string | null;
  order_number: string | null;
  short_id: string;
  config_id: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

const STATUS_OPTIONS = ['pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof STATUS_OPTIONS)[number];

export function getOrderStatusOptions(): OrderStatus[] {
  return [...STATUS_OPTIONS];
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
