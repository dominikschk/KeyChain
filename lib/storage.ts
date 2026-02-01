/**
 * Supabase storage helpers: upload and public URL.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'nudaim';
const CACHE_CONTROL = '3600';

export interface UploadOptions {
  cacheControl?: string;
  upsert?: boolean;
}

/**
 * Uploads a blob to the nudaim bucket and returns the public URL, or null on failure.
 */
export async function uploadAndGetPublicUrl(
  supabase: SupabaseClient,
  path: string,
  blob: Blob,
  options: UploadOptions = {}
): Promise<string | null> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: options.cacheControl ?? CACHE_CONTROL,
    upsert: options.upsert ?? false,
  });

  if (error) {
    console.error('Storage upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Generates a unique storage path with optional prefix (e.g. "nudaim_", "b_", "l_", "img_").
 */
export function storagePath(prefix: string, filename?: string): string {
  const suffix = filename ? `_${filename}` : '';
  return `${prefix}${Date.now()}${suffix}`;
}
