/**
 * CCP – Customer Control Panel.
 * URL: /ccp?id=SHORT_ID[&t=WRITE_TOKEN]
 * Ohne Token: Microsite-Link + Scan-Statistiken.
 * Mit Token: digitale Microsite bearbeiten (kein 3D/STL).
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Smartphone,
  BarChart3,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Save,
  Pencil,
} from 'lucide-react';
import {
  getConfigByShortId,
  getScanCount,
  getScanCountLast30Days,
  updateConfigProfile,
  replaceConfigBlocks,
  updateLandingTarget,
} from '../lib/configApi';
import { validateProfileTitle, toSafeHttpUrl } from '../lib/validation';
import { showError } from '../lib/utils';
import { Controls } from '../components/Controls';
import { BlockRenderer } from '../components/Microsite';
import type { ModelConfig } from '../types';

function getShortIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || params.get('short_id');
}

/** Write-token nur aus URL; nie speichern. Format: hex, mind. 32 Zeichen. */
function getWriteTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const t = new URLSearchParams(window.location.search).get('t')?.trim() ?? '';
  if (t.length < 32 || !/^[a-f0-9]+$/i.test(t)) return null;
  return t;
}

export const CcpPage: React.FC = () => {
  const shortId = getShortIdFromUrl();
  // Token nur aus URL lesen (Capability); Ref hält denselben Wert für Speichern ohne Re-Persistenz
  const writeTokenRef = useRef<string | null>(getWriteTokenFromUrl());
  const canEdit = !!writeTokenRef.current;

  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [scanTotal, setScanTotal] = useState<number | null>(null);
  const [scan30d, setScan30d] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!shortId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editTab, setEditTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    // Defense-in-Depth: Write-Token in URL nicht per Referer an Drittseiten leaken
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

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
          setConfig(null);
          setConfigId(null);
          return;
        }
        setConfig(result.config);
        setConfigId(result.configId);
      })
      .catch((e) => {
        setError(e?.message ?? 'Fehler beim Laden.');
        setConfig(null);
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

  const copyMicrositeLink = useCallback(() => {
    if (!micrositeUrl) return;
    navigator.clipboard.writeText(micrositeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [micrositeUrl]);

  const handleSave = useCallback(async () => {
    const token = writeTokenRef.current;
    if (!config || !configId || !token) return;

    const isExternal = config.landingMode === 'external';

    if (isExternal) {
      const url = toSafeHttpUrl(config.externalUrl || '');
      if (!url) {
        showError('Bitte eine gültige Adresse eingeben (https://…).', 'Ziel-Link');
        return;
      }
      setSaving(true);
      setSavedOk(false);
      try {
        const result = await updateLandingTarget(configId, token, 'external', url);
        if (!result.ok) {
          showError(
            result.error?.includes('function') || result.error?.includes('schema')
              ? 'Bitte einmal die SQL-Funktion update_nfc_landing_target in Supabase ausführen (siehe supabase-schema.sql).'
              : (result.error ?? 'Speichern fehlgeschlagen.'),
            'Ziel-Link'
          );
          return;
        }
        setConfig((prev) => (prev ? { ...prev, externalUrl: url } : prev));
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2500);
      } finally {
        setSaving(false);
      }
      return;
    }

    const titleCheck = validateProfileTitle(config.profileTitle);
    if (!titleCheck.valid) {
      showError(titleCheck.error!);
      return;
    }
    if (config.nfcBlocks.length > 40) {
      showError('Maximal 40 Module erlaubt.');
      return;
    }

    setSaving(true);
    setSavedOk(false);
    try {
      const profileResult = await updateConfigProfile(configId, token, {
        profileTitle: config.profileTitle.trim(),
        headerImageUrl: config.headerImageUrl ?? null,
        profileLogoUrl: config.profileLogoUrl ?? null,
        accentColor: config.accentColor,
        theme: config.theme,
        fontStyle: config.fontStyle,
      });
      if (!profileResult.ok) {
        showError(profileResult.error ?? 'Speichern fehlgeschlagen.', 'Profil');
        return;
      }

      const blocksResult = await replaceConfigBlocks(
        configId,
        token,
        config.nfcBlocks.map((b) => ({
          type: b.type,
          title: b.title || '',
          content: b.content || '',
          button_type: b.buttonType,
          image_url: b.imageUrl,
          settings: b.settings,
        }))
      );
      if (!blocksResult.ok) {
        showError(blocksResult.error ?? 'Speichern fehlgeschlagen.', 'Module');
        return;
      }

      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [config, configId]);

  const noopUpload = useMemo(() => () => {}, []);

  const isDark = config?.theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col bg-cream text-navy">
      <header className="shrink-0 h-14 flex items-center justify-between px-4 md:px-5 bg-white border-b border-zinc-200/80 gap-2">
        <a href="/" className="flex items-center gap-2 text-zinc-600 hover:text-navy font-semibold text-sm shrink-0">
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Zurück</span>
        </a>
        <span className="font-headline font-extrabold text-sm md:text-lg uppercase tracking-tight text-navy truncate">
          Kunden-Panel
        </span>
        {canEdit && config && !loading && !error ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy/90 disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : savedOk ? <Check size={14} /> : <Save size={14} />}
            {saving ? '…' : savedOk ? 'Gespeichert' : 'Speichern'}
          </button>
        ) : (
          <div className="w-16 shrink-0" />
        )}
      </header>

      <main className={`flex-1 p-4 md:p-6 w-full ${canEdit ? 'max-w-6xl' : 'max-w-2xl'} mx-auto space-y-6`}>
        {!shortId && (
          <section className="card p-5">
            <p className="text-sm text-zinc-600">
              Bitte den Link aus deiner Bestellbestätigung verwenden („Seite bearbeiten“).
              Der normale Link zur Handy-Seite reicht zum Anschauen – zum Ändern brauchst du den privaten Bearbeiten-Link.
            </p>
          </section>
        )}

        {shortId && loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Seite wird geladen…</span>
          </div>
        )}

        {shortId && error && (
          <section className="card p-5">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </section>
        )}

        {shortId && !loading && !error && config && (
          <>
            <section className="card p-5">
              <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2 mb-3">
                <Smartphone size={18} />
                {config.landingMode === 'external' ? 'Mein Chip-Link' : 'Meine Handy-Seite'}
              </h2>
              <p className="text-sm text-zinc-500 mb-4">
                Name: <strong className="text-navy">{config.profileTitle}</strong>
              </p>
              {config.landingMode === 'external' && !!config.externalUrl && (
                <p className="text-sm text-zinc-600 mb-4 leading-snug">
                  Kunden landen auf:{' '}
                  <span className="font-semibold text-navy break-all">{config.externalUrl}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <a
                  href={config.landingMode === 'external' && config.externalUrl ? config.externalUrl : micrositeUrl}
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
                  {copied ? 'Kopiert' : 'NFC-Link kopieren'}
                </button>
              </div>
              {!canEdit && (
                <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
                  Zum Bearbeiten öffne den Button „Seite bearbeiten“ aus deiner Bestellmail.
                  Der normale Handy-Seiten-Link allein reicht nicht.
                </p>
              )}
            </section>

            <section className="card p-5">
              <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2 mb-3">
                <BarChart3 size={18} />
                Chip-Scans
              </h2>
              <p className="text-sm text-zinc-500 mb-4">
                Anzahl Aufrufe über den NFC-Chip.
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

            {canEdit && config.landingMode === 'external' && (
              <section className="card p-5 space-y-3">
                <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2">
                  <Pencil size={18} />
                  Ziel-Adresse ändern
                </h2>
                <p className="text-xs text-zinc-500 leading-snug">
                  Der Chip bleibt gleich – nur wohin er öffnet, änderst du hier.
                </p>
                <input
                  type="url"
                  inputMode="url"
                  value={config.externalUrl || ''}
                  onChange={(e) => setConfig((prev) => (prev ? { ...prev, externalUrl: e.target.value } : prev))}
                  placeholder="https://…"
                  className="w-full p-4 rounded-2xl border border-navy/10 text-sm bg-cream font-medium outline-none focus:border-petrol/40"
                />
              </section>
            )}

            {canEdit && config.landingMode !== 'external' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-headline font-extrabold text-sm uppercase tracking-tight text-navy flex items-center gap-2">
                    <Pencil size={18} />
                    Microsite bearbeiten
                  </h2>
                  <div className="flex rounded-xl border border-zinc-200 overflow-hidden text-xs font-semibold md:hidden">
                    <button
                      type="button"
                      onClick={() => setEditTab('edit')}
                      className={`px-3 py-2 ${editTab === 'edit' ? 'bg-navy text-white' : 'bg-white text-zinc-600'}`}
                    >
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTab('preview')}
                      className={`px-3 py-2 ${editTab === 'preview' ? 'bg-navy text-white' : 'bg-white text-zinc-600'}`}
                    >
                      Vorschau
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Nur digitale Inhalte. Form und STL des physischen Produkts bleiben unverändert.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div className={`${editTab === 'preview' ? 'hidden md:block' : ''} card p-4 max-h-[70vh] overflow-y-auto`}>
                    <Controls
                      activeDept="digital"
                      config={config}
                      setConfig={(updater) => {
                        setConfig((prev) => {
                          if (!prev) return prev;
                          return typeof updater === 'function' ? updater(prev) : updater;
                        });
                      }}
                      hasLogo={false}
                      onUpload={noopUpload}
                    />
                  </div>

                  <div
                    className={`${editTab === 'edit' ? 'hidden md:flex' : 'flex'} justify-center sticky top-4`}
                  >
                    <div className="w-full max-w-[280px] md:max-w-[320px] aspect-[9/18.5] bg-zinc-950 rounded-[2.5rem] border-[8px] border-zinc-900 shadow-xl relative flex flex-col overflow-hidden">
                      <div
                        className={`flex-1 overflow-y-auto px-3 pt-10 pb-6 ${
                          isDark ? 'bg-zinc-950 text-white' : 'bg-cream text-navy'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-white shadow border border-navy/5 overflow-hidden flex items-center justify-center mb-3">
                            {config.profileLogoUrl ? (
                              <img src={config.profileLogoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-400">Logo</span>
                            )}
                          </div>
                          <p className="text-xs font-extrabold uppercase tracking-tight">{config.profileTitle}</p>
                        </div>
                        <div className="space-y-3">
                          {config.nfcBlocks.map((block) => (
                            <BlockRenderer
                              key={block.id}
                              block={block}
                              configId={configId || 'preview'}
                              accentColor={config.accentColor}
                              theme={config.theme}
                            />
                          ))}
                          {config.nfcBlocks.length === 0 && (
                            <p className="text-[10px] text-zinc-500 text-center py-8">Keine Module</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CcpPage;
