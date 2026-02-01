import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GOOGLE_CLIENT_ID, signInWithGoogleIdToken, signInAsGuest } from '../lib/auth';
import { showError } from '../lib/utils';

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 5000;

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [buttonReady, setButtonReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const el = googleButtonRef.current;
    if (!el) return;

    let intervalId: ReturnType<typeof setInterval>;
    let timeoutId: ReturnType<typeof setTimeout>;

    const initGoogleButton = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.id) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            setLoading(true);
            const { error } = await signInWithGoogleIdToken(response.credential);
            setLoading(false);
            if (error) {
              showError(
                error.message,
                'Anmeldung fehlgeschlagen'
              );
            }
          },
        });
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          width: 280,
        });
        setButtonReady(true);
        return true;
      } catch {
        return false;
      }
    };

    const stopWaiting = () => {
      clearInterval(intervalId);
      setLoadFailed(true);
    };

    if (initGoogleButton()) return;

    intervalId = setInterval(() => {
      if (initGoogleButton()) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      }
    }, 200);

    if (typeof window !== 'undefined' && !document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`)) {
      const script = document.createElement('script');
      script.src = GSI_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    timeoutId = setTimeout(stopWaiting, LOAD_TIMEOUT_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 safe-bottom pb-safe">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy flex items-center justify-center mb-6">
          <span className="font-headline text-2xl font-extrabold text-white">N</span>
        </div>
        <h1 className="font-headline text-2xl font-extrabold uppercase tracking-tight text-navy mb-2">
          NUDAIM Studio
        </h1>
        <p className="text-sm text-zinc-500 mb-8 max-w-[260px]">
          Melde dich an, um deine Konfigurationen zu speichern und fortzusetzen.
        </p>

        {loading ? (
          <div className="w-full max-w-[280px] min-h-[52px] flex items-center justify-center rounded-xl border border-zinc-200 bg-white">
            <Loader2 size={22} className="animate-spin text-navy" />
          </div>
        ) : !GOOGLE_CLIENT_ID ? (
          <p className="text-sm text-amber-600 max-w-[280px]">
            Google-Anmeldung ist nicht konfiguriert. Bitte <code className="text-xs bg-zinc-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-xs bg-zinc-100 px-1 rounded">.env.local</code> im Projektroot setzen und Dev-Server neu starten.
          </p>
        ) : loadFailed ? (
          <div className="w-full max-w-[280px] flex flex-col items-center gap-3">
            <p className="text-sm text-zinc-600">
              Der Google-Button konnte nicht geladen werden.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] px-6 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 active:scale-[0.98]"
            >
              Seite neu laden
            </button>
            <p className="text-[11px] text-zinc-400">
              Werbeblocker oder Erweiterungen für diese Seite prüfen.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[280px] min-h-[52px] flex flex-col items-center justify-center gap-2">
            <div ref={googleButtonRef} className="flex justify-center min-h-[48px]" />
            {!buttonReady && (
              <p className="text-[11px] text-zinc-400">Google-Button wird geladen…</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={signInAsGuest}
          className="mt-4 text-sm text-zinc-500 hover:text-navy underline underline-offset-2 transition-colors"
        >
          Ohne Anmeldung fortfahren
        </button>

        <p className="text-[11px] text-zinc-400 mt-8">
          Mit der Anmeldung akzeptierst du die Nutzungsbedingungen.
        </p>
      </div>
    </div>
  );
};
