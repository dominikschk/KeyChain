
import { ModelConfig } from './types';

// Shopify Warenkorb-Logik
export const SHOPIFY_CART_URL = 'https://nudaim3d.de/cart/add';
export const VARIANT_ID = '56564338262361';

export const DEFAULT_CONFIG: ModelConfig = {
  baseType: 'keychain',
  plateWidth: 45,
  plateHeight: 45,
  plateDepth: 4,
  logoScale: 1.0,
  logoDepth: 1.5,
  logoPosX: 0,
  logoPosY: 0,
  logoRotation: 0,
  logoColor: '#12A9E0',
  mirrorX: false,
  hasChain: true,
  eyeletPosX: 0,
  eyeletPosY: 20,
  nfcTemplate: 'modern',
  nfcBlocks: [
    {
      id: 'welcome',
      type: 'text',
      title: 'MEIN NFeC PROFIL',
      content: 'Willkommen auf meinem smarten Profil. Scanne den Chip für mehr Infos!'
    }
  ]
};
