
import * as THREE from 'three';

export type BaseType = 'nfec_standard';
export type MagicButtonType = 'stamp_card' | 'review' | 'wifi' | 'whatsapp' | 'custom_link' | 'action_card' | 'google_profile' | 'standard' | 'instagram';
export type NFCTemplate = 'modern' | 'minimal' | 'professional';
export type Department = '3d' | 'digital';
export type SavingStep = 'idle' | 'screenshot' | 'upload' | 'db' | 'done';

export type StampValidation = 'pattern' | 'long_press' | 'daily_limit' | 'qr_code';
export type ActionIcon = 'link' | 'globe' | 'shopping-cart' | 'info' | 'briefcase' | 'user' | 'star' | 'mail' | 'phone' | 'instagram' | 'utensils' | 'shield' | 'camera' | 'dumbbell' | 'heart' | 'cross' | 'zap' | 'map' | 'clock' | 'calendar';

export type FontStyle = 'luxury' | 'modern' | 'elegant';
export type ProfileTheme = 'light' | 'dark';

export interface NFCBlock {
  id: string;
  type: 'text' | 'image' | 'magic_button' | 'spacer' | 'headline' | 'map';
  content: string;
  title?: string;
  buttonType?: MagicButtonType;
  imageUrl?: string;
  link?: string;
  settings?: {
    slots?: number;
    validationType?: StampValidation;
    secretPattern?: string;
    secretKey?: string;
    rewardText?: string;
    ssid?: string;
    password?: string;
    googleMapsUrl?: string;
    instagram?: string;
    linkedin?: string;
    name?: string;
    phone?: string;
    message?: string;
    icon?: ActionIcon;
    buttonLabel?: string;
    description?: string;
    height?: number; // for spacer
    address?: string; // for map
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
  nfcTemplate: NFCTemplate;
  nfcBlocks: NFCBlock[];
  shopifyUrl?: string;
  // Digital Profile Customization
  profileTitle: string;
  profileIcon: ActionIcon;
  headerImageUrl?: string;
  accentColor: string;
  fontStyle: FontStyle;
  theme: ProfileTheme;
}

export interface SVGPathData {
  id: string;
  shapes: THREE.Shape[];
  color: string;
  currentColor: string;
  name: string;
}
