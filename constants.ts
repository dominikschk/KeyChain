
import { ModelConfig } from './types';

// GLOBAL BUSINESS CONFIG
export const SHOPIFY_BASE_URL = 'https://nudaim3d.de';

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
  nfcBlocks: [
    {
      id: 'welcome',
      type: 'text',
      title: 'NUDAIM NFeC SMART CHIP',
      content: 'Willkommen in der Zukunft des 3D-Drucks. Dein physisches Produkt ist nun mit diesem digitalen Profil verknüpft.'
    },
    {
      id: 'social',
      type: 'magic_button',
      buttonType: 'social_loop',
      title: 'COMMUNITY',
      content: 'Folge uns auf Instagram für Updates zu neuen Drops.'
    }
  ]
};
