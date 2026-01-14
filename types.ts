
import * as THREE from 'three';

export type BaseType = 'keychain' | 'circle' | 'rect' | 'custom';
export type MagicButtonType = 'stamp_card' | 'review' | 'vcard' | 'social_loop' | 'wifi' | 'standard';
export type NFCTemplate = 'modern' | 'minimal' | 'professional';
export type Department = '3d' | 'digital';
export type SavingStep = 'idle' | 'screenshot' | 'upload' | 'db' | 'done';

export type StampValidation = 'pattern' | 'long_press' | 'daily_limit' | 'qr_code';

export interface NFCBlock {
  id: string;
  type: 'text' | 'image' | 'magic_button' | 'spacer';
  content: string;
  title?: string;
  buttonType?: MagicButtonType;
  imageUrl?: string;
  link?: string;
  settings?: {
    slots?: number;
    validationType?: StampValidation;
    secretPattern?: string;
    secretKey?: string; // For QR Code validation
    rewardText?: string;
    ssid?: string;
    password?: string;
    googleMapsUrl?: string;
    instagram?: string;
    linkedin?: string;
    name?: string;
    phone?: string;
  };
}

export interface ModelConfig {
  baseType: BaseType;
  plateWidth: number;
  plateHeight: number;
  plateDepth: number;
  logoScale: number;
  logoDepth: number;
  logoPosX: number;
  logoPosY: number;
  logoRotation: number;
  logoColor: string;
  mirrorX: boolean;
  hasChain: boolean;
  eyeletPosX: number;
  eyeletPosY: number;
  // NFC Department
  nfcTemplate: NFCTemplate;
  nfcBlocks: NFCBlock[];
  shopifyUrl?: string;
}

export interface SVGPathData {
  id: string;
  shapes: THREE.Shape[];
  color: string;
  currentColor: string;
  name: string;
}
