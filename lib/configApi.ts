/**
 * Supabase-API: Konfigurationen und Scan-Statistiken laden.
 * Öffentliche Reads laufen über SECURITY DEFINER RPCs (enge RLS).
 */
import { supabase } from './supabase';
import { DEFAULT_CONFIG } from '../constants';
import type { ModelConfig, NFCBlock } from '../types';

export interface ConfigRow {
  id: string;
  short_id: string;
  profile_title: string;
  preview_image?: string | null;
  stl_url?: string | null;
  header_image_url?: string | null;
  profile_logo_url?: string | null;
  accent_color?: string | null;
  theme?: string | null;
  font_style?: string | null;
  plate_data?: Record<string, unknown> | null;
  product_type?: string | null;
  created_at?: string | null;
}

export interface BlockRow {
  id: string;
  config_id: string;
  type: string;
  title: string | null;
  content: string | null;
  button_type: string | null;
  image_url: string | null;
  settings: Record<string, unknown> | null;
  sort_order: number;
}

function mapBlockRow(row: BlockRow): NFCBlock {
  return {
    id: row.id,
    type: row.type as NFCBlock['type'],
    content: row.content ?? '',
    title: row.title ?? undefined,
    buttonType: row.button_type as NFCBlock['buttonType'] | undefined,
    imageUrl: row.image_url ?? undefined,
    settings: (row.settings as NFCBlock['settings']) ?? undefined,
  };
}

/**
 * Konfiguration anhand short_id (RPC – für Microsite und CCP).
 */
export async function getConfigByShortId(shortId: string): Promise<{ config: ModelConfig; configId: string; logoSvg?: string | null } | null> {
  if (!supabase) return null;

  const { data: configRows, error: configError } = await supabase
    .rpc('get_config_by_short_id', { p_short_id: shortId });

  if (configError || !configRows?.length) return null;
  const configRow = configRows[0] as ConfigRow;

  const { data: blocks, error: blocksError } = await supabase
    .rpc('get_blocks_for_config', { p_config_id: configRow.id });

  const plate = (configRow.plate_data as Record<string, unknown>) || {};
  const base = { ...DEFAULT_CONFIG };

  const config: ModelConfig = {
    ...base,
    profileTitle: configRow.profile_title ?? base.profileTitle,
    headerImageUrl: configRow.header_image_url ?? undefined,
    profileLogoUrl: configRow.profile_logo_url ?? undefined,
    accentColor: configRow.accent_color ?? base.accentColor,
    theme: (configRow.theme as ModelConfig['theme']) ?? base.theme,
    fontStyle: (configRow.font_style as ModelConfig['fontStyle']) ?? base.fontStyle,
    nfcBlocks: blocksError ? [] : (blocks || []).map((b: BlockRow) => mapBlockRow(b)),
    baseType: (plate.baseType as ModelConfig['baseType']) ?? base.baseType,
    plateWidth: Number(plate.plateWidth) ?? base.plateWidth,
    plateHeight: Number(plate.plateHeight) ?? base.plateHeight,
    plateDepth: Number(plate.plateDepth) ?? base.plateDepth,
    logoScale: Number(plate.logoScale) ?? base.logoScale,
    logoColor: (plate.logoColor as string) ?? base.logoColor,
    logoDepth: Number(plate.logoDepth) ?? base.logoDepth,
    logoPosX: Number(plate.logoPosX) ?? base.logoPosX,
    logoPosY: Number(plate.logoPosY) ?? base.logoPosY,
    logoRotation: Number(plate.logoRotation) ?? base.logoRotation,
  };

  const logoSvg = (plate.logo_svg as string | undefined) || null;

  return { config, configId: configRow.id, logoSvg };
}

/**
 * Liste aller Konfigurationen (nur Admin-Session + RLS).
 */
export async function getConfigsList(): Promise<ConfigRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('nfc_configs')
    .select('id, short_id, profile_title, preview_image, stl_url, created_at')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data as ConfigRow[]) || [];
}

/**
 * STL-URL nach Upload setzen (RPC – kein offenes UPDATE für anon).
 */
export async function setConfigStlUrl(configId: string, stlUrl: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('set_nfc_config_stl_url', {
    p_config_id: configId,
    p_stl_url: stlUrl,
  });
  return !error;
}

/**
 * Scan speichern (anon INSERT erlaubt).
 */
export async function recordScan(configId: string): Promise<void> {
  if (!supabase) return;

  await supabase.from('nfc_scans').insert([{ config_id: configId }]);
}

/**
 * Anzahl Scans (RPC für CCP).
 */
export async function getScanCount(configId: string): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase.rpc('get_scan_count', { p_config_id: configId });
  if (error) return 0;
  return Number(data ?? 0);
}

/**
 * Anzahl Scans der letzten 30 Tage (RPC für CCP).
 */
export async function getScanCountLast30Days(configId: string): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase.rpc('get_scan_count_last_30_days', {
    p_config_id: configId,
  });
  if (error) return 0;
  return Number(data ?? 0);
}
