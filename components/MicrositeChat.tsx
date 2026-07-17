/**
 * Microsite-Assistent – große Schrift, Fortschritt, Antippen-Vorschläge („Uwe-tauglich“).
 * ChatGPT/OpenAI nur über Edge-Function-Secret OPENAI_API_KEY (nie im Frontend-Code).
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Send, Loader2, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { ModelConfig, NFCBlock, ActionIcon } from '../types';
import {
  advanceChat,
  createChatSession,
  getStepMeta,
  type ChatSession,
} from '../lib/micrositeChatEngine';
import { sendMicrositeChat } from '../lib/micrositeChatApi';
import { generateSecureKey } from '../lib/utils';

interface MicrositeChatProps {
  config: ModelConfig;
  onApplyConfig: (next: ModelConfig) => void;
  onClose: () => void;
}

function applyAiPayload(
  base: ModelConfig,
  payload: NonNullable<Awaited<ReturnType<typeof sendMicrositeChat>>>['config']
): ModelConfig | null {
  if (!payload) return null;
  const blocks: NFCBlock[] = (payload.blocks || []).map((b) => {
    const block: NFCBlock = {
      id: crypto.randomUUID(),
      type: (b.type as NFCBlock['type']) || 'magic_button',
      title: b.title || '',
      content: b.content || '',
      buttonType: b.buttonType as NFCBlock['buttonType'],
      settings: b.settings as NFCBlock['settings'],
    };
    if (block.buttonType === 'stamp_card' && !block.settings?.secretKey) {
      block.settings = {
        ...block.settings,
        slots: block.settings?.slots ?? 10,
        secretKey: generateSecureKey(),
      };
    }
    return block;
  });

  return {
    ...base,
    profileTitle: payload.profileTitle,
    accentColor: payload.accentColor,
    theme: payload.theme,
    fontStyle: payload.fontStyle,
    profileIcon: (payload.profileIcon as ActionIcon) || base.profileIcon,
    profileLogoUrl: payload.profileLogoUrl || base.profileLogoUrl,
    nfcBlocks: blocks.length ? blocks : base.nfcBlocks,
  };
}

export const MicrositeChat: React.FC<MicrositeChatProps> = ({ config, onApplyConfig, onClose }) => {
  const [session, setSession] = useState<ChatSession>(() => createChatSession());
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState(
    'Einfach antworten oder einen blauen Vorschlag antippen.'
  );
  const [appliedOnce, setAppliedOnce] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const meta = useMemo(() => getStepMeta(session.step), [session.step]);
  const progressPct = Math.round((meta.index / meta.total) * 100);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, busy]);

  useEffect(() => {
    // Fokus auf Eingabe – erleichtert Tastatur-Nutzer
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [session.step]);

  const reset = useCallback(() => {
    setSession(createChatSession());
    setInput('');
    setAppliedOnce(false);
    setStatusLine('Neu gestartet – Schritt 1: Firmenname.');
  }, []);

  const runGuided = useCallback(
    (text: string) => {
      const result = advanceChat(session, text, configRef.current);
      setSession(result.session);
      if (result.config) {
        onApplyConfig(result.config);
        setAppliedOnce(true);
        setStatusLine('Vorschlag ist fertig – schau in die Vorschau (Digital).');
      }
    },
    [session, onApplyConfig]
  );

  const handleSend = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);

    try {
      // Zuerst ChatGPT versuchen (Secret nur serverseitig). Bei Fehler: geführter Modus.
      const history = [
        ...session.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: text },
      ];
      const ai = await sendMicrositeChat(history);

      if (ai && !ai.fallback && ai.message) {
        const nextMessages = [
          ...session.messages,
          { id: crypto.randomUUID(), role: 'user' as const, content: text },
          { id: crypto.randomUUID(), role: 'assistant' as const, content: ai.message },
        ];
        setSession((s) => ({
          ...s,
          step: ai.ready ? 'done' : s.step,
          messages: nextMessages,
        }));
        if (ai.ready && ai.config) {
          const next = applyAiPayload(configRef.current, ai.config);
          if (next) {
            if (ai.config.slogan && next.nfcBlocks[0]?.type === 'headline') {
              next.nfcBlocks = next.nfcBlocks.map((b, i) =>
                i === 0 ? { ...b, title: ai.config!.slogan || b.title } : b
              );
            }
            onApplyConfig(next);
            setAppliedOnce(true);
            setStatusLine('ChatGPT hat einen Vorschlag gebaut – bitte Vorschau prüfen.');
          }
        } else {
          setStatusLine('ChatGPT antwortet – einfach weiterplaudern.');
        }
        return;
      }

      // Fallback: geführte Schritte mit großen Vorschlägen
      if (ai?.fallback) {
        setStatusLine('Assistent im einfachen Modus (ohne Cloud-KI) – funktioniert trotzdem.');
      }
      runGuided(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-navy/50 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full sm:max-w-xl h-[92vh] sm:h-[min(720px,94vh)] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200"
        role="dialog"
        aria-labelledby="microsite-chat-title"
      >
        <header className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-100 bg-cream">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-petrol text-white flex items-center justify-center shrink-0">
                <Sparkles size={22} />
              </div>
              <div className="min-w-0">
                <h2
                  id="microsite-chat-title"
                  className="font-headline font-extrabold text-base sm:text-lg uppercase tracking-tight text-navy"
                >
                  Seite gemeinsam bauen
                </h2>
                <p className="text-sm text-zinc-600 mt-0.5 leading-snug">{statusLine}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={reset}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-white text-zinc-600"
                title="Von vorne"
                aria-label="Von vorne beginnen"
              >
                <RotateCcw size={20} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-white text-zinc-600"
                aria-label="Schließen"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-xs font-semibold text-zinc-500 mb-1.5">
              <span>
                Schritt {meta.index} von {meta.total}: {meta.title}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-200 overflow-hidden" aria-hidden>
              <div
                className="h-full rounded-full bg-petrol transition-all duration-300"
                style={{ width: `${session.step === 'done' ? 100 : progressPct}%` }}
              />
            </div>
            <p className="text-sm text-zinc-600 mt-2 leading-snug">{meta.hint}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
          {session.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-base leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-navy text-white rounded-br-md'
                    : 'bg-zinc-100 text-navy rounded-bl-md'
                }`}
              >
                {m.content.replace(/\*\*(.*?)\*\*/g, '$1')}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Einen Moment bitte…
            </div>
          )}
          {appliedOnce && session.step === 'done' && (
            <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Vorschlag ist übernommen.</p>
                <p className="mt-1 leading-snug">
                  Schließe dieses Fenster. Wechsle oben auf „Microsite“ und „Digital“, um die
                  Vorschau zu sehen und Links einzutragen.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 min-h-[44px] px-4 rounded-xl bg-emerald-700 text-white font-semibold"
                >
                  Fenster schließen &amp; Vorschau ansehen
                </button>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {meta.chips.length > 0 && (
          <div className="shrink-0 px-4 pb-2 flex flex-wrap gap-2 border-t border-zinc-50 pt-3 bg-white">
            {meta.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => void handleSend(chip)}
                className="min-h-[44px] px-4 rounded-full bg-petrol/10 text-petrol text-sm font-semibold hover:bg-petrol/20 disabled:opacity-40 active:scale-[0.98]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <form
          className="shrink-0 p-3 sm:p-4 border-t border-zinc-100 flex gap-2 bg-cream safe-bottom"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={meta.placeholder}
            disabled={busy}
            className="flex-1 min-h-[52px] px-4 rounded-2xl border border-zinc-200 text-base font-medium text-navy bg-white outline-none focus:ring-2 focus:ring-petrol/30 disabled:opacity-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="min-h-[52px] min-w-[52px] px-4 rounded-2xl bg-navy text-white hover:bg-navy/90 disabled:opacity-40 flex items-center justify-center"
            aria-label="Antwort senden"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MicrositeChat;
