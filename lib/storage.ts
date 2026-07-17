/**
 * Supabase storage helpers: upload and public URL.
 * Paths must be unique – bucket policies disallow UPDATE (no overwrite).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'nudaim';
const CACHE_CONTROL = '3600';

/** Extensions allowed by storage RLS (keep in sync with supabase-schema.sql). */
const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'stl',
]);

export interface UploadOptions {
  cacheControl?: string;
}

function assertAllowedPath(path: string): void {
  const base = path.split('/').pop() ?? path;
  const dot = base.lastIndexOf('.');
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Dateityp .${ext || '?'} ist nicht erlaubt.`);
  }
}

/**
 * Uploads a blob to the nudaim bucket and returns the public URL, or null on failure.
 * Upsert is intentionally unsupported (storage RLS has no UPDATE for anon).
 */
export async function uploadAndGetPublicUrl(
  supabase: SupabaseClient,
  path: string,
  blob: Blob,
  options: UploadOptions = {}
): Promise<string | null> {
  try {
    assertAllowedPath(path);
  } catch (e) {
    console.error('Storage path rejected:', e);
    return null;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: options.cacheControl ?? CACHE_CONTROL,
    upsert: false,
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
  const id = crypto.randomUUID().replace(/-/g, '');
  if (!filename) return `${prefix}${id}`;
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
  const dot = safe.lastIndexOf('.');
  if (dot >= 0) {
    return `${prefix}${id}${safe.slice(dot).toLowerCase()}`;
  }
  return `${prefix}${id}_${safe}`;
}
