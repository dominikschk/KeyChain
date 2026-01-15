
import { ModelConfig } from './types';

export const SHOPIFY_CART_URL = 'https://nudaim3d.de/cart/add';
export const VARIANT_ID = '56564338262361';

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
  profileTitle: 'DEINE BRAND',
  profileIcon: 'briefcase',
  accentColor: '#006699',
  fontStyle: 'luxury',
  theme: 'light',
  nfcBlocks: [
    {
      id: 'welcome',
      type: 'text',
      title: 'WILLKOMMEN',
      content: 'Verbinde dich mit uns! Scanne diesen Tag für alle Links.'
    }
  ]
};
