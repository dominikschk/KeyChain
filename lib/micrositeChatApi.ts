/**
 * Optional: KI-Chat über Supabase Edge Function microsite-chat.
 * Ohne Function/Key → Client nutzt geführten Fallback (micrositeChatEngine).
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatConfigPayload {
  profileTitle: string;
  accentColor: string;
  theme: 'light' | 'dark';
  fontStyle: 'luxury' | 'modern' | 'elegant';
  profileIcon: string;
  profileLogoUrl?: string | null;
  slogan?: string;
  blocks: Array<{
    type: string;
    title?: string;
    content?: string;
    buttonType?: string;
    settings?: Record<string, unknown>;
  }>;
}

export interface AiChatResponse {
  message: string;
  ready: boolean;
  config: AiChatConfigPayload | null;
  fallback?: boolean;
  error?: string;
}

export async function sendMicrositeChat(
  messages: AiChatMessage[]
): Promise<AiChatResponse | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/microsite-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ messages }),
    });

    if (res.status === 503) {
      return { message: '', ready: false, config: null, fallback: true };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        message: '',
        ready: false,
        config: null,
        fallback: true,
        error: (err as { error?: string }).error,
      };
    }

    const data = (await res.json()) as AiChatResponse;
    return data;
  } catch {
    return { message: '', ready: false, config: null, fallback: true };
  }
}
