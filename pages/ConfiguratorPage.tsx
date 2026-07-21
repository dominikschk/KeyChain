/**
 * Konfigurator – Panel zum Konfigurieren von NFeC-Produkten (3D + Microsite).
 */
import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Loader2, ArrowRight, RefreshCw, Edit3, Smartphone, ShoppingCart, Download, Upload, RotateCcw, ExternalLink, Check, LogOut, User, ChevronDown, Copy, Share2 } from 'lucide-react';
import { Controls } from '../components/Controls';
import { SitePreview } from '../components/SitePreview';
import { KeychainPreview } from '../components/KeychainPreview';
import type { KeychainPreviewHandle } from '../components/KeychainPreview';
import { LoginScreen } from '../components/LoginScreen';
import { ShopifyGuide } from '../components/ShopifyGuide';
import { LegalFooter } from '../components/LegalFooter';
import { DEFAULT_CONFIG, buildShopifyCartUrl, buildMicrositeUrl, buildCcpEditUrl, PRODUCTS } from '../constants';
import { ModelConfig, Department } from '../types';
import { supabase } from '../lib/supabase';
import { generateShortId, generateWriteToken, showError, resetFileInput } from '../lib/utils';
import { validateLogoEngraveFile, validateProfileTitle, toSafeHttpUrl, isRasterLogoFile, isSvgLogoFile } from '../lib/validation';
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
import { buildProductionPrintAssets } from '../lib/printAssets';
import { exportKeychainStl } from '../lib/stlExport';
import { assessLogoHealth } from '../lib/logoHealth';
import {
  buildDraftShareUrl,
  decodeDraftShare,
  readDraftParamFromLocation,
} from '../lib/draftShare';
import { bulkHintForQuantity, clampOrderQuantity, MAX_ORDER_QUANTITY } from '../lib/bulkOrder';
import { pricingHintForQuantity, resolveCheckoutPrice } from '../lib/shopifyPricing';
import { buildPricingSnapshot } from '../lib/pricingSnapshot';
import { createDraftCheckoutResult, probeDraftOrderFunction } from '../lib/shopifyDraftOrderApi';
import {
  basketTotals,
  clearCheckoutBasket,
  loadCheckoutBasket,
  saveCheckoutBasket,
  upsertBasketLine,
  type CheckoutBasketLine,
} from '../lib/checkoutBasket';
import { customerSaveError } from '../lib/customerErrors';
import { t } from '../lib/i18n';
import { filamentCustomerHint } from '../lib/filamentProfiles';
import { isLiveSimple } from '../lib/liveMode';

const MicrositeChat = lazy(() =>
  import('../components/MicrositeChat').then((m) => ({ default: m.MicrositeChat }))
);
const Microsite = lazy(() =>
  import('../components/Microsite').then((m) => ({ default: m.Microsite }))
);

const LAST_DELIVERY_KEY = 'nudaim_last_delivery_links';
const DRAFT_BANNER_KEY = 'nudaim_draft_banner_seen';

type DeliveryLinks = {
  shortId: string;
  micrositeUrl: string;
  ccpUrl: string;
  /** Fallback wenn Draft Order fehlt (nur letzte Zeile) */
  cartUrl: string;
  destinationUrl?: string;
  basket: CheckoutBasketLine[];
};

const SAVING_LABELS: Record<string, string> = {
  screenshot: 'Bild vom Anhänger wird gemacht…',
  upload: 'Dein Design wird hochgeladen…',
  db: 'Bestellung wird vorbereitet…',
  done: 'Weiter zum Warenkorb…',
};

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'Eigene Website';
  } catch {
    return 'Eigene Website';
  }
}

