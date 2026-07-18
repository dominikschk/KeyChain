/**
 * Microsite-Assistent – eingebettet im gleichen Fenster (panel) oder als Overlay (modal).
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Send, Loader2, X, RotateCcw, CheckCircle2, Wrench, ImagePlus } from 'lucide-react';
import type { ModelConfig } from '../types';
import {
  advanceChat,
  createChatSession,
  getStepMeta,
  type ChatSession,
} from '../lib/micrositeChatEngine';
import { showError, resetFileInput } from '../lib/utils';
import { SITE_TEMPLATES } from '../lib/siteLayouts';
import { supabase } from '../lib/supabase';
import { uploadAndGetPublicUrl, storagePath } from '../lib/storage';
import { validateImageFile } from '../lib/validation';

interface MicrositeChatProps {
  config: ModelConfig;
  onApplyConfig: (next: ModelConfig) => void;
  onClose?: () => void;
  /** Nach dem Assistenten: manuellen Baustein-Editor öffnen */
  onContinueManual?: () => void;
  /** Zur Hardware-Phase (Schlüsselanhänger) */
  onContinueToHardware?: () => void;
  /** Direkt bestellen (nach Chip-Link) */
  onContinueToOrder?: () => void;
  /** panel = im Layout eingebettet; modal = Vollbild-Overlay */
  variant?: 'panel' | 'modal';
}

