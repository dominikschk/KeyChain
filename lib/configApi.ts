/**
 * Supabase-API: Konfigurationen und Scan-Statistiken laden.
 */
import { supabase } from './supabase';
import { DEFAULT_CONFIG } from '../constants';
import type { ModelConfig, NFCBlock } from '../types';

export interface ConfigRow {
  id: string;
  short_id: string;
  profile_title: string;
  header_image_url?: string | null;
  profile_logo_url?: string | null;
  accent_color?: string | null;
  theme?: string | null;
  font_style?: string | null;
  plate_data?: Record<string, unknown> | null;
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
 * Konfiguration anhand short_id aus Supabase laden (für Microsite-URL ?id=short_id und CCP).
 */
export async function getConfigByShortId(shortId: string): Promise<{ config: ModelConfig; configId: string } | null> {
  if (!supabase) return null;

  const { data: configRow, error: configError } = await supabase
    .from('nfc_configs')
    .select('*')
    .eq('short_id', shortId)
    .maybeSingle();

  if (configError || !configRow) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('nfc_blocks')
    .select('*')
    .eq('config_id', configRow.id)
    .order('sort_order', { ascending: true });

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
    nfcBlocks: blocksError ? [] : (blocks || []).map((b) => mapBlockRow(b as BlockRow)),
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

  return { config, configId: configRow.id };
}

/**
 * Liste aller gespeicherten Konfigurationen (für Admin).
 */
export async function getConfigsList(): Promise<ConfigRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('nfc_configs')
    .select('id, short_id, profile_title')
    .order('id', { ascending: false });

  if (error) return [];
  return (data as ConfigRow[]) || [];
}

/**
 * Einen Scan für eine Konfiguration in Supabase speichern (wird beim Aufruf der Microsite aufgerufen).
 */
export async function recordScan(configId: string): Promise<void> {
  if (!supabase) return;

  await supabase.from('nfc_scans').insert([{ config_id: configId }]);
}

/**
 * Anzahl Scans für eine Konfiguration (Tabelle nfc_scans: config_id, scanned_at).
 * Wenn die Tabelle fehlt, wird 0 zurückgegeben.
 */
export async function getScanCount(configId: string): Promise<number> {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('nfc_scans')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Anzahl Scans der letzten 30 Tage für eine Konfiguration.
 */
export async function getScanCountLast30Days(configId: string): Promise<number> {
  if (!supabase) return 0;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const { count, error } = await supabase
    .from('nfc_scans')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .gte('scanned_at', sinceIso);

  if (error) return 0;
  return count ?? 0;
}
