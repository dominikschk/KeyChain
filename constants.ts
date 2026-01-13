
import { ModelConfig } from './types';

export const DEFAULT_CONFIG: ModelConfig = {
  baseType: 'keychain',
  plateWidth: 45,
  plateHeight: 45,
  plateDepth: 4,
  logoScale: 0.6,
  logoDepth: 2,
  logoPosX: 0,
  logoPosY: 0,
  logoRotation: 0,
  logoColor: '#12A9E0',
  mirrorX: false,
  hasChain: true,
  eyeletPosX: 0,
  eyeletPosY: 22,
  nfcTemplate: 'modern',
  shopifyUrl: 'https://dein-shop.myshopify.com',
  nfcBlocks: [
    {
      id: 'welcome',
      type: 'text',
      title: 'Willkommen!',
      content: 'Scanne diesen Chip für exklusive Vorteile.'
    },
    {
      id: 'stamps',
      type: 'magic_button',
      buttonType: 'stamp_card',
      content: 'Deine Treuepunkte',
      settings: { currentStamps: 3, slots: 10 }
    }
  ]
};
