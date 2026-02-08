/**
 * CCP – Customer Control Panel.
 * URL: /ccp?id=SHORT_ID (oder ?short_id=SHORT_ID)
 * Kunden nach Bestellung: Microsite-Link, Statistiken Chip-Scans.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, BarChart3, ArrowLeft, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { getConfigByShortId, getScanCount, getScanCountLast30Days } from '../lib/configApi';

function getShortIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || params.get('short_id');
}

export const CcpPage: React.FC = () => {
  const shortId = getShortIdFromUrl();
  const [profileTitle, setProfileTitle] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [scanTotal, setScanTotal] = useState<number | null>(null);
  const [scan30d, setScan30d] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!shortId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shortId) {
      setLoading(false);
      return;
    }
    setError(null);
    getConfigByShortId(shortId)
      .then((result) => {
        if (!result) {
          setError('Konfiguration nicht gefunden.');
          setProfileTitle(null);
          setConfigId(null);
          return;
        }
        setProfileTitle(result.config.profileTitle);
        setConfigId(result.configId);
      })
      .catch((e) => {
        setError(e?.message ?? 'Fehler beim Laden.');
        setProfileTitle(null);
        setConfigId(null);
      })
      .finally(() => setLoading(false));
  }, [shortId]);

  useEffect(() => {
    if (!configId) {
      setScanTotal(null);
      setScan30d(null);
      return;
    }
    getScanCount(configId).then(setScanTotal);
    getScanCountLast30Days(configId).then(setScan30d);
  }, [configId]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const micrositeUrl = shortId ? `${baseUrl}/?id=${encodeURIComponent(shortId)}` : '';
  const [copied, setCopied] = useState(false);
  const copyMicrositeLink = useCallback(() => {
    if (!micrositeUrl) return;
    navigator.clipboard.writeText(micrositeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [micrositeUrl]);

  return (
    <div className="min-h-screen flex flex-col bg-cream text-navy">
      <header className="shrink-0 h-14 flex items-center justify-between px-4 md:px-5 bg-white border-b border-zinc-200/80">
        <a href="/" className="flex items-center gap-2 text-zinc-600 hover:text-navy font-semibold text-sm">
          <ArrowLeft size={18} />
          Zurück
        </a>
        <span className="font-headline font-extrabold text-lg uppercase tracking-tight text-navy">Kunden-Panel (CCP)</span>
        <div className="w-20" />
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        {!shortId && (
          <section className="card p-5">
            <p className="text-sm text-zinc-600">
              Bitte den Link aus deiner Bestellbestätigung verwenden, z. B.:{' '}
              <strong className="text-navy">http://localhost:5173/ccp?id=DEIN_SHORT_ID</strong>
            </p>
          </section>
        )}

        {shortId && loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Lade dein Profil…</span>
          </div>
        )}

        {shortId && error && (
          <section className="card p-5">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </section>
        )}

        {shortId && !loading && !error && profileTitle && (
          <>
            <section className="card p-5">
              <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2 mb-3">
                <Smartphone size={18} />
                Meine Microsite
              </h2>
              <p className="text-sm text-zinc-500 mb-4">
                Profil: <strong className="text-navy">{profileTitle}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={micrositeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 active:scale-[0.98]"
                >
                  <ExternalLink size={16} />
                  Öffnen
                </a>
                <button
                  type="button"
                  onClick={copyMicrositeLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Kopiert' : 'Link kopieren'}
                </button>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2 mb-3">
                <BarChart3 size={18} />
                Chip-Scans
              </h2>
              <p className="text-sm text-zinc-500 mb-4">
                Anzahl Aufrufe deiner Microsite (NFC-Scans).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
                  <p className="text-2xl font-extrabold text-navy">{scanTotal ?? '—'}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Gesamt</p>
                </div>
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
                  <p className="text-2xl font-extrabold text-navy">{scan30d ?? '—'}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Letzte 30 Tage</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default CcpPage;
