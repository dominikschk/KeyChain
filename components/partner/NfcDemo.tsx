/**
 * Kennzeichnete NFC-Demo: Antippen → Beispielseite (Pizzeria).
 * Keine echte NFC-Integration – klar als Demo markiert.
 */
import React, { useState } from 'react';
import { Smartphone, Nfc } from 'lucide-react';

export function NfcDemo() {
  const [opened, setOpened] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">Produktdemo</p>
          <h3 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy">
            Antippen → Seite öffnet sich
          </h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
          Demo
        </span>
      </div>
      <div className="p-4 sm:p-6 grid sm:grid-cols-2 gap-6 items-center">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="relative group focus:outline-none"
            aria-label="Demo: Anhänger antippen"
          >
            <img
              src="/keychain-petrol.png"
              alt="Beispiel NFC-Schlüsselanhänger"
              className="w-40 h-40 object-contain drop-shadow-md transition-transform group-hover:scale-[1.03]"
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-navy text-white text-[10px] font-bold uppercase tracking-wider">
              <Nfc size={12} aria-hidden /> Antippen
            </span>
          </button>
          <p className="text-xs text-zinc-500 text-center max-w-[220px]">
            Tippe auf den Anhänger, um die Beispiel-Handyoberfläche zu öffnen. Kein echtes NFC –
            nur eine Vorschau.
          </p>
        </div>

        <div
          className={`mx-auto w-full max-w-[260px] rounded-[1.75rem] border-4 border-navy/90 bg-zinc-900 shadow-lg overflow-hidden transition-opacity ${
            opened ? 'opacity-100' : 'opacity-70'
          }`}
          aria-live="polite"
        >
          <div className="bg-zinc-800 h-6 flex items-center justify-center">
            <div className="w-16 h-1.5 rounded-full bg-zinc-600" />
          </div>
          <div className="bg-cream min-h-[320px] p-4">
            {!opened ? (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center gap-3 text-zinc-500">
                <Smartphone size={28} className="text-petrol" aria-hidden />
                <p className="text-xs font-medium">Warte auf Demo-Antippen…</p>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">
                  Beispiel · Demo
                </p>
                <h4 className="font-headline font-extrabold text-lg text-navy leading-tight">
                  Pizzeria Bella (Beispiel)
                </h4>
                <p className="text-xs text-zinc-600 leading-snug">
                  Willkommen – hier könnte eure digitale Speisekarte oder ein Tagesangebot stehen.
                </p>
                <ul className="space-y-2 text-sm">
                  {[
                    'Digitale Speisekarte',
                    'Tagesangebot',
                    'Bewertung hinterlassen',
                    'Kontakt / Reservierung',
                  ].map((label) => (
                    <li
                      key={label}
                      className="rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-semibold text-navy text-xs"
                    >
                      {label}
                      <span className="block text-[10px] font-medium text-zinc-500 mt-0.5">
                        Beispielinhalt – nicht live
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setOpened(false)}
                  className="w-full min-h-[40px] rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600"
                >
                  Demo zurücksetzen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
