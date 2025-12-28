import { ModelConfig } from './types';

export const DEFAULT_CONFIG: ModelConfig = {
  plateWidth: 45,
  plateHeight: 45,
  plateDepth: 4,
  logoScale: 0.6,
  logoDepth: 2,
  logoPosX: 0,
  logoPosY: 0,
  logoRotation: 0,
  logoColor: '#3b82f6',
  wallThickness: 1.6,
  isHollow: false,
  mirrorX: false,
  hasChain: true,
  customLink: '', // Standardmäßig leer
};

export const MIN_LOGO_SCALE = 0.01;
export const MAX_LOGO_SCALE = 5.0;
export const MAX_LOGO_DEPTH = 30;
export const MAX_WALL_THICKNESS = 10;