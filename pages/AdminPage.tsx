/**
 * Admin – Panel: Alle Bestellungen (nfc_configs) mit Links zu den Microsite-URLs.
 * URL: http://localhost:5173/admin
 */
import React, { useState, useEffect } from 'react';
import { ShoppingCart, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getConfigsList } from '../lib/configApi';
import type { ConfigRow } from '../lib/configApi';

export const AdminPage: React.FC = () => {
  const [list, setList] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase ist nicht konfiguriert.');
      setLoading(false);
      return;
    }
    getConfigsList()
      .then((rows) => {
        setList(rows);
        setError(null);
      })
      .catch((e) => {
        setError(e?.message ?? 'Fehler beim Laden.');
      })
      .finally(() => setLoading(false));
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen flex flex-col bg-cream text-navy">
      <header className="shrink-0 h-14 flex items-center justify-between px-4 md:px-5 bg-white border-b border-zinc-200/80">
        <a href="/" className="flex items-center gap-2 text-zinc-600 hover:text-navy font-semibold text-sm">
          <ArrowLeft size={18} />
          Zurück
        </a>
        <span className="font-headline font-extrabold text-lg uppercase tracking-tight text-navy">Admin – Bestellungen</span>
        <div className="w-20" />
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        <section className="card p-5">
          <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2 mb-4">
            <ShoppingCart size={18} />
            Alle Bestellungen (Supabase)
          </h2>
          <p className="text-sm text-zinc-600 mb-4">
            Alle gespeicherten Konfigurationen mit Link zur jeweiligen Microsite-URL.
          </p>

          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Lade Bestellungen…</span>
            </div>
          )}

          {error && (
            <p className="py-4 text-sm text-red-600 font-medium">{error}</p>
          )}

          {!loading && !error && (
            <div className="rounded-xl border border-zinc-200/80 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200/80">
                    <th className="px-4 py-3 font-extrabold uppercase tracking-tight text-navy text-[10px]">short_id</th>
                    <th className="px-4 py-3 font-extrabold uppercase tracking-tight text-navy text-[10px]">Profil</th>
                    <th className="px-4 py-3 font-extrabold uppercase tracking-tight text-navy text-[10px]">Microsite-URL</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr className="border-b border-zinc-100">
                      <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 text-sm">
                        Noch keine Bestellungen in Supabase.
                      </td>
                    </tr>
                  ) : (
                    list.map((row) => (
                      <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-navy">{row.short_id}</td>
                        <td className="px-4 py-3 font-semibold text-navy truncate max-w-[180px]">{row.profile_title}</td>
                        <td className="px-4 py-3">
                          <a
                            href={`${baseUrl}/?id=${encodeURIComponent(row.short_id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-petrol hover:underline font-medium text-xs"
                          >
                            <ExternalLink size={14} />
                            Microsite öffnen
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
