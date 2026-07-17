/**
 * Konfigurator – Panel zum Konfigurieren von NFeC-Produkten (3D + Microsite).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, QrCode as QrIcon, X, ArrowRight, RefreshCw, Edit3, Smartphone, ShoppingCart, Download, Upload, RotateCcw, ExternalLink, Check, LogOut, User, ChevronDown } from 'lucide-react';
import { Viewer } from '../components/Viewer';
import { Controls } from '../components/Controls';
import { Microsite } from '../components/Microsite';
import { MicrositeChat } from '../components/MicrositeChat';
import { LoginScreen } from '../components/LoginScreen';
import { DEFAULT_CONFIG, buildShopifyCartUrl, PRODUCTS } from '../constants';
import { ModelConfig, SVGPathData, Department } from '../types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import * as THREE from 'three';
import { supabase, getDetailedError } from '../lib/supabase';
import { generateShortId, generateWriteToken, showError, resetFileInput } from '../lib/utils';
import { validateSvgFile, validateProfileTitle } from '../lib/validation';
import { uploadAndGetPublicUrl, storagePath } from '../lib/storage';
import { getSession, onAuthStateChange, signOut } from '../lib/auth';
import type { AuthSession } from '../lib/auth';
import {
  saveDraft,
  loadDraft,
  loadDraftSvg,
  clearDraft,
  getDefaultConfig,
  exportConfigToJson,
  importConfigFromJson,
  downloadJson,
  setPreviewConfig,
  getPreviewConfig,
} from '../lib/configStorage';
import { getConfigByShortId, recordScan, setConfigStlUrl, insertConfigBlocks } from '../lib/configApi';

const ConfirmationModal: React.FC<{
  config: ModelConfig;
  onConfirm: () => void;
  onCancel: () => void;
  screenshot: string | null;
}> = ({ onConfirm, onCancel, screenshot, config }) => (
  <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy/80 backdrop-blur-md">
    <div className="card w-full max-w-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-300">
      <header className="flex items-center justify-between shrink-0 px-4 py-3 sm:px-5 sm:py-4 border-b border-navy/5">
        <h2 className="font-headline text-base sm:text-lg font-extrabold uppercase tracking-tight text-navy">Konfiguration bestätigen</h2>
        <button type="button" onClick={onCancel} className="btn-tap flex items-center justify-center rounded-xl text-zinc-400 hover:bg-cream hover:text-navy transition-colors" aria-label="Schließen"><X size={22} /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-container min-h-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="aspect-square bg-cream rounded-xl sm:rounded-2xl flex items-center justify-center p-3 border border-navy/5 overflow-hidden">
            {screenshot ? <img src={screenshot} className="w-full h-full object-contain" alt="Hardware Preview" /> : <Loader2 className="animate-spin text-petrol/30" size={28} />}
          </div>
          <div className="aspect-square bg-navy rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-white text-center">
            <QrIcon size={28} className="opacity-30 mb-2 sm:mb-3" />
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate w-full px-1">{config.profileTitle}</p>
            <p className="text-[7px] sm:text-[8px] uppercase tracking-widest mt-1 opacity-60">Digital aktiv</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed text-center px-2">
          Dein Unikat wird mit dem gewählten Branding produziert. Das digitale Profil kannst du jederzeit anpassen.
        </p>
      </div>
      <footer className="p-4 sm:p-5 border-t border-navy/5 bg-zinc-50/80 shrink-0 safe-bottom">
        <button type="button" onClick={onConfirm} className="w-full min-h-[48px] sm:h-12 bg-navy text-white rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <span>Jetzt bestellen</span>
          <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  </div>
);

const ConfiguratorPage: React.FC = () => {
  const [viewMode] = useState<'editor' | 'microsite' | 'preview'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === '1') return 'preview';
    return params.get('id') ? 'microsite' : 'editor';
  });

  const [session, setSession] = useState<AuthSession>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  /** Assistent zuerst im gleichen Fenster; danach optional manueller Editor */
  const [digitalMode, setDigitalMode] = useState<'assist' | 'manual'>('assist');
  /** Zwei getrennte Arbeitsphasen: erst Seite, dann Anhänger */
  const [workPhase, setWorkPhase] = useState<'site' | 'hardware'>('site');

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setAuthReady(true);
    });
    const unsub = onAuthStateChange((s) => setSession(s));
    return unsub;
  }, []);

  const [previewConfig] = useState<ModelConfig | null>(() =>
    viewMode === 'preview' ? getPreviewConfig() : null
  );

  const [micrositeConfig, setMicrositeConfig] = useState<ModelConfig | null>(null);
  const [micrositeLoading, setMicrositeLoading] = useState(viewMode === 'microsite');
  const [micrositeError, setMicrositeError] = useState<string | null>(null);

  useEffect(() => {
    if (viewMode !== 'microsite') return;
    const params = new URLSearchParams(window.location.search);
    const shortId = params.get('id');
    if (!shortId) {
      setMicrositeLoading(false);
      setMicrositeError('Keine short_id in der URL (?id=…).');
      return;
    }
    setMicrositeError(null);
    getConfigByShortId(shortId)
      .then((result) => {
        if (result) {
          setMicrositeConfig(result.config);
          recordScan(result.configId).catch(() => { /* einmal pro Aufruf; Fehler still */ });
        } else setMicrositeError('Konfiguration nicht gefunden.');
      })
      .catch((e) => setMicrositeError(e?.message ?? 'Fehler beim Laden.'))
      .finally(() => setMicrositeLoading(false));
  }, [viewMode]);

  const [config, setConfig] = useState<ModelConfig>(() => {
    const draft = loadDraft();
    return draft ?? JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  });
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(() => loadDraftSvg());
  const [selectedProductId, setSelectedProductId] = useState<string>(() => PRODUCTS[0]?.id ?? 'keychain');
  const [activeDept, setActiveDept] = useState<Department>('digital');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [previewType, setPreviewType] = useState<'3d' | 'digital'>('digital');
  const [savingStep, setSavingStep] = useState('idle');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const draftSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const viewerRef = useRef<{ takeScreenshot: () => Promise<string>; exportSTL: () => Promise<Blob | null> }>(null);

  useEffect(() => {
    if (workPhase === 'hardware') {
      setActiveDept('3d');
      setPreviewType('3d');
    } else {
      setActiveDept('digital');
      setPreviewType('digital');
    }
  }, [workPhase]);

  useEffect(() => {
    if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    draftSaveRef.current = setTimeout(() => {
      saveDraft(config, svgContent);
      draftSaveRef.current = null;
    }, 1500);
    return () => { if (draftSaveRef.current) clearTimeout(draftSaveRef.current); };
  }, [config, svgContent]);

  // Beim Produktwechsel Plattenmaße aus Produkt übernehmen (z. B. Messe-Badge 110×150 mm)
  useEffect(() => {
    const product = PRODUCTS.find((p) => p.id === selectedProductId);
    if (product?.plateWidthMm != null && product?.plateHeightMm != null) {
      const w = product.plateWidthMm;
      const h = product.plateHeightMm;
      setConfig((prev) => ({
        ...prev,
        plateWidth: w,
        plateHeight: h,
      }));
    }
  }, [selectedProductId]);

  const handleResetConfig = useCallback(() => {
    if (!window.confirm('Konfiguration auf Standard zurücksetzen? Der aktuelle Entwurf geht verloren.')) return;
    setConfig(getDefaultConfig());
    setSvgElements(null);
    setSvgContent(null);
    clearDraft();
  }, []);

  const handleExportConfig = useCallback(() => {
    const json = exportConfigToJson(config);
    const name = `nudaim-config-${config.profileTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    downloadJson(name, json);
    setToastMessage('Export erfolgreich');
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => { setToastMessage(null); toastRef.current = null; }, 2500);
  }, [config]);

  const handlePreviewInNewTab = useCallback(() => {
    setPreviewConfig(config);
    const url = `${window.location.origin}${window.location.pathname}?preview=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [config]);

  const handleImportConfig = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importConfigFromJson(reader.result as string);
      if (result.success) setConfig(result.config);
      else showError(result.error, 'Import fehlgeschlagen');
    };
    reader.onerror = () => showError('Datei konnte nicht gelesen werden.', 'Import fehlgeschlagen');
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const initiateSave = useCallback(async () => {
    try {
      const screenshot = await viewerRef.current?.takeScreenshot();
      setCurrentScreenshot(screenshot || null);
      setShowConfirmation(true);
    } catch (err) {
      console.error('Screenshot error:', err);
      showError('Bitte versuche es erneut.', 'Fehler beim Erstellen des Screenshots.');
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowConfirmation(false);
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); initiateSave(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [initiateSave]);

  const executeSave = async () => {
    if (!supabase) {
      showError('Bitte prüfe deine Umgebungsvariablen.', 'Supabase ist nicht konfiguriert.');
      return;
    }
    const titleCheck = validateProfileTitle(config.profileTitle);
    if (!titleCheck.valid) {
      showError(titleCheck.error!);
      setShowConfirmation(false);
      return;
    }
    setShowConfirmation(false);
    setSavingStep('screenshot');
    const shortId = generateShortId();
    const writeToken = generateWriteToken();
    try {
      let finalImageUrl = '';
      if (currentScreenshot) {
        setSavingStep('upload');
        const res = await fetch(currentScreenshot);
        if (!res.ok) throw new Error('Screenshot konnte nicht geladen werden');
        const blob = await res.blob();
        const path = storagePath(`preview_${shortId}_`, 'shot.png');
        const url = await uploadAndGetPublicUrl(supabase, path, blob);
        if (!url) throw new Error('Upload fehlgeschlagen');
        finalImageUrl = url;
      }
      setSavingStep('db');
      const product = PRODUCTS.find((p) => p.id === selectedProductId) ?? PRODUCTS[0];
      // Client-UUID: INSERT ohne SELECT-Policy (RLS erlaubt anon kein SELECT)
      const configId = crypto.randomUUID();
      const { error: dbError } = await supabase.from('nfc_configs').insert([{
        id: configId,
        short_id: shortId,
        write_token: writeToken,
        preview_image: finalImageUrl,
        profile_title: config.profileTitle.trim(),
        header_image_url: config.headerImageUrl,
        profile_logo_url: config.profileLogoUrl,
        accent_color: config.accentColor,
        theme: config.theme,
        font_style: config.fontStyle,
        product_type: product?.id ?? null,
        plate_data: {
          baseType: config.baseType,
          plateWidth: config.plateWidth,
          plateHeight: config.plateHeight,
          plateDepth: config.plateDepth,
          logoScale: config.logoScale,
          logoColor: config.logoColor,
          logoDepth: config.logoDepth,
          logoPosX: config.logoPosX,
          logoPosY: config.logoPosY,
          logoRotation: config.logoRotation,
          logo_svg: svgContent || null,
          surfaceColor: config.surfaceColor || null,
        }
      }]);
      if (dbError) throw dbError;
      if (config.nfcBlocks.length > 0) {
        const ok = await insertConfigBlocks(
          configId,
          writeToken,
          config.nfcBlocks.map((b) => ({
            type: b.type,
            title: b.title || '',
            content: b.content || '',
            button_type: b.buttonType,
            image_url: b.imageUrl,
            settings: b.settings,
          }))
        );
        if (!ok) throw new Error('Blöcke konnten nicht gespeichert werden');
      }
      if (viewerRef.current?.exportSTL) {
        try {
          const stlBlob = await viewerRef.current.exportSTL();
          if (stlBlob) {
            const stlPath = storagePath(`stl/${shortId}_`, 'model.stl');
            const stlUrl = await uploadAndGetPublicUrl(supabase, stlPath, stlBlob);
            if (stlUrl) {
              await setConfigStlUrl(configId, stlUrl, writeToken);
            }
          }
        } catch (e) {
          console.warn('STL export/upload failed:', e);
        }
      }
      setSavingStep('done');
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const variantId = product?.variantId ?? '56564338262361';
      window.location.href = buildShopifyCartUrl(variantId, shortId, finalImageUrl, baseUrl, writeToken);
    } catch (err) {
      console.error('Save error:', err);
      setSavingStep('idle');
      const errorDetails = getDetailedError(err);
      showError(errorDetails.msg, errorDetails.title);
    }
  };

  const parseSvgContent = useCallback((content: string, autoScaleLogo = true): { elements: SVGPathData[]; scale: number } | null => {
    try {
      if (!content?.trim()) return null;
      const loader = new SVGLoader();
      const svgData = loader.parse(content);
      if (!svgData.paths?.length) return null;
      const elements = svgData.paths.map((path, i) => ({
        id: `path-${i}`,
        shapes: SVGLoader.createShapes(path),
        color: path.color.getStyle(),
        currentColor: path.color.getStyle(),
        name: `Teil ${i + 1}`,
      }));
      const box = new THREE.Box3();
      elements.forEach((el) => {
        el.shapes.forEach((shape) => {
          shape.getPoints().forEach((p) =>
            box.expandByPoint(new THREE.Vector3(p.x, -p.y, 0))
          );
        });
      });
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.x === 0 && size.y === 0) return null;
      const targetSize = 38;
      const scale = autoScaleLogo ? parseFloat((targetSize / Math.max(size.x, size.y)).toFixed(3)) : 1;
      return { elements, scale };
    } catch (err) {
      console.error('SVG parsing error:', err);
      return null;
    }
  }, []);

  // SVG aus Draft beim Initialisieren wiederherstellen
  useEffect(() => {
    if (svgContent && !svgElements) {
      const parsed = parseSvgContent(svgContent, false);
      if (parsed) {
        setSvgElements(parsed.elements);
      }
    }
  }, [svgContent, svgElements, parseSvgContent]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileCheck = validateSvgFile(file);
    if (!fileCheck.valid) {
      showError(fileCheck.error!);
      resetFileInput(e.target);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      showError('Bitte versuche es erneut.', 'Fehler beim Lesen der Datei.');
      resetFileInput(e.target);
    };
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        if (!content?.trim()) {
          showError('Die SVG-Datei ist leer.');
          resetFileInput(e.target);
          return;
        }
        const parsed = parseSvgContent(content);
        if (!parsed) {
          showError('Bitte verwende eine gültige SVG-Datei.', 'Die SVG-Datei konnte nicht verarbeitet werden.');
          resetFileInput(e.target);
          return;
        }
        setSvgElements(parsed.elements);
        setSvgContent(content);
        setConfig((prev) => ({
          ...prev,
          logoScale: parsed.scale,
          logoPosX: 0,
          logoPosY: 0,
        }));
      } catch (err) {
        console.error('SVG upload error:', err);
        showError('Bitte stelle sicher, dass es sich um eine gültige SVG-Datei handelt.', 'Fehler beim Verarbeiten der SVG-Datei.');
        resetFileInput(e.target);
      }
    };
    reader.readAsText(file);
  };

  if (viewMode === 'microsite') {
    if (micrositeLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-cream text-navy">
          <Loader2 className="animate-spin text-petrol" size={32} />
          <span className="text-sm font-medium text-zinc-600">Microsite wird geladen…</span>
        </div>
      );
    }
    if (micrositeError || !micrositeConfig) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 bg-cream text-navy">
          <p className="text-sm font-medium text-red-600 text-center">{micrositeError ?? 'Konfiguration nicht gefunden.'}</p>
          <a href="/" className="text-sm font-semibold text-petrol hover:underline">Zur Startseite</a>
        </div>
      );
    }
    return <Microsite config={micrositeConfig} googleLogoUrl={session?.user?.user_metadata?.avatar_url} />;
  }
  if (viewMode === 'preview') {
    const displayConfig = previewConfig ?? JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    return <Microsite config={displayConfig} googleLogoUrl={session?.user?.user_metadata?.avatar_url} />;
  }

  if (viewMode === 'editor') {
    if (!authReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream">
          <Loader2 className="animate-spin text-petrol" size={32} />
        </div>
      );
    }
    if (!session) {
      return <LoginScreen />;
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-cream text-navy overflow-hidden">
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[3000] flex items-center justify-center gap-2 px-4 py-3 bg-petrol text-white rounded-xl shadow-lg text-[11px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-2 max-w-xs sm:max-w-none">
          <Check size={18} />
          {toastMessage}
        </div>
      )}
      {showConfirmation && (
        <ConfirmationModal config={config} onConfirm={executeSave} onCancel={() => setShowConfirmation(false)} screenshot={currentScreenshot} />
      )}

      <header className="shrink-0 bg-white border-b border-zinc-200/80 z-30">
        <div className="h-14 flex items-center justify-between px-4 md:px-5 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-headline font-extrabold text-lg uppercase tracking-tight text-navy truncate">NUDAIM</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {workPhase === 'hardware' && (
              <button
                type="button"
                onClick={initiateSave}
                className="hidden md:flex items-center gap-2 h-9 px-4 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy/90 active:scale-[0.98]"
              >
                <ShoppingCart size={14} />
                Bestellen
              </button>
            )}
            <div className="relative">
              <button type="button" onClick={() => setUserMenuOpen((o) => !o)} className="flex items-center gap-2 h-9 pl-2 pr-2 md:pl-3 md:pr-3 rounded-lg hover:bg-zinc-100 transition-colors" aria-expanded={userMenuOpen} aria-haspopup="true">
                <div className="w-8 h-8 rounded-full bg-petrol/20 flex items-center justify-center">
                  {session?.user?.user_metadata?.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <User size={16} className="text-petrol" />
                  )}
                </div>
                <ChevronDown size={14} className="text-zinc-400 hidden md:block" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" aria-hidden onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 py-1 bg-white rounded-xl border border-zinc-200 shadow-lg z-50">
                    <div className="px-3 py-2 border-b border-zinc-100">
                      <p className="text-xs font-semibold text-navy truncate">{session?.user?.id === 'guest' ? 'Gast' : (session?.user?.email ?? 'Angemeldet')}</p>
                    </div>
                    <a href="/ccp" className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"><Smartphone size={14} /> Kunden-Panel</a>
                    <button type="button" onClick={() => { handleExportConfig(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"><Download size={14} /> Export</button>
                    <label className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer"><Upload size={14} /> Import<input type="file" accept=".json,application/json" onChange={(e) => { handleImportConfig(e); setUserMenuOpen(false); }} className="hidden" /></label>
                    <button type="button" onClick={() => { handlePreviewInNewTab(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"><ExternalLink size={14} /> Vorschau (Tab)</button>
                    <button type="button" onClick={() => { handleResetConfig(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"><RotateCcw size={14} /> Zurücksetzen</button>
                    <div className="border-t border-zinc-100 mt-1 pt-1">
                      <button type="button" onClick={() => { signOut(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"><LogOut size={14} /> Abmelden</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Phasen-Leiste: klar getrennt */}
        <div className="px-4 md:px-5 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex-1 h-1.5 rounded-full ${workPhase === 'site' || workPhase === 'hardware' ? 'bg-petrol' : 'bg-zinc-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${workPhase === 'hardware' ? 'bg-petrol' : 'bg-zinc-200'}`} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Schritt {workPhase === 'site' ? '1' : '2'} von 2
              </p>
              <p className="text-sm font-extrabold text-navy">
                {workPhase === 'site' ? 'Deine Handy-Seite (Microsite)' : 'Dein Schlüsselanhänger (3D)'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
                {workPhase === 'site'
                  ? 'Hier gestaltest du nur die digitale Seite. Den Anhänger machst du danach.'
                  : 'Hier gestaltest du nur den physischen Anhänger. Die Seite ist schon fertig.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {workPhase === 'hardware' && (
                <button
                  type="button"
                  onClick={() => setWorkPhase('site')}
                  className="min-h-[40px] px-3 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  ← Zurück zur Seite
                </button>
              )}
              {workPhase === 'site' && (
                <button
                  type="button"
                  onClick={() => setWorkPhase('hardware')}
                  className="min-h-[40px] px-4 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy/90"
                >
                  Weiter zum Anhänger →
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {workPhase === 'site' && (
        <div className="sm:hidden flex border-b border-zinc-200/80 bg-white px-4 py-2">
          <div className="flex bg-zinc-100 p-0.5 rounded-lg w-full">
            <button
              type="button"
              onClick={() => setDigitalMode('assist')}
              className={`flex-1 py-2.5 rounded-md text-[11px] font-semibold transition-colors ${digitalMode === 'assist' ? 'bg-white text-navy shadow-sm' : 'text-zinc-500'}`}
            >
              Assistent
            </button>
            <button
              type="button"
              onClick={() => setDigitalMode('manual')}
              className={`flex-1 py-2.5 rounded-md text-[11px] font-semibold transition-colors ${digitalMode === 'manual' ? 'bg-white text-navy shadow-sm' : 'text-zinc-500'}`}
            >
              Selbst feilen
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <aside className={`flex flex-col bg-zinc-50/50 min-h-0 w-full md:w-[400px] lg:w-[420px] shrink-0 border-r border-zinc-200/80 ${mobileTab === 'editor' ? 'flex' : 'hidden md:flex'}`}>
          {workPhase === 'site' && digitalMode === 'assist' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="hidden sm:flex border-b border-zinc-100 bg-white px-3 py-2 gap-1">
                <button
                  type="button"
                  onClick={() => setDigitalMode('assist')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold ${digitalMode === 'assist' ? 'bg-petrol/10 text-petrol' : 'text-zinc-500'}`}
                >
                  Assistent
                </button>
                <button
                  type="button"
                  onClick={() => setDigitalMode('manual')}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                >
                  Selbst feilen
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <MicrositeChat
                  variant="panel"
                  config={config}
                  onApplyConfig={(next) => {
                    setConfig(next);
                    setPreviewType('digital');
                  }}
                  onContinueManual={() => setDigitalMode('manual')}
                  onContinueToHardware={() => setWorkPhase('hardware')}
                />
              </div>
            </div>
          ) : workPhase === 'site' ? (
            <>
              <div className="hidden sm:flex border-b border-zinc-100 bg-white px-3 py-2 gap-1">
                <button
                  type="button"
                  onClick={() => setDigitalMode('assist')}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                >
                  Assistent
                </button>
                <button
                  type="button"
                  onClick={() => setDigitalMode('manual')}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-petrol/10 text-petrol"
                >
                  Selbst feilen
                </button>
              </div>
              <div className="flex-1 scroll-container technical-grid-fine min-h-0">
                <div className="p-4 sm:p-5 pb-28 md:pb-6">
                  <Controls
                    activeDept="digital"
                    config={config}
                    setConfig={setConfig}
                    svgElements={svgElements}
                    onUpload={handleFileUpload}
                    onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)}
                  />
                </div>
              </div>
              <footer className="hidden md:flex shrink-0 p-4 border-t border-zinc-200/80 bg-white flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setWorkPhase('hardware')}
                  className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Weiter zum Anhänger →
                </button>
              </footer>
            </>
          ) : (
            <>
              <div className="flex-1 scroll-container technical-grid-fine min-h-0">
                <div className="p-4 sm:p-5 pb-28 md:pb-6">
                  {PRODUCTS.length > 1 && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Produkt</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                      >
                        {PRODUCTS.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Controls
                    activeDept="3d"
                    config={config}
                    setConfig={setConfig}
                    svgElements={svgElements}
                    onUpload={handleFileUpload}
                    onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)}
                  />
                </div>
              </div>
              <footer className="hidden md:flex shrink-0 p-4 border-t border-zinc-200/80 bg-white">
                <button type="button" onClick={initiateSave} className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                  <ShoppingCart size={18} />
                  Fertig – bestellen
                </button>
              </footer>
            </>
          )}
        </aside>

        <main className={`flex-1 relative z-10 min-h-0 bg-zinc-100 ${mobileTab === 'preview' ? 'flex flex-col' : 'hidden md:flex'}`}>
          <div className="flex-1 relative overflow-hidden min-h-[200px]">
            <Viewer
              ref={viewerRef}
              config={config}
              svgElements={svgElements}
              showNFCPreview={workPhase === 'site'}
              googleLogoUrl={session?.user?.user_metadata?.avatar_url}
            />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] px-4 py-2 rounded-lg bg-white/95 border border-zinc-200 shadow-sm text-xs font-semibold text-navy">
              {workPhase === 'site' ? 'Vorschau: Handy-Seite' : 'Vorschau: Schlüsselanhänger'}
            </div>
          </div>
          <div className="md:hidden shrink-0 p-4 bg-white border-t border-zinc-200 safe-bottom">
            {workPhase === 'site' ? (
              <button
                type="button"
                onClick={() => setWorkPhase('hardware')}
                className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Weiter zum Anhänger →
              </button>
            ) : (
              <button type="button" onClick={initiateSave} className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                <ShoppingCart size={18} />
                Fertig – bestellen
              </button>
            )}
          </div>
          {savingStep !== 'idle' && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[600] flex flex-col items-center justify-center text-center px-6">
              <RefreshCw className="text-petrol animate-spin mb-4" size={40} />
              <p className="font-black uppercase tracking-wider text-navy text-sm">Wird gesichert...</p>
              <p className="text-[10px] text-zinc-500 mt-1">Weiter zum Warenkorb</p>
            </div>
          )}
        </main>
      </div>

      <nav className="md:hidden flex h-16 bg-white border-t border-zinc-200 z-[600] shrink-0 pb-safe pt-1" role="tablist" aria-label="Hauptnavigation">
        <button type="button" role="tab" onClick={() => setMobileTab('editor')} className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 transition-colors ${mobileTab === 'editor' ? 'text-navy' : 'text-zinc-400'}`} aria-selected={mobileTab === 'editor'}>
          <Edit3 size={22} strokeWidth={mobileTab === 'editor' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold">Editor</span>
        </button>
        <button type="button" role="tab" onClick={() => setMobileTab('preview')} className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 transition-colors ${mobileTab === 'preview' ? 'text-navy' : 'text-zinc-400'}`} aria-selected={mobileTab === 'preview'}>
          <Smartphone size={22} strokeWidth={mobileTab === 'preview' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold">Vorschau</span>
        </button>
      </nav>
    </div>
  );
};

export default ConfiguratorPage;