/** Live: ein Design → Draft-Kasse (Preis echt). Full: ggf. Multi-Korb. */
const DeliveryHandoffModal: React.FC<{
  links: DeliveryLinks;
  onCheckout: () => void;
  onAddAnother: () => void;
  checkoutBusy?: boolean;
  checkoutHint?: string | null;
  simple?: boolean;
}> = ({ links, onCheckout, onAddAnother, checkoutBusy, checkoutHint, simple }) => {
  const [copied, setCopied] = useState<'ms' | 'ccp' | null>(null);
  const [showLinks, setShowLinks] = useState(false);
  const totals = basketTotals(links.basket);
  const line = links.basket[0];

  const go = () => {
    if (checkoutBusy) return;
    onCheckout();
  };

  const copy = async (which: 'ms' | 'ccp', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      showError('Link bitte manuell markieren und kopieren.');
    }
  };

  if (simple) {
    return (
      <div className="fixed inset-0 z-[2500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy/80 backdrop-blur-md pb-safe">
        <div className="card w-full max-w-lg flex flex-col max-h-[92dvh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-300 rounded-t-2xl sm:rounded-2xl">
          <header className="px-5 py-4 border-b border-navy/5 bg-cream">
            <p className="text-[10px] font-bold uppercase tracking-widest text-petrol mb-1">Geschafft</p>
            <h2 className="font-headline text-lg font-extrabold uppercase tracking-tight text-navy">
              Weiter zur Kasse
            </h2>
            <p className="text-sm text-zinc-600 mt-1 leading-snug">
              Dein Anhänger ist gespeichert. Als Nächstes öffnet die Shopify-Kasse mit dem Preis aus dem Konfigurator.
            </p>
          </header>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-safe">
            {(line || totals.pieceCount > 0) && (
              <div className="rounded-2xl border border-navy/10 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-navy">
                  {totals.pieceCount}× Schlüsselanhänger
                </p>
                <p className="text-base font-extrabold text-navy mt-0.5">
                  {totals.totalLabel}
                  {line && totals.pieceCount > 1 ? (
                    <span className="text-xs font-semibold text-zinc-500 ml-2">
                      ({line.unitLabel})
                    </span>
                  ) : null}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={go}
              disabled={!!checkoutBusy}
              className="w-full min-h-[56px] bg-navy text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
            >
              {checkoutBusy ? <Loader2 size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
              {checkoutBusy ? 'Kasse wird vorbereitet…' : 'Zur Kasse'}
              {!checkoutBusy && <ArrowRight size={18} />}
            </button>
            <p className="text-[11px] text-zinc-500 leading-snug text-center">
              {t('legal.preview.short')} Mit „Zur Kasse“ gelten AGB und Widerrufshinweise.
            </p>
            <LegalFooter compact />
            <p className="text-center text-xs text-zinc-500">
              Code: <strong className="text-navy">{links.shortId}</strong>
            </p>
            {checkoutHint ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-snug">
                {checkoutHint}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setShowLinks((v) => !v)}
              className="w-full text-left text-sm font-semibold text-petrol py-2"
            >
              {showLinks ? '− Links ausblenden' : '+ Handy-Seite & Bearbeiten-Link'}
            </button>
            {showLinks && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-navy/10 bg-white p-4 space-y-2">
                  <p className="text-sm font-semibold text-navy">
                    {links.destinationUrl ? 'NFC-Link (Chip)' : 'Handy-Seite'}
                  </p>
                  <p className="text-xs text-zinc-500 break-all">{links.micrositeUrl}</p>
                  <button
                    type="button"
                    onClick={() => void copy('ms', links.micrositeUrl)}
                    className="min-h-[44px] px-4 rounded-xl border border-zinc-200 text-sm font-semibold text-navy inline-flex items-center gap-2"
                  >
                    {copied === 'ms' ? <Check size={16} /> : <Copy size={16} />}
                    {copied === 'ms' ? 'Kopiert' : 'Kopieren'}
                  </button>
                </div>
                <div className="rounded-2xl border border-petrol/20 bg-petrol/5 p-4 space-y-2">
                  <p className="text-sm font-semibold text-navy">Später ändern</p>
                  <p className="text-xs text-zinc-500 break-all">{links.ccpUrl}</p>
                  <button
                    type="button"
                    onClick={() => void copy('ccp', links.ccpUrl)}
                    className="min-h-[44px] px-4 rounded-xl border border-petrol/30 text-sm font-semibold text-navy inline-flex items-center gap-2 bg-white"
                  >
                    {copied === 'ccp' ? <Check size={16} /> : <Copy size={16} />}
                    {copied === 'ccp' ? 'Kopiert' : 'Bearbeiten-Link kopieren'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy/80 backdrop-blur-md">
      <div className="card w-full max-w-lg flex flex-col max-h-[92dvh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-300">
        <header className="px-5 py-4 border-b border-navy/5 bg-cream">
          <p className="text-[10px] font-bold uppercase tracking-widest text-petrol mb-1">Im Warenkorb</p>
          <h2 className="font-headline text-lg font-extrabold uppercase tracking-tight text-navy">
            Design gespeichert
          </h2>
          <p className="text-sm text-zinc-600 mt-1 leading-snug">
            Mengenrabatt gilt nur je Design – nicht über verschiedene Anhänger hinweg.
          </p>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <ul className="space-y-2">
            {links.basket.map((line) => (
              <li
                key={line.shortId}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 flex gap-3 items-center"
              >
                {line.previewUrl ? (
                  <img src={line.previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-zinc-100" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-zinc-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{line.productTitle}</p>
                  <p className="text-[11px] text-zinc-500">
                    {line.quantity}× · {line.unitLabel}
                    <span className="text-zinc-400"> · {line.tierLabel}</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono truncate">{line.shortId}</p>
                </div>
                <p className="text-sm font-semibold text-navy shrink-0">{line.totalLabel}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-navy text-right">
            Gesamt {totals.totalLabel}
            <span className="block text-[11px] font-medium text-zinc-500">
              {totals.lineCount} Design{totals.lineCount === 1 ? '' : 's'} · {totals.pieceCount} Stück
            </span>
          </p>

          <button
            type="button"
            disabled={checkoutBusy}
            onClick={onCheckout}
            className="w-full min-h-[56px] bg-navy text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            {checkoutBusy ? <Loader2 size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
            Zur Kasse · {totals.totalLabel}
            <ArrowRight size={18} />
          </button>
          <p className="text-[11px] text-zinc-500 leading-snug text-center">
            {t('legal.preview.short')} Mit „Zur Kasse“ gelten AGB und Widerrufshinweise.
          </p>
          <LegalFooter compact />
          {checkoutHint && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
              {checkoutHint}
            </p>
          )}
          <button
            type="button"
            disabled={checkoutBusy}
            onClick={onAddAnother}
            className="w-full min-h-[48px] rounded-xl border border-zinc-200 text-sm font-semibold text-navy"
          >
            Weiteren Anhänger gestalten
          </button>
          <p className="text-center text-[11px] text-zinc-500 leading-snug">
            Ein einzelnes Design mit 1 Stück bleibt beim Einzelpreis – auch wenn ein anderes Design 50× im Korb liegt.
          </p>

          <button
            type="button"
            onClick={() => setShowLinks((v) => !v)}
            className="w-full text-left text-sm font-semibold text-petrol py-2"
          >
            {showLinks ? '− Links ausblenden' : '+ Links zum letzten Design'}
          </button>

          {showLinks && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-navy/10 bg-white p-4 space-y-2">
                <p className="text-sm font-semibold text-navy">
                  {links.destinationUrl ? 'NFC-Link (Chip)' : 'Handy-Seite'}
                </p>
                <p className="text-xs text-zinc-500 break-all">{links.micrositeUrl}</p>
                <button
                  type="button"
                  onClick={() => void copy('ms', links.micrositeUrl)}
                  className="min-h-[44px] px-4 rounded-xl border border-zinc-200 text-sm font-semibold text-navy inline-flex items-center gap-2"
                >
                  {copied === 'ms' ? <Check size={16} /> : <Copy size={16} />}
                  {copied === 'ms' ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
              <div className="rounded-2xl border border-petrol/20 bg-petrol/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-navy">Später ändern</p>
                <p className="text-xs text-zinc-500 break-all">{links.ccpUrl}</p>
                <button
                  type="button"
                  onClick={() => void copy('ccp', links.ccpUrl)}
                  className="min-h-[44px] px-4 rounded-xl border border-petrol/30 text-sm font-semibold text-navy inline-flex items-center gap-2 bg-white"
                >
                  {copied === 'ccp' ? <Check size={16} /> : <Copy size={16} />}
                  {copied === 'ccp' ? 'Kopiert' : 'Bearbeiten-Link kopieren'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConfiguratorPage: React.FC = () => {
  const [viewMode] = useState<'editor' | 'microsite' | 'preview'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === '1') return 'preview';
    // Geteilter Entwurf hat Vorrang vor id= (kein öffentlicher Microsite-View)
    if (params.get('draft')) return 'editor';
    return params.get('id') ? 'microsite' : 'editor';
  });

  const [session, setSession] = useState<AuthSession>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  /** Assistent zuerst im gleichen Fenster; danach optional manueller Editor */
  const [digitalMode, setDigitalMode] = useState<'assist' | 'manual'>(() =>
    isLiveSimple() ? 'manual' : 'assist'
  );
  /** Zwei Arbeitsphasen: zuerst Anhänger (Produkt), dann Chip-Ziel */
  const [workPhase, setWorkPhase] = useState<'site' | 'hardware'>('hardware');
  const [shopifyGuideOpen, setShopifyGuideOpen] = useState(false);
  const [deliveryLinks, setDeliveryLinks] = useState<DeliveryLinks | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutHint, setCheckoutHint] = useState<string | null>(null);
  const [basketCount, setBasketCount] = useState(() => {
    try {
      return loadCheckoutBasket().length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (isLiveSimple()) {
      setCheckoutHint(null);
      return;
    }
    let cancelled = false;
    void probeDraftOrderFunction().then((p) => {
      if (cancelled) return;
      if (!p.reachable) {
        setCheckoutHint(
          'Kassen-Function noch nicht erreichbar – Bestellen öffnet ggf. den normalen Shopify-Warenkorb. Setup: PHASE0_GO_LIVE.md'
        );
      } else if (!p.configured) {
        setCheckoutHint(
          'Draft Orders Fast fertig: Function ist da, Shopify-Secrets in Supabase fehlen noch (SHOPIFY_SHOP_DOMAIN + Token).'
        );
      } else {
        setCheckoutHint(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setMicrositeError('Dieser Link ist unvollständig. Bitte den QR-Code oder den Link vom Anhänger erneut öffnen.');
      return;
    }
    setMicrositeError(null);
    getConfigByShortId(shortId)
      .then((result) => {
        if (result) {
          recordScan(result.configId).catch(() => { /* einmal pro Aufruf; Fehler still */ });
          const dest =
            result.config.landingMode === 'external'
              ? toSafeHttpUrl(result.config.externalUrl || '')
              : null;
          if (dest) {
            window.location.replace(dest);
            return;
          }
          setMicrositeConfig(result.config);
        } else setMicrositeError('Diese Seite wurde nicht gefunden. Bitte den Link prüfen oder den Anbieter kontaktieren.');
      })
      .catch(() => setMicrositeError('Die Seite konnte gerade nicht geladen werden. Bitte später erneut versuchen.'))
      .finally(() => setMicrositeLoading(false));
  }, [viewMode]);

  const [config, setConfig] = useState<ModelConfig>(() => {
    const draft = loadDraft();
    return draft ?? JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  });
  const [svgContent, setSvgContent] = useState<string | null>(() => loadDraftSvg());
  const [logoBusy, setLogoBusy] = useState(false);

  const logoPreviewUrl = useMemo(() => {
    if (!svgContent?.trim()) return null;
    try {
      const preview =
        /data-role="preview"[^>]*(?:href|xlink:href)="(data:image\/png;base64,[^"]+)"/i.exec(svgContent)?.[1] ||
        /(?:href|xlink:href)="(data:image\/png;base64,[^"]+)"[^>]*data-role="preview"/i.exec(svgContent)?.[1] ||
        /(?:href|xlink:href)="(data:image\/png;base64,[^"]+)"/i.exec(svgContent)?.[1];
      if (preview) return preview;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
    } catch {
      return null;
    }
  }, [svgContent]);
  const logoHealth = useMemo(() => assessLogoHealth(svgContent), [svgContent]);
  const [selectedProductId, setSelectedProductId] = useState<string>(() => PRODUCTS[0]?.id ?? 'keychain');
  const checkoutPrice = useMemo(
    () => resolveCheckoutPrice(selectedProductId, orderQuantity),
    [selectedProductId, orderQuantity]
  );
  const liveSimple = isLiveSimple();
  const orderCtaLabel = `${t('cta.order')}${orderQuantity > 1 ? ` (${orderQuantity})` : ''} · ${checkoutPrice.totalLabel}`;
  const [activeDept, setActiveDept] = useState<Department>('digital');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('preview');
  const [previewType, setPreviewType] = useState<'3d' | 'digital'>('digital');
  const [savingStep, setSavingStep] = useState('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(() => {
    try {
      return !!loadDraft() && !sessionStorage.getItem(DRAFT_BANNER_KEY);
    } catch {
      return false;
    }
  });
  const draftSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geteilten Entwurf aus ?draft= laden (ohne Checkout)
  useEffect(() => {
    if (viewMode !== 'editor') return;
    const encoded = readDraftParamFromLocation(window.location.search);
    if (!encoded) return;
    let cancelled = false;
    void decodeDraftShare(encoded).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setConfig(result.config);
        setToastMessage('Geteilter Entwurf geladen');
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => {
          setToastMessage(null);
          toastRef.current = null;
        }, 2800);
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete('draft');
          window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`);
        } catch {
          /* ignore */
        }
      } else {
        showError(result.error, 'Teilen-Link');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [viewMode]);

  const viewerRef = useRef<KeychainPreviewHandle>(null);

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

  const handleShareDraft = useCallback(async () => {
    try {
      const url = await buildDraftShareUrl(window.location.origin, config);
      if (!url) {
        showError(
          'Der Entwurf ist zu groß für einen Link. Weniger Inhalte oder kürzere Texte helfen.',
          'Teilen'
        );
        return;
      }
      await navigator.clipboard.writeText(url);
      setToastMessage('Teilen-Link kopiert (ohne Bestellung)');
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => {
        setToastMessage(null);
        toastRef.current = null;
      }, 2800);
    } catch {
      showError('Link konnte nicht kopiert werden.', 'Teilen');
    }
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

  const goToSite = useCallback(() => {
    setWorkPhase('site');
    setMobileTab('editor');
  }, []);

  const goToHardware = useCallback(() => {
    if (config.landingMode === 'external') {
      const url = toSafeHttpUrl(config.externalUrl || '');
      if (!url) {
        showError(
          'Tipp: z. B. deine Website, Instagram oder Google-Profil – mit https:// davor.',
          'Bitte eine gültige Adresse eingeben.'
        );
        return;
      }
      setConfig((prev) => ({
        ...prev,
        externalUrl: url,
        profileTitle:
          !prev.profileTitle || prev.profileTitle === DEFAULT_CONFIG.profileTitle
            ? hostnameFromUrl(url)
            : prev.profileTitle,
      }));
    }
    setWorkPhase('hardware');
    setMobileTab('preview');
  }, [config.landingMode, config.externalUrl]);

  const executeSave = useCallback(async (screenshotDataUrl: string | null) => {
    if (!supabase) {
      showError('Bitte prüfe deine Umgebungsvariablen.', 'Supabase ist nicht konfiguriert.');
      return;
    }

    const isExternal = config.landingMode === 'external';
    let destinationUrl: string | undefined;
    if (isExternal) {
      const url = toSafeHttpUrl(config.externalUrl || '');
      if (!url) {
        showError('Bitte eine gültige Adresse eingeben.', 'Eigene Seite');
        return;
      }
      destinationUrl = url;
    } else {
      const titleCheck = validateProfileTitle(config.profileTitle);
      if (!titleCheck.valid) {
        showError(titleCheck.error!);
        return;
      }
    }

    let profileTitle = config.profileTitle.trim();
    if (isExternal && destinationUrl) {
      if (!profileTitle || profileTitle === DEFAULT_CONFIG.profileTitle) {
        profileTitle = hostnameFromUrl(destinationUrl);
      }
    }

    setSavingStep('screenshot');
    const shortId = generateShortId();
    const writeToken = generateWriteToken();
    const printAssets = buildProductionPrintAssets(svgContent);
    const productionSvg = printAssets?.productionSvg ?? null;
    // STL parallel starten – wartet nicht auf Critical Path (Druck-SVG als Quelle)
    const stlExportPromise = exportKeychainStl(config, productionSvg).catch((e) => {
      console.warn('STL export failed:', e);
      return null;
    });

    try {
      let finalImageUrl = '';
      let printPngUrl: string | null = null;
      setSavingStep('upload');
      if (screenshotDataUrl) {
        const res = await fetch(screenshotDataUrl);
        if (!res.ok) throw new Error('Screenshot konnte nicht geladen werden');
        const blob = await res.blob();
        const ext = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
        const path = storagePath(`preview_${shortId}_`, `shot.${ext}`);
        const url = await uploadAndGetPublicUrl(supabase, path, blob);
        if (!url) throw new Error('Upload fehlgeschlagen');
        finalImageUrl = url;
      }

      if (printAssets?.printPngBlob && supabase) {
        const printPath = storagePath(`print/${shortId}_`, 'logo.png');
        printPngUrl = await uploadAndGetPublicUrl(supabase, printPath, printAssets.printPngBlob);
      }

      setSavingStep('db');
      const product = PRODUCTS.find((p) => p.id === selectedProductId) ?? PRODUCTS[0];
      const priced = resolveCheckoutPrice(selectedProductId, orderQuantity);
      const pricingSnapshot = buildPricingSnapshot({
        productId: priced.productId,
        quantity: priced.quantity,
        unitPriceCents: priced.unitPriceCents,
        totalCents: priced.totalCents,
        tierLabel: priced.tierLabel,
      });
      const configId = crypto.randomUUID();
      const { error: dbError } = await supabase.from('nfc_configs').insert([{
        id: configId,
        short_id: shortId,
        write_token: writeToken,
        preview_image: finalImageUrl,
        profile_title: profileTitle,
        header_image_url: isExternal ? null : config.headerImageUrl,
        profile_logo_url: isExternal ? null : config.profileLogoUrl,
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
          plateColor: config.plateColor || '#F8F5F0',
          logoDepth: config.logoDepth,
          logoPosX: config.logoPosX,
          logoPosY: config.logoPosY,
          logoRotation: config.logoRotation,
          mirrorX: !!config.mirrorX,
          hasChain: config.hasChain !== false,
          logo_svg: productionSvg,
          print_png_url: printPngUrl,
          engraveText: config.engraveText || '',
          engraveLayout: config.engraveLayout || 'logo_above',
          engraveGap: config.engraveGap ?? 40,
          surfaceColor: config.surfaceColor || null,
          textColor: config.textColor || null,
          layoutMode: config.layoutMode || 'landing',
          navEnabled: config.navEnabled !== false,
          faviconUrl: config.faviconUrl && config.faviconUrl.startsWith('https://') ? config.faviconUrl : null,
          landingMode: isExternal ? 'external' : 'microsite',
          externalUrl: destinationUrl || '',
          pricing: pricingSnapshot,
        }
      }]);
      if (dbError) throw dbError;

      if (!isExternal && config.nfcBlocks.length > 0) {
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

      setSavingStep('done');
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const variantId = priced.variantId;
      const micrositeUrl = buildMicrositeUrl(baseUrl, shortId);
      const ccpUrl = buildCcpEditUrl(baseUrl, shortId, writeToken);
      // Cart-Permalink: KEIN Preis-Property – Shopify rechnet nur den Katalogpreis der Variante.
      // Ein anderer Text (z. B. „1,00 €“) neben „1,50 €“ im Warenkorb verwirrt nur.
      const fallbackCartUrl = buildShopifyCartUrl(
        variantId,
        shortId,
        finalImageUrl,
        baseUrl,
        writeToken,
        destinationUrl,
        priced.quantity,
        undefined
      );

      const basketLine: CheckoutBasketLine = {
        shortId,
        productId: priced.productId,
        productTitle: priced.productName,
        quantity: priced.quantity,
        unitPriceCents: priced.unitPriceCents,
        totalCents: priced.totalCents,
        tierLabel: priced.tierLabel,
        unitLabel: priced.unitLabel,
        totalLabel: priced.totalLabel,
        priceHint: priced.cartPropertyValue,
        previewUrl: finalImageUrl || undefined,
        micrositeUrl,
        ccpUrl,
        destinationUrl,
        variantId,
      };
      // Live: immer nur dieses eine Design – kein Multi-Korb
      const nextBasket = isLiveSimple()
        ? [basketLine]
        : upsertBasketLine(loadCheckoutBasket(), basketLine);
      if (isLiveSimple()) {
        clearCheckoutBasket();
      } else {
        saveCheckoutBasket(nextBasket);
      }
      setBasketCount(nextBasket.length);

      const links: DeliveryLinks = {
        shortId,
        micrositeUrl,
        ccpUrl,
        cartUrl: fallbackCartUrl,
        destinationUrl,
        basket: nextBasket,
      };
      try {
        localStorage.setItem(LAST_DELIVERY_KEY, JSON.stringify({ ...links, savedAt: Date.now() }));
      } catch {
        /* ignore */
      }
      clearDraft();
      setDeliveryLinks(links);
      setSavingStep('idle');

      // STL im Hintergrund – blockiert Warenkorb nicht
      void (async () => {
        try {
          const stlBlob = await stlExportPromise;
          if (!stlBlob || !supabase) return;
          const stlPath = storagePath(`stl/${shortId}_`, 'model.stl');
          const stlUrl = await uploadAndGetPublicUrl(supabase, stlPath, stlBlob);
          if (stlUrl) await setConfigStlUrl(configId, stlUrl, writeToken);
        } catch (e) {
          console.warn('STL background upload failed:', e);
        }
      })();
    } catch (err) {
      console.error('Save error:', err);
      setSavingStep('idle');
      const friendly = customerSaveError(err);
      showError(friendly.msg, friendly.title);
    }
  }, [config, selectedProductId, svgContent, orderQuantity]);

  const handleBasketCheckout = useCallback(async () => {
    if (!deliveryLinks?.basket.length) return;

    setCheckoutBusy(true);
    try {
      const lines = deliveryLinks.basket.map((l) => ({
        shortId: l.shortId,
        productId: l.productId,
        productTitle: l.productTitle,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        previewUrl: l.previewUrl,
        micrositeUrl: l.micrositeUrl,
        ccpUrl: l.ccpUrl,
        destinationUrl: l.destinationUrl,
        variantId: l.variantId,
        priceHint: l.priceHint,
      }));

      // Immer zuerst Draft Order: nur so landet der Konfigurator-Preis echt in Shopify.
      // Ohne Secrets → stiller Fallback auf Cart (Katalogpreis der Variante).
      const draft = await createDraftCheckoutResult({ lines });
      if (draft.ok) {
        clearCheckoutBasket();
        setBasketCount(0);
        setDeliveryLinks(null);
        window.location.href = draft.invoiceUrl;
        return;
      }

      const cartUrl = deliveryLinks.cartUrl;
      const canCartFallback = deliveryLinks.basket.length === 1 && !!cartUrl;

      if (draft.reason === 'not_configured' || draft.reason === 'setup') {
        // Live: Draft ist Pflicht für den richtigen Preis – nicht still auf Katalog-Cart fallen.
        if (isLiveSimple()) {
          setCheckoutHint(
            'Draft Order noch nicht eingerichtet. Anleitung: GO_LIVE_SCHRITT_DRAFT.md (Shopify-App + Supabase-Secrets + Function).'
          );
          showError(
            'Die Kasse mit Konfigurator-Preis ist noch nicht eingerichtet. Bitte GO_LIVE_SCHRITT_DRAFT.md abarbeiten (Shopify-Token + Supabase Function).',
            'Draft Order fehlt'
          );
          return;
        }
        if (canCartFallback) {
          setCheckoutHint(draft.message);
          const goCart = window.confirm(
            `${draft.message}\n\nStattdessen den normalen Shopify-Warenkorb öffnen? (Preis dann aus dem Shop-Katalog)`
          );
          if (goCart) {
            clearCheckoutBasket();
            setBasketCount(0);
            setDeliveryLinks(null);
            window.location.href = cartUrl;
          }
          return;
        }
        showError(draft.message, 'Kasse noch nicht eingerichtet');
        return;
      }

      if (draft.reason === 'invalid') {
        showError(draft.message, 'Kasse fehlgeschlagen');
        return;
      }

      if (draft.reason === 'rate_limited') {
        showError(draft.message, 'Kurz warten');
        return;
      }

      if (canCartFallback && !isLiveSimple()) {
        const goCart = window.confirm(
          `Kasse mit berechnetem Preis hat nicht geklappt:\n${draft.message}\n\nShopify-Warenkorb als Notlösung öffnen?`
        );
        if (goCart) {
          clearCheckoutBasket();
          setBasketCount(0);
          setDeliveryLinks(null);
          window.location.href = cartUrl;
        }
        return;
      }

      showError(
        isLiveSimple()
          ? `${draft.message} Tipp: Function create-draft-order neu deployen und GO_LIVE_SCHRITT_DRAFT.md prüfen.`
          : draft.message,
        'Kasse fehlgeschlagen'
      );
    } finally {
      setCheckoutBusy(false);
    }
  }, [deliveryLinks]);

  const handleAddAnotherDesign = useCallback(() => {
    setDeliveryLinks(null);
    setOrderQuantity(1);
    setWorkPhase('hardware');
    setToastMessage('Nächstes Design – Stückzahl wieder 1 (eigener Preis)');
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => {
      setToastMessage(null);
      toastRef.current = null;
    }, 3200);
  }, []);

  const initiateSave = useCallback(async () => {
    try {
      if (config.landingMode === 'external') {
        const url = toSafeHttpUrl(config.externalUrl || '');
        if (!url) {
          showError(
            'Tipp: z. B. deine Website, Instagram oder Google-Profil – mit https:// davor.',
            'Bitte eine gültige Adresse eingeben.'
          );
          return;
        }
        setConfig((prev) => ({ ...prev, externalUrl: url }));
      }
      const health = assessLogoHealth(svgContent);
      if (!isLiveSimple() && health.willSimplifyForPrint) {
        const ok = window.confirm(
          `${health.message || t('legal.preview')}\n\nTrotzdem zur Bestellung weiter?`
        );
        if (!ok) return;
      }
      setSavingStep('screenshot');
      const screenshot = (await viewerRef.current?.takeScreenshot()) || null;
      await executeSave(screenshot);
    } catch (err) {
      console.error('Screenshot error:', err);
      setSavingStep('idle');
      showError('Bitte nochmal tippen.', 'Vorschau konnte nicht erstellt werden.');
    }
  }, [config.landingMode, config.externalUrl, executeSave, svgContent]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); void initiateSave(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [initiateSave]);

  const applyEngraveSvg = useCallback((content: string) => {
    if (!content?.trim()) {
      showError(
        'Tipp: Am besten eine klare Logo-Datei – kein Foto.',
        'Logo konnte nicht übernommen werden.'
      );
      return false;
    }
    setSvgContent(content);
    setConfig((prev) => ({
      ...prev,
      logoScale: prev.logoScale || 1,
      logoPosX: 0,
      logoPosY: 0,
    }));
    return true;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const fileCheck = validateLogoEngraveFile(file);
    if (!fileCheck.valid) {
      showError(fileCheck.error!);
      resetFileInput(input);
      return;
    }

    setLogoBusy(true);
    try {
      let content: string;
      if (isSvgLogoFile(file)) {
        content = await file.text();
        if (!content?.trim()) {
          showError('Die Datei ist leer.');
          return;
        }
      } else if (isRasterLogoFile(file)) {
        const { rasterFileToSvgDetailed } = await import('../lib/logoFromRaster');
        const result = await rasterFileToSvgDetailed(file);
        content = result.svg;
        if (result.dominantColor) {
          setConfig((prev) => ({ ...prev, logoColor: result.dominantColor! }));
        }
      } else {
        showError('Bitte ein Logo als PNG, JPG oder SVG wählen.');
        return;
      }

      if (!applyEngraveSvg(content)) return;
    } catch (err) {
      console.error('Logo upload error:', err);
      const msg = err instanceof Error ? err.message : 'Bitte versuche ein anderes Logo.';
      showError(msg, 'Logo konnte nicht geladen werden');
    } finally {
      setLogoBusy(false);
      resetFileInput(input);
    }
  };

  if (viewMode === 'microsite') {
    if (micrositeLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-cream text-navy">
          <Loader2 className="animate-spin text-petrol" size={32} />
          <span className="text-sm font-medium text-zinc-600">Seite wird geladen…</span>
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
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="animate-spin text-petrol" size={32} /></div>}>
        <Microsite config={micrositeConfig} googleLogoUrl={session?.user?.user_metadata?.avatar_url} />
      </Suspense>
    );
  }
  if (viewMode === 'preview') {
    const displayConfig = previewConfig ?? JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="animate-spin text-petrol" size={32} /></div>}>
        <Microsite config={displayConfig} googleLogoUrl={session?.user?.user_metadata?.avatar_url} />
      </Suspense>
    );
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
      {shopifyGuideOpen && <ShopifyGuide onClose={() => setShopifyGuideOpen(false)} />}
      {deliveryLinks && (
        <DeliveryHandoffModal
          links={deliveryLinks}
          checkoutBusy={checkoutBusy}
          checkoutHint={checkoutHint}
          simple={isLiveSimple()}
          onCheckout={() => void handleBasketCheckout()}
          onAddAnother={handleAddAnotherDesign}
        />
      )}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[3000] flex items-center justify-center gap-2 px-4 py-3 bg-petrol text-white rounded-xl shadow-lg text-[11px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-2 max-w-xs sm:max-w-none">
          <Check size={18} />
          {toastMessage}
        </div>
      )}

      <header className="shrink-0 bg-white border-b border-zinc-200/80 z-30">
        <div className="h-14 flex items-center justify-between px-4 md:px-5 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-headline font-extrabold text-lg uppercase tracking-tight text-navy truncate">NUDAIM</span>
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-petrol">Schlüsselanhänger</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {workPhase === 'hardware' && (
              <button
                type="button"
                onClick={() => void initiateSave()}
                className="hidden md:flex items-center gap-2 h-9 px-4 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy/90 active:scale-[0.98]"
              >
                <ShoppingCart size={14} />
                Bestellen
                {basketCount > 0 ? ` (${basketCount})` : ''}
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
                    <button type="button" onClick={() => { void handleShareDraft(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"><Share2 size={14} /> Entwurf teilen</button>
                    <button type="button" onClick={() => { handlePreviewInNewTab(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"><ExternalLink size={14} /> So sehen es Kunden</button>
                    {!liveSimple && (
                      <button type="button" onClick={() => { setShopifyGuideOpen(true); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"><ShoppingCart size={14} /> Shopify: Bestellmail</button>
                    )}
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
          {showDraftBanner && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-petrol/20 bg-petrol/5 px-3 py-2.5">
              <p className="text-xs text-navy font-medium">Entwurf geladen – weiterarbeiten oder neu starten?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try { sessionStorage.setItem(DRAFT_BANNER_KEY, '1'); } catch { /* ignore */ }
                    setShowDraftBanner(false);
                  }}
                  className="min-h-[36px] px-3 rounded-lg bg-navy text-white text-xs font-semibold"
                >
                  Weiter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearDraft();
                    setConfig(getDefaultConfig());
                    setSvgContent(null);
                    try { sessionStorage.setItem(DRAFT_BANNER_KEY, '1'); } catch { /* ignore */ }
                    setShowDraftBanner(false);
                  }}
                  className="min-h-[36px] px-3 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700"
                >
                  Neu starten
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex-1 h-1.5 rounded-full ${workPhase === 'hardware' || workPhase === 'site' ? 'bg-petrol' : 'bg-zinc-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${workPhase === 'site' ? 'bg-petrol' : 'bg-zinc-200'}`} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Schritt {workPhase === 'hardware' ? '1' : '2'} von 2 · Produkt: Schlüsselanhänger
              </p>
              <p className="text-sm font-extrabold text-navy">
                {workPhase === 'hardware'
                  ? 'Dein Schlüsselanhänger'
                  : (config.landingMode === 'external' ? 'Wohin der Chip öffnen soll' : 'Was Kunden auf dem Handy sehen')}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
                {workPhase === 'hardware'
                  ? 'Logo und Text platzieren – rechts siehst du, wie der Anhänger ungefähr aussieht.'
                  : (config.landingMode === 'external'
                    ? 'Optional: Website, Instagram oder Shop – wohin der Chip nach dem Scannen öffnet.'
                    : 'Optional: kleine Handy-Seite für deine Kunden – oder eigene URL wählen.')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {workPhase === 'site' && (
                <button
                  type="button"
                  onClick={goToHardware}
                  className="min-h-[40px] px-3 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  ← Zurück zum Anhänger
                </button>
              )}
              {workPhase === 'hardware' && (
                <>
                  <button
                    type="button"
                    onClick={goToSite}
                    className="min-h-[40px] px-3 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {t('cta.chip.optional')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void initiateSave()}
                    className="min-h-[40px] px-4 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy/90 inline-flex items-center gap-1.5"
                  >
                    <ShoppingCart size={14} />
                    {t('cta.order.direct')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {workPhase === 'site' && (
        <div className="px-4 md:px-5 pb-3 border-b border-zinc-100 bg-white space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Wohin soll der Chip öffnen?</p>
          <div className="grid grid-cols-2 gap-2 max-w-xl">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, landingMode: 'microsite' }))}
              className={`min-h-[52px] px-3 py-2 rounded-xl border text-left transition-colors ${
                (config.landingMode || 'microsite') !== 'external'
                  ? 'border-navy bg-navy text-white'
                  : 'border-zinc-200 bg-white text-navy hover:border-navy/30'
              }`}
            >
              <span className="block text-xs font-bold">NUDAIM-Seite</span>
              <span className={`block text-[10px] mt-0.5 ${(config.landingMode || 'microsite') !== 'external' ? 'text-white/70' : 'text-zinc-500'}`}>
                Hier bauen (Vorlagen)
              </span>
            </button>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, landingMode: 'external' }))}
              className={`min-h-[52px] px-3 py-2 rounded-xl border text-left transition-colors ${
                config.landingMode === 'external'
                  ? 'border-navy bg-navy text-white'
                  : 'border-zinc-200 bg-white text-navy hover:border-navy/30'
              }`}
            >
              <span className="block text-xs font-bold">Eigene Seite</span>
              <span className={`block text-[10px] mt-0.5 ${config.landingMode === 'external' ? 'text-white/70' : 'text-zinc-500'}`}>
                Website / Insta / Shop
              </span>
            </button>
          </div>
          <aside className="max-w-xl rounded-xl border border-petrol/15 bg-petrol/[0.04] px-3.5 py-3 text-[11px] text-zinc-600 leading-snug">
            <p className="font-bold text-navy text-xs mb-1">Wie kommt das auf meine Website?</p>
            <p>
              Du musst keinen Code in deine Website einbauen. Nach der Bestellung programmieren wir den Chip mit deinem Link.
              Handy dranhalten – deine NUDAIM-Seite oder deine eigene URL öffnet sich.
            </p>
            <p className="mt-1.5 text-zinc-500">
              Bei „Eigene Seite“ leitet der Chip direkt zu deiner Website, Instagram oder Shop weiter.
            </p>
          </aside>
        </div>
      )}

      {workPhase === 'site' && config.landingMode !== 'external' && (
        <div className="sm:hidden flex border-b border-zinc-200/80 bg-white px-4 py-2">
          <div className="flex bg-zinc-100 p-0.5 rounded-lg w-full">
            <button
              type="button"
              onClick={() => setDigitalMode('assist')}
              className={`flex-1 py-2.5 rounded-md text-[11px] font-semibold transition-colors ${digitalMode === 'assist' ? 'bg-white text-navy shadow-sm' : 'text-zinc-500'}`}
            >
              Mithelfen lassen
            </button>
            <button
              type="button"
              onClick={() => setDigitalMode('manual')}
              className={`flex-1 py-2.5 rounded-md text-[11px] font-semibold transition-colors ${digitalMode === 'manual' ? 'bg-white text-navy shadow-sm' : 'text-zinc-500'}`}
            >
              Selbst anpassen
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <aside className={`flex flex-col bg-zinc-50/50 min-h-0 w-full md:w-[400px] lg:w-[420px] shrink-0 border-r border-zinc-200/80 ${mobileTab === 'editor' ? 'flex' : 'hidden md:flex'}`}>
          {workPhase === 'site' && config.landingMode === 'external' ? (
            <>
              <div className="flex-1 scroll-container min-h-0">
                <div className="p-4 sm:p-5 pb-28 md:pb-6 space-y-4">
                  <div className="card p-4 sm:p-5 space-y-3">
                    <p className="text-[9px] font-black uppercase text-petrol tracking-wider">Adresse eintragen</p>
                    <p className="text-sm font-semibold text-navy leading-snug">
                      Kein Konfigurator nötig – einfach den Link pasten.
                    </p>
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="z. B. www.dein-laden.de oder instagram.com/…"
                      value={config.externalUrl || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setConfig((prev) => {
                          const normalized = toSafeHttpUrl(v);
                          const next: ModelConfig = { ...prev, externalUrl: v };
                          if (
                            normalized &&
                            (!prev.profileTitle || prev.profileTitle === DEFAULT_CONFIG.profileTitle)
                          ) {
                            next.profileTitle = hostnameFromUrl(normalized);
                          }
                          return next;
                        });
                      }}
                      className="w-full p-4 rounded-2xl border border-navy/10 text-sm bg-cream font-medium outline-none focus:border-petrol/40"
                    />
                    <p className="text-[10px] text-zinc-500 leading-snug">
                      Passt: Website, Instagram, Google-Profil, Shop, Buchungslink. Der Chip behält einen NUDAIM-Link – du kannst das Ziel später ändern.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void initiateSave()}
                    className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <ShoppingCart size={18} />
                    Fertig – bestellen
                  </button>
                  <button
                    type="button"
                    onClick={goToHardware}
                    className="w-full min-h-[44px] rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700"
                  >
                    ← Zurück zum Anhänger
                  </button>
                </div>
              </div>
            </>
          ) : workPhase === 'site' && digitalMode === 'assist' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="hidden sm:flex border-b border-zinc-100 bg-white px-3 py-2 gap-1">
                <button
                  type="button"
                  onClick={() => setDigitalMode('assist')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold ${digitalMode === 'assist' ? 'bg-petrol/10 text-petrol' : 'text-zinc-500'}`}
                >
                  Mithelfen lassen
                </button>
                <button
                  type="button"
                  onClick={() => setDigitalMode('manual')}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                >
                  Selbst anpassen
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="animate-spin text-petrol" size={24} />
                      <span className="text-sm">Assistent lädt…</span>
                    </div>
                  }
                >
                  <MicrositeChat
                    variant="panel"
                    config={config}
                    onApplyConfig={(next) => {
                      setConfig(next);
                      setPreviewType('digital');
                    }}
                    onContinueManual={() => setDigitalMode('manual')}
                    onContinueToHardware={goToHardware}
                    onContinueToOrder={() => void initiateSave()}
                  />
                </Suspense>
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
                  Mithelfen lassen
                </button>
                <button
                  type="button"
                  onClick={() => setDigitalMode('manual')}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-petrol/10 text-petrol"
                >
                  Selbst anpassen
                </button>
              </div>
              <div className="flex-1 scroll-container technical-grid-fine min-h-0">
                <div className="p-4 sm:p-5 pb-28 md:pb-6">
                  <Controls
                    activeDept="digital"
                    config={config}
                    setConfig={setConfig}
                    hasLogo={!!svgContent}
                    onUpload={handleFileUpload}
                    logoBusy={logoBusy}
                  />
                </div>
              </div>
              <footer className="hidden md:flex shrink-0 p-4 border-t border-zinc-200/80 bg-white flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500" htmlFor="order-qty-site">
                    Stückzahl
                  </label>
                  <input
                    id="order-qty-site"
                    type="number"
                    min={1}
                    max={MAX_ORDER_QUANTITY}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(clampOrderQuantity(e.target.value))}
                    className="w-20 h-9 px-2 rounded-lg border border-zinc-200 text-sm font-semibold text-navy text-center"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {liveSimple
                    ? 'Dieser Preis geht mit in die Shopify-Kasse (Draft Order).'
                    : bulkHintForQuantity(orderQuantity)}
                </p>
                <p className="text-sm font-semibold text-navy leading-snug">
                  {checkoutPrice.unitLabel}
                  {checkoutPrice.quantity > 1 ? ` · gesamt ${checkoutPrice.totalLabel}` : ''}
                </p>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {pricingHintForQuantity(selectedProductId, orderQuantity)}
                </p>
                <p className="text-[11px] text-zinc-500 leading-snug">{t('legal.preview.short')}</p>
                <button
                  type="button"
                  onClick={() => void initiateSave()}
                  className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <ShoppingCart size={18} />
                  {orderCtaLabel}
                </button>
                <button
                  type="button"
                  onClick={goToHardware}
                  className="w-full min-h-[44px] rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700"
                >
                  ← Zurück zum Anhänger
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
                      <p className="text-[11px] text-zinc-500 mt-2 leading-snug">
                        {filamentCustomerHint(selectedProductId)}
                      </p>
                    </div>
                  )}
                  <Controls
                    activeDept="3d"
                    config={config}
                    setConfig={setConfig}
                    hasLogo={!!svgContent}
                    logoPreviewUrl={logoPreviewUrl}
                    onUpload={handleFileUpload}
                    onClearLogo={() => setSvgContent(null)}
                    logoBusy={logoBusy}
                  />
                </div>
              </div>
              <footer className="hidden md:flex shrink-0 p-4 border-t border-zinc-200/80 bg-white flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500" htmlFor="order-qty-hw">
                    Stückzahl
                  </label>
                  <input
                    id="order-qty-hw"
                    type="number"
                    min={1}
                    max={MAX_ORDER_QUANTITY}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(clampOrderQuantity(e.target.value))}
                    className="w-20 h-9 px-2 rounded-lg border border-zinc-200 text-sm font-semibold text-navy text-center"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {liveSimple
                    ? 'Dieser Preis geht mit in die Shopify-Kasse (Draft Order).'
                    : bulkHintForQuantity(orderQuantity)}
                </p>
                <p className="text-sm font-semibold text-navy leading-snug">
                  {checkoutPrice.unitLabel}
                  {checkoutPrice.quantity > 1 ? ` · gesamt ${checkoutPrice.totalLabel}` : ''}
                </p>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {pricingHintForQuantity(selectedProductId, orderQuantity)}
                </p>
                <p className="text-[11px] text-zinc-500 leading-snug">{t('legal.preview.short')}</p>
                <button
                  type="button"
                  onClick={() => void initiateSave()}
                  className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <ShoppingCart size={18} />
                  {orderCtaLabel}
                </button>
                <button
                  type="button"
                  onClick={goToSite}
                  className="w-full min-h-[40px] text-xs font-semibold text-zinc-600 hover:text-navy"
                >
                  {t('cta.chip.optional')} →
                </button>
              </footer>
            </>
          )}
        </aside>

        <main className={`flex-1 relative z-10 min-h-0 bg-zinc-100 ${mobileTab === 'preview' ? 'flex flex-col' : 'hidden md:flex'}`}>
          <div className="flex-1 relative overflow-hidden min-h-[200px]">
            {workPhase === 'site' ? (
              <SitePreview
                config={config}
                googleLogoUrl={session?.user?.user_metadata?.avatar_url}
                label={config.landingMode === 'external' ? 'Ziel-Link für Kunden' : 'So sehen es deine Kunden'}
              />
            ) : (
              <KeychainPreview ref={viewerRef} config={config} svgContent={svgContent} />
            )}
            {workPhase === 'hardware' && logoHealth.level === 'warn' && logoHealth.message && (
              <div
                className="absolute left-3 right-3 bottom-3 md:left-6 md:right-auto md:max-w-md rounded-xl px-3 py-2 text-xs font-medium shadow-sm border bg-amber-50 border-amber-200 text-amber-950"
                role="status"
              >
                {logoHealth.message}
              </div>
            )}
          </div>
          <div className="md:hidden shrink-0 p-4 bg-white border-t border-zinc-200 safe-bottom">
            {workPhase === 'hardware' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500" htmlFor="order-qty-m">
                    Stückzahl
                  </label>
                  <input
                    id="order-qty-m"
                    type="number"
                    min={1}
                    max={MAX_ORDER_QUANTITY}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(clampOrderQuantity(e.target.value))}
                    className="w-20 h-9 px-2 rounded-lg border border-zinc-200 text-sm font-semibold text-navy text-center"
                  />
                </div>
                <p className="text-sm font-semibold text-navy leading-snug">
                  {checkoutPrice.unitLabel}
                  {checkoutPrice.quantity > 1 ? ` · gesamt ${checkoutPrice.totalLabel}` : ''}
                </p>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {liveSimple
                    ? 'Preis geht mit in die Shopify-Kasse.'
                    : pricingHintForQuantity(selectedProductId, orderQuantity)}
                </p>
                <p className="text-[11px] text-zinc-500 leading-snug">{t('legal.preview.short')}</p>
                <button
                  type="button"
                  onClick={() => void initiateSave()}
                  className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <ShoppingCart size={18} />
                  {orderCtaLabel}
                </button>
                <button
                  type="button"
                  onClick={goToSite}
                  className="w-full min-h-[40px] text-xs font-semibold text-zinc-600"
                >
                  {t('cta.chip.optional')} →
                </button>
                <LegalFooter compact className="pt-1" />
              </div>
            ) : (
              <button type="button" onClick={() => void initiateSave()} className="w-full min-h-[48px] bg-navy text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                <ShoppingCart size={18} />
                {orderCtaLabel}
              </button>
            )}
          </div>
          {savingStep !== 'idle' && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[600] flex flex-col items-center justify-center text-center px-6">
              <RefreshCw className="text-petrol animate-spin mb-4" size={40} />
              <p className="font-black uppercase tracking-wider text-navy text-sm">
                {SAVING_LABELS[savingStep] || 'Wird vorbereitet…'}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">Gleich geht’s zur Kasse</p>
            </div>
          )}
        </main>
      </div>

      <nav className="md:hidden flex h-16 bg-white border-t border-zinc-200 z-[600] shrink-0 pb-safe pt-1" role="tablist" aria-label="Hauptnavigation">
        <button type="button" role="tab" onClick={() => setMobileTab('editor')} className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 transition-colors ${mobileTab === 'editor' ? 'text-navy' : 'text-zinc-400'}`} aria-selected={mobileTab === 'editor'}>
          <Edit3 size={22} strokeWidth={mobileTab === 'editor' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold">{workPhase === 'hardware' ? 'Anhänger' : 'Chip-Link'}</span>
        </button>
        <button type="button" role="tab" onClick={() => setMobileTab('preview')} className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 transition-colors ${mobileTab === 'preview' ? 'text-navy' : 'text-zinc-400'}`} aria-selected={mobileTab === 'preview'}>
          <Smartphone size={22} strokeWidth={mobileTab === 'preview' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold">{workPhase === 'hardware' ? 'Vorschau' : 'Handy-Ansicht'}</span>
        </button>
      </nav>
      <div className="hidden md:block shrink-0 border-t border-zinc-100 bg-white px-4 py-2">
        <LegalFooter />
      </div>
    </div>
  );
};

export default ConfiguratorPage;
