
import * as THREE from 'three';

export type BaseType = 'nfec_standard';
export type MagicButtonType = 'stamp_card' | 'review' | 'wifi' | 'whatsapp' | 'custom_link' | 'action_card' | 'google_profile' | 'standard' | 'instagram' | 'tiktok' | 'linkedin' | 'booking' | 'email' | 'youtube' | 'phone';
export type NFCTemplate = 'modern' | 'minimal' | 'professional';
export type Department = '3d' | 'digital';
export type SavingStep = 'idle' | 'screenshot' | 'upload' | 'db' | 'done';

export type StampValidation = 'pattern' | 'long_press' | 'daily_limit' | 'qr_code';
export type ActionIcon = 'link' | 'globe' | 'shopping-cart' | 'info' | 'briefcase' | 'user' | 'star' | 'mail' | 'phone' | 'instagram' | 'utensils' | 'shield' | 'camera' | 'dumbbell' | 'heart' | 'cross' | 'zap' | 'map' | 'clock' | 'calendar' | 'home' | 'music' | 'hammer' | 'stethoscope' | 'youtube' | 'video';

export type FontStyle = 'luxury' | 'modern' | 'elegant' | 'display' | 'soft' | 'classic' | 'bold' | 'narrow' | 'hand';
export type ProfileTheme = 'light' | 'dark';
export type LayoutMode = 'stack' | 'landing';
/** Chip öffnet NUDAIM-Seite oder leitet auf eine eigene URL weiter. */
export type LandingMode = 'microsite' | 'external';

export interface NFCBlock {
  id: string;
  type: 'text' | 'image' | 'magic_button' | 'spacer' | 'headline' | 'map' | 'faq' | 'hours' | 'gallery' | 'prices';
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
    height?: number;
    address?: string;
    faqJson?: string;
    hoursText?: string;
    galleryUrls?: string;
    /** left | center | right */
    align?: 'left' | 'center' | 'right';
    /** Extra Abstand oben/unten in px */
    padY?: number;
    /** Mini-Seite: nur auf Kontakt, nur auf Start, oder automatisch */
    page?: 'home' | 'kontakt' | 'auto';
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
  /** Farbe der Platte (Kunststoff) */
  plateColor?: string;
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
  profileLogoUrl?: string;
  headerImageUrl?: string;
  accentColor: string;
  /** Seitenhintergrund der Microsite (Hex), optional */
  surfaceColor?: string;
  /** Fließtext-Farbe */
  textColor?: string;
  fontStyle: FontStyle;
  theme: ProfileTheme;
  /** stack = klassische Kacheln, landing = Mini-Website mit Hero/Sections */
  layoutMode?: LayoutMode;
  /** Sticky-Menü mit Ankern / Kontakt-Seite */
  navEnabled?: boolean;
  /** Favicon der öffentlichen Microsite (https) */
  faviconUrl?: string;
  /** microsite = Konfigurator-Seite, external = eigene Website/Instagram/Shop */
  landingMode?: LandingMode;
  /** Ziel-URL wenn landingMode === 'external' (http/https) */
  externalUrl?: string;
  /** Prägetext auf dem Anhänger (live in der Vorschau) */
  engraveText?: string;
  /** Anordnung Logo/Text */
  engraveLayout?: 'logo_only' | 'text_only' | 'logo_above' | 'text_above';
  /** Abstand Logo ↔ Text (0–100) */
  engraveGap?: number;
}

export interface SVGPathData {
  id: string;
  shapes: THREE.Shape[];
  color: string;
  currentColor: string;
  name: string;
}
