import { ModelConfig } from './types';

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
export const PRODUCTS: ShopifyProduct[] = [
  { id: 'keychain', name: 'Schlüsselanhänger', variantId: '56564338262361', plateWidthMm: 40, plateHeightMm: 40 },
  { id: 'badge', name: 'Messe-Badge', variantId: '56564338262361', plateWidthMm: 110, plateHeightMm: 150 }, // 150 mm lang, 110 mm breit – echte Variant-ID eintragen
];

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
  writeToken?: string
): string {
  const origin = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  const params: Record<string, string> = {
    id: variantId,
    quantity: '1',
    'properties[Config-ID]': shortId,
    'properties[Preview]': previewImageUrl,
  };
  if (origin) {
    const micrositeUrl = buildMicrositeUrl(origin, shortId);
    // Öffentlich: ohne write_token
    params['properties[Microsite-URL]'] = micrositeUrl;
    params['properties[Handy-Seite]'] = micrositeUrl;
    // Edit-Capability: _CCP-URL (Warenkorb oft versteckt) + Bearbeiten-Link (sichtbar in Order/Mail)
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
