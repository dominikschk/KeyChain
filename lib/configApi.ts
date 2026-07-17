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
    surfaceColor: (plate.surfaceColor as string | undefined) ?? base.surfaceColor,
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
 * STL-URL nach Upload setzen (RPC – write_token + einmalig, kein offenes UPDATE).
 */
export async function setConfigStlUrl(
  configId: string,
  stlUrl: string,
  writeToken: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('set_nfc_config_stl_url', {
    p_config_id: configId,
    p_stl_url: stlUrl,
    p_write_token: writeToken,
  });
  return !error;
}

export interface InsertBlockPayload {
  type: string;
  title?: string;
  content?: string;
  button_type?: string;
  image_url?: string;
  settings?: Record<string, unknown>;
}

/**
 * NFC-Blöcke einmalig anlegen (RPC – write_token, verhindert Fremd-Injection).
 */
export async function insertConfigBlocks(
  configId: string,
  writeToken: string,
  blocks: InsertBlockPayload[]
): Promise<boolean> {
  if (!supabase) return false;
  if (blocks.length === 0) return true;
  const { error } = await supabase.rpc('insert_nfc_blocks', {
    p_config_id: configId,
    p_write_token: writeToken,
    p_blocks: blocks,
  });
  return !error;
}

export interface UpdateProfilePayload {
  profileTitle: string;
  headerImageUrl?: string | null;
  profileLogoUrl?: string | null;
  accentColor: string;
  theme: string;
  fontStyle: string;
}

/**
 * Digitale Profilfelder aktualisieren (RPC – write_token; kein plate/STL/short_id).
 */
export async function updateConfigProfile(
  configId: string,
  writeToken: string,
  profile: UpdateProfilePayload
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert.' };
  const { error } = await supabase.rpc('update_nfc_config_profile', {
    p_config_id: configId,
    p_write_token: writeToken,
    p_profile_title: profile.profileTitle,
    p_header_image_url: profile.headerImageUrl ?? null,
    p_profile_logo_url: profile.profileLogoUrl ?? null,
    p_accent_color: profile.accentColor,
    p_theme: profile.theme,
    p_font_style: profile.fontStyle,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Alle Blöcke ersetzen (RPC – write_token).
 */
export async function replaceConfigBlocks(
  configId: string,
  writeToken: string,
  blocks: InsertBlockPayload[]
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert.' };
  const { error } = await supabase.rpc('replace_nfc_blocks', {
    p_config_id: configId,
    p_write_token: writeToken,
    p_blocks: blocks,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
