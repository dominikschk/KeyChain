
import { ModelConfig } from './types';

export const SHOPIFY_CART_URL = 'https://nudaim3d.de/cart/add';
export const VARIANT_ID = '56564338262361';

/** Builds the Shopify cart add URL with config ID, preview image and optional Microsite-URL. */
export function buildShopifyCartUrl(shortId: string, previewImageUrl: string, baseUrl?: string): string {
  const params: Record<string, string> = {
    id: VARIANT_ID,
    quantity: '1',
    'properties[Config-ID]': shortId,
    'properties[Preview]': previewImageUrl,
  };
  if (baseUrl) {
    params['properties[Microsite-URL]'] = `${baseUrl.replace(/\/$/, '')}/?id=${encodeURIComponent(shortId)}`;
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
  fontStyle: 'luxury',
  theme: 'light',
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