export const MicrositeChat: React.FC<MicrositeChatProps> = ({
  config,
  onApplyConfig,
  onClose,
  onContinueManual,
  onContinueToHardware,
  onContinueToOrder,
  variant = 'panel',
}) => {
  const [session, setSession] = useState<ChatSession>(() => createChatSession());
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState(
    'Rechts siehst du, was deine Kunden später sehen.'
  );
  const [appliedOnce, setAppliedOnce] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const meta = useMemo(() => getStepMeta(session.step), [session.step]);
  const progressPct = Math.round((meta.index / meta.total) * 100);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, busy]);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [session.step]);

  const reset = useCallback(() => {
    setSession(createChatSession());
    setInput('');
    setAppliedOnce(false);
    setStatusLine('Von vorne – zuerst dein Firmenname.');
  }, []);

  const runGuided = useCallback(
    (text: string) => {
      const result = advanceChat(session, text, configRef.current);
      setSession(result.session);
      if (result.config) {
        onApplyConfig(result.config);
        setAppliedOnce(true);
        setStatusLine('Erste Version fertig – rechts prüfen.');
      }
    },
    [session, onApplyConfig]
  );

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!supabase) {
        showError('Bitte später erneut versuchen.', 'Upload gerade nicht möglich.');
        resetFileInput(e.target);
        return;
      }
      const check = validateImageFile(file);
      if (!check.valid) {
        showError(check.error!);
        resetFileInput(e.target);
        return;
      }
      setUploadingLogo(true);
      setBusy(true);
      setStatusLine('Logo wird hochgeladen…');
      try {
        const path = storagePath('l_', file.name);
        const url = await uploadAndGetPublicUrl(supabase, path, file);
        if (!url) {
          showError('Bitte versuche es erneut.', 'Logo konnte nicht hochgeladen werden.');
          setStatusLine('Logo-Upload fehlgeschlagen – erneut versuchen oder „Später“.');
          return;
        }
        onApplyConfig({ ...configRef.current, profileLogoUrl: url });
        setStatusLine('Logo ist drauf – weiter geht’s.');
        runGuided(url);
      } catch (err) {
        console.error(err);
        showError('Bitte versuche es erneut.', 'Logo konnte nicht hochgeladen werden.');
      } finally {
        setUploadingLogo(false);
        setBusy(false);
        resetFileInput(e.target);
      }
    },
    [onApplyConfig, runGuided]
  );

  const handleSend = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    try {
      // Instant: geführter Flow lokal – kein Warten auf Cloud-KI
      runGuided(text);
    } finally {
      setBusy(false);
    }
  };

  const handleChip = (chip: string) => {
    if (busy) return;
    setBusy(true);
    try {
      runGuided(chip);
    } finally {
      setBusy(false);
    }
  };

  const shellClass =
    variant === 'modal'
      ? 'fixed inset-0 z-[4000] flex items-end sm:items-center justify-center bg-navy/50 backdrop-blur-sm p-0 sm:p-4'
      : 'h-full flex flex-col min-h-0';

  const cardClass =
    variant === 'modal'
      ? 'w-full sm:max-w-xl h-[92vh] sm:h-[min(720px,94vh)] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200'
      : 'h-full bg-white flex flex-col overflow-hidden min-h-0';

  const inner = (
    <div className={cardClass} role="dialog" aria-labelledby="microsite-chat-title">
      <header className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-100 bg-cream">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-petrol text-white flex items-center justify-center shrink-0">
              <Sparkles size={22} />
            </div>
            <div className="min-w-0">
              <h2
                id="microsite-chat-title"
                className="font-headline font-extrabold text-base uppercase tracking-tight text-navy"
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
            {variant === 'modal' && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-white text-zinc-600"
                aria-label="Schließen"
              >
                <X size={22} />
              </button>
            )}
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white min-h-0">
        {!appliedOnce && session.messages.length <= 2 && (
          <div className="rounded-2xl border border-zinc-100 bg-cream/80 px-3 py-3 space-y-2">
            <p className="text-xs font-semibold text-zinc-600 px-1">Oder fertige Vorlage wählen</p>
            <div className="flex flex-wrap gap-2">
              {SITE_TEMPLATES.slice(0, 4).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    onApplyConfig({ ...configRef.current, ...tpl.apply() });
                    setAppliedOnce(true);
                    setStatusLine(`Vorlage „${tpl.name}“ geladen – rechts prüfen.`);
                    setSession((s) => ({
                      ...s,
                      step: 'done',
                      messages: [
                        ...s.messages,
                        {
                          id: crypto.randomUUID(),
                          role: 'assistant',
                          content: `Die Vorlage „${tpl.name}“ ist geladen. Ändere einfach den Firmennamen und die Links – so sieht es schon wie dein Geschäft aus.`,
                        },
                      ],
                    }));
                  }}
                  className="min-h-[40px] px-3 rounded-full bg-white border border-zinc-200 text-sm font-medium text-navy hover:border-petrol/40"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}
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
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-900 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sieht schon gut aus.</p>
                <p className="mt-1 leading-snug">
                  Rechts siehst du, was deine Kunden sehen. Du kannst Texte und Links noch anpassen – oder gleich zum Anhänger weitergehen.
                </p>
              </div>
            </div>
            {onContinueToOrder && (
              <button
                type="button"
                onClick={onContinueToOrder}
                className="w-full min-h-[48px] px-4 rounded-xl bg-navy text-white font-semibold flex items-center justify-center gap-2"
              >
                Passt – bestellen
              </button>
            )}
            {!onContinueToOrder && onContinueToHardware && (
              <button
                type="button"
                onClick={onContinueToHardware}
                className="w-full min-h-[48px] px-4 rounded-xl bg-navy text-white font-semibold flex items-center justify-center gap-2"
              >
                Passt – weiter zum Anhänger →
              </button>
            )}
            {onContinueManual && (
              <button
                type="button"
                onClick={onContinueManual}
                className="w-full min-h-[48px] px-4 rounded-xl border-2 border-navy text-navy font-semibold flex items-center justify-center gap-2"
              >
                <Wrench size={18} />
                Texte & Links anpassen
              </button>
            )}
            {onContinueToOrder && onContinueToHardware && (
              <button
                type="button"
                onClick={onContinueToHardware}
                className="w-full min-h-[44px] px-4 rounded-xl border border-zinc-200 text-navy font-semibold text-sm"
              >
                ← Zurück zum Anhänger
              </button>
            )}
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
              onClick={() => handleChip(chip)}
              className="min-h-[44px] px-4 rounded-full bg-petrol/10 text-petrol text-sm font-semibold hover:bg-petrol/20 disabled:opacity-40 active:scale-[0.98]"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {session.step === 'logo' && (
        <div className="shrink-0 px-4 pb-3 bg-white border-t border-zinc-50">
          <input
            ref={logoFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleLogoUpload(e)}
          />
          <button
            type="button"
            disabled={busy || uploadingLogo}
            onClick={() => logoFileRef.current?.click()}
            className="w-full min-h-[52px] px-4 rounded-2xl bg-petrol text-white font-semibold flex items-center justify-center gap-2 hover:bg-petrol/90 disabled:opacity-50 active:scale-[0.98]"
          >
            {uploadingLogo ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Wird hochgeladen…
              </>
            ) : (
              <>
                <ImagePlus size={20} />
                Logo hochladen
              </>
            )}
          </button>
          <p className="text-xs text-zinc-500 text-center mt-2">PNG, JPG oder WebP – wird sofort in der Vorschau sichtbar.</p>
        </div>
      )}

      <form
        className="shrink-0 p-3 border-t border-zinc-100 flex gap-2 bg-cream"
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
          className="flex-1 min-h-[48px] px-4 rounded-2xl border border-zinc-200 text-base font-medium text-navy bg-white outline-none focus:ring-2 focus:ring-petrol/30 disabled:opacity-50"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="min-h-[48px] min-w-[48px] px-4 rounded-2xl bg-navy text-white hover:bg-navy/90 disabled:opacity-40 flex items-center justify-center"
          aria-label="Antwort senden"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );

  if (variant === 'modal') {
    return <div className={shellClass}>{inner}</div>;
  }
  return <div className={shellClass}>{inner}</div>;
};

export default MicrositeChat;
