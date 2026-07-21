import { ModelConfig } from './types';
import { MAX_ORDER_QUANTITY } from './lib/bulkOrder';

export const SHOPIFY_CART_URL = 'https://nudaim3d.de/cart/add';
/** Link zu Bestellungen im Shopify Admin (Order-ID anhängen: /admin/orders/ORDER_ID) */
export const SHOPIFY_ADMIN_ORDERS_URL = 'https://nudaim3d.de/admin/orders';

/** Produkte für den Konfigurator (Variant-ID aus Shopify). Optionale Maße in mm (plateWidth × plateHeight). */
export interface ShopifyProduct {
  id: string;
  name: string;
  variantId: string;
  /** Breite in mm (für 3D-Platte). */
  plateWidthMm?: number;
  /** Länge/Höhe in mm (für 3D-Platte). */
  plateHeightMm?: number;
}

function envVariant(key: string, fallback: string): string {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[key]?.trim();
    return v && /^\d+$/.test(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

/** Fallback-IDs – echte Badge-ID per VITE_SHOPIFY_VARIANT_BADGE setzen. */
const ALL_PRODUCTS: ShopifyProduct[] = [
  {
    id: 'keychain',
    name: 'Schlüsselanhänger',
    variantId: envVariant('VITE_SHOPIFY_VARIANT_KEYCHAIN', '56564338262361'),
    plateWidthMm: 40,
    plateHeightMm: 40,
  },
  {
    id: 'badge',
    name: 'Messe-Badge',
    variantId: envVariant('VITE_SHOPIFY_VARIANT_BADGE', '56564338262361'),
    plateWidthMm: 110,
    plateHeightMm: 150,
  },
];

function featuresFullFromEnv(): boolean {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_FEATURES_FULL;
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

/**
 * Live-Shop: nur Schlüsselanhänger (Badge erst mit echter Variant-ID + VITE_FEATURES_FULL=1).
 */
export const PRODUCTS: ShopifyProduct[] = featuresFullFromEnv()
  ? ALL_PRODUCTS
  : ALL_PRODUCTS.filter((p) => p.id === 'keychain');

/** Öffentliche Microsite-URL (ohne Token). */
export function buildMicrositeUrl(origin: string, shortId: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/?id=${encodeURIComponent(shortId)}`;
}

/** CCP-Edit-URL mit Write-Token. */
export function buildCcpEditUrl(origin: string, shortId: string, writeToken: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/ccp?id=${encodeURIComponent(shortId)}&t=${encodeURIComponent(writeToken)}`;
}

/** Builds the Shopify cart add URL with variant ID, config ID, preview image and Microsite/CCP URLs. */
export function buildShopifyCartUrl(
  variantId: string,
  shortId: string,
  previewImageUrl: string,
  baseUrl?: string,
  writeToken?: string,
  /** Optional: echte Ziel-URL bei „eigene Website“ (Chip bleibt trotzdem NUDAIM-Shortlink). */
  destinationUrl?: string,
  quantity: number = 1,
  /**
   * Optionaler Text in den Line-Item-Properties.
   * Ändert den abgerechneten Betrag NICHT – Shopify nutzt immer den Katalogpreis der Variante.
   * Für Live-Cart besser weglassen (sonst steht z. B. „1,00 €“ neben „1,50 €“).
   */
  priceHint?: string
): string {
  const qty = Math.min(MAX_ORDER_QUANTITY, Math.max(1, Math.round(Number(quantity) || 1)));
  const origin = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  const params: Record<string, string> = {
    id: variantId,
    quantity: String(qty),
    'properties[Config-ID]': shortId,
    'properties[Preview]': previewImageUrl,
  };
  if (priceHint?.trim()) {
    params['properties[Preis]'] = priceHint.trim().slice(0, 255);
  }
  if (origin) {
    const micrositeUrl = buildMicrositeUrl(origin, shortId);
    // Eine sichtbare Property (deutsch) – kein zweites Synonym im Checkout
    params['properties[Handy-Seite]'] = micrositeUrl;
    if (destinationUrl?.trim()) {
      params['properties[Ziel-URL]'] = destinationUrl.trim();
    }
    // Edit: _CCP-URL oft im Warenkorb versteckt; Bearbeiten-Link sichtbar in Order/Mail
    if (writeToken && writeToken.length >= 32) {
      const ccpUrl = buildCcpEditUrl(origin, shortId, writeToken);
      params['properties[_CCP-URL]'] = ccpUrl;
      params['properties[Bearbeiten-Link]'] = ccpUrl;
    }
  }
  return `${SHOPIFY_CART_URL}?${new URLSearchParams(params).toString()}`;
}

export const DEFAULT_CONFIG: ModelConfig = {
  baseType: 'nfec_standard',
  plateWidth: 40,
  plateHeight: 40,
  plateDepth: 4,
  logoScale: 1.0,
  logoDepth: 1.5,
  logoPosX: 0,
  logoPosY: -2,
  logoRotation: 0,
  logoColor: '#12A9E0',
  plateColor: '#F8F5F0',
  mirrorX: false,
  hasChain: true,
  eyeletPosX: -20,
  eyeletPosY: 20,
  nfcTemplate: 'modern',
  profileTitle: 'NUDAIM STUDIO',
  profileIcon: 'briefcase',
  accentColor: '#11235A',
  surfaceColor: '#F8F5F0',
  textColor: '#1C1917',
  fontStyle: 'modern',
  theme: 'light',
  layoutMode: 'landing',
  navEnabled: true,
  faviconUrl: '',
  landingMode: 'microsite',
  externalUrl: '',
  engraveText: '',
  engraveLayout: 'logo_above',
  engraveGap: 40,
  nfcBlocks: [
    { 
      id: 'sb1', 
      type: 'headline', 
      content: 'Willkommen', 
      title: 'Entdecke mehr' 
    },
    { 
      id: 'sb2', 
      type: 'magic_button', 
      buttonType: 'action_card', 
      title: 'Kontakt sichern', 
      content: '',
      settings: {
        name: 'Max Mustermann',
        description: 'Geschäftsführer',
        phone: '+49 123 456789'
      }
    },
    { 
      id: 'sb3', 
      type: 'magic_button', 
      buttonType: 'instagram', 
      title: 'Folge uns', 
      content: 'nudaim3d' 
    },
    { 
      id: 'sb4', 
      type: 'magic_button', 
      buttonType: 'custom_link', 
      title: 'Unsere Webseite', 
      content: 'https://nudaim3d.de', 
      settings: { icon: 'globe' } 
    }
  ]
};
