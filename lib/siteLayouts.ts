/**
 * Landing-Layouts & Branchen-Vorlagen für die Microsite (weg vom reinen Kachel-Stack).
 */
import type { FontStyle, ModelConfig, NFCBlock } from '../types';
import { generateSecureKey } from './utils';
import { paletteForIndustry, type BrandPalette } from './brandPalette';

export type LayoutMode = 'stack' | 'landing';

export interface SiteTemplate {
  id: string;
  name: string;
  industry: string;
  blurb: string;
  apply: () => Partial<ModelConfig>;
}

/** Google-Font CSS-Klassen + Link-Familien */
export const SITE_FONTS: Record<
  FontStyle,
  { label: string; className: string; family: string }
> = {
  luxury: { label: 'Edel (Serif)', className: 'font-site-luxury', family: 'Fraunces' },
  modern: { label: 'Modern (Sans)', className: 'font-site-modern', family: 'Outfit' },
  elegant: { label: 'Elegant', className: 'font-site-elegant', family: 'Cormorant Garamond' },
  display: { label: 'Display', className: 'font-site-display', family: 'Playfair Display' },
  soft: { label: 'Freundlich', className: 'font-site-soft', family: 'Nunito' },
  classic: { label: 'Klassisch', className: 'font-site-classic', family: 'Lora' },
  bold: { label: 'Kräftig', className: 'font-site-bold', family: 'Montserrat' },
  narrow: { label: 'Schmal', className: 'font-site-narrow', family: 'Oswald' },
  hand: { label: 'Handschrift', className: 'font-site-hand', family: 'Caveat' },
};

export function fontClassFor(style: FontStyle | undefined): string {
  return SITE_FONTS[style || 'modern']?.className ?? SITE_FONTS.modern.className;
}

function bid(): string {
  return crypto.randomUUID();
}

function withPalette(p: BrandPalette, extra: Partial<ModelConfig>): Partial<ModelConfig> {
  return {
    accentColor: p.accent,
    surfaceColor: p.surface,
    theme: p.theme,
    fontStyle: p.font,
    profileIcon: p.icon,
    layoutMode: 'landing',
    textColor: p.theme === 'dark' ? '#F5F5F4' : '#1C1917',
    ...extra,
  };
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'bakery',
    name: 'Bäckerei',
    industry: 'bakery',
    blurb: 'Warm, einladend, mit Kontakt & Öffnungszeiten-Feeling',
    apply: () =>
      withPalette(paletteForIndustry('bakery'), {
        profileTitle: 'Bäckerei Müller',
        fontStyle: 'elegant',
        nfcBlocks: [
          { id: bid(), type: 'headline', title: 'Frisch jeden Morgen', content: '' },
          {
            id: bid(),
            type: 'text',
            title: 'Unsere Handwerkskunst',
            content: 'Brot, Brötchen und Feingebäck – täglich aus dem Ofen. Schau vorbei oder schreib uns.',
          },
          { id: bid(), type: 'magic_button', buttonType: 'whatsapp', title: 'WhatsApp', content: '' },
          { id: bid(), type: 'magic_button', buttonType: 'instagram', title: 'Instagram', content: '' },
          { id: bid(), type: 'magic_button', buttonType: 'phone', title: 'Anrufen', content: '' },
          {
            id: bid(),
            type: 'map',
            title: 'Standort',
            content: '',
            settings: { address: 'Hauptstraße 1, 12345 Musterstadt' },
          },
        ],
      }),
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    industry: 'gastro',
    blurb: 'Tisch reservieren, Speisekarte, Bewertungen',
    apply: () =>
      withPalette(paletteForIndustry('gastro'), {
        profileTitle: 'Gasthaus Linden',
        fontStyle: 'display',
        nfcBlocks: [
          { id: bid(), type: 'headline', title: 'Willkommen zu Tisch', content: '' },
          {
            id: bid(),
            type: 'text',
            title: 'Küche & Atmosphäre',
            content: 'Saisonale Gerichte, gute Weine und ein ruhiger Abend – für dich und deine Gäste.',
          },
          { id: bid(), type: 'magic_button', buttonType: 'booking', title: 'Tisch reservieren', content: 'https://' },
          { id: bid(), type: 'magic_button', buttonType: 'custom_link', title: 'Speisekarte', content: 'https://', settings: { icon: 'utensils' } },
          { id: bid(), type: 'magic_button', buttonType: 'review', title: 'Bewerten', content: '' },
          { id: bid(), type: 'magic_button', buttonType: 'whatsapp', title: 'WhatsApp', content: '' },
        ],
      }),
  },
  {
    id: 'studio',
    name: 'Studio / Kreativ',
    industry: 'creative',
    blurb: 'Portfolio-Feeling mit Social & Kontakt',
    apply: () =>
      withPalette(paletteForIndustry('creative'), {
        profileTitle: 'Atelier Nord',
        fontStyle: 'modern',
        nfcBlocks: [
          { id: bid(), type: 'headline', title: 'Ideen, die man anfassen kann', content: '' },
          {
            id: bid(),
            type: 'text',
            title: 'Was wir machen',
            content: 'Design, Fotografie und Markenauftritt – klar, modern und mit Persönlichkeit.',
          },
          { id: bid(), type: 'magic_button', buttonType: 'instagram', title: 'Arbeiten ansehen', content: '' },
          { id: bid(), type: 'magic_button', buttonType: 'custom_link', title: 'Website', content: 'https://', settings: { icon: 'globe' } },
          { id: bid(), type: 'magic_button', buttonType: 'email', title: 'Projekt anfragen', content: '' },
          {
            id: bid(),
            type: 'magic_button',
            buttonType: 'action_card',
            title: 'Kontakt',
            content: '',
            settings: { name: 'Atelier Nord', description: 'Creative Studio', icon: 'camera' },
          },
        ],
      }),
  },
  {
    id: 'fitness',
    name: 'Fitness',
    industry: 'fitness',
    blurb: 'Energie, Probetraining, Stempelkarte',
    apply: () =>
      withPalette(paletteForIndustry('fitness'), {
        profileTitle: 'Iron Gym',
        fontStyle: 'soft',
        nfcBlocks: [
          { id: bid(), type: 'headline', title: 'No excuses. Just train.', content: '' },
          {
            id: bid(),
            type: 'text',
            title: 'Dein Training',
            content: 'Geräte, Kurse und Coaches – starte mit einem Probetraining oder frag deinen Coach.',
          },
          { id: bid(), type: 'magic_button', buttonType: 'booking', title: 'Probetraining', content: 'https://' },
          { id: bid(), type: 'magic_button', buttonType: 'whatsapp', title: 'Coach fragen', content: '' },
          {
            id: bid(),
            type: 'magic_button',
            buttonType: 'stamp_card',
            title: 'Stempelkarte',
            content: '',
            settings: { slots: 10, secretKey: generateSecureKey() },
          },
          { id: bid(), type: 'magic_button', buttonType: 'instagram', title: 'Instagram', content: '' },
        ],
      }),
  },
  {
    id: 'wellness',
    name: 'Wellness',
    industry: 'wellness',
    blurb: 'Ruhig, hell, Termin & Bonus',
    apply: () =>
      withPalette(paletteForIndustry('wellness'), {
        profileTitle: 'Zen Studio',
        fontStyle: 'elegant',
        nfcBlocks: [
          { id: bid(), type: 'headline', title: 'Deine Auszeit', content: '' },
          {
            id: bid(),
            type: 'text',
            title: 'Entspannung',
            content: 'Massagen, Rituale und ruhige Räume – buche deinen Termin oder hol dir die Bonus-Karte.',
          },
          { id: bid(), type: 'magic_button', buttonType: 'booking', title: 'Termin buchen', content: 'https://' },
          {
            id: bid(),
            type: 'magic_button',
            buttonType: 'stamp_card',
            title: 'Bonus-Karte',
            content: '',
            settings: { slots: 10, secretKey: generateSecureKey() },
          },
          {
            id: bid(),
            type: 'map',
            title: 'Standort',
            content: '',
            settings: { address: 'Wellness Allee 5, 10115 Berlin' },
          },
        ],
      }),
  },
  {
    id: 'realestate',
    name: 'Immobilien',
    industry: 'realestate',
    blurb: 'Klar, vertrauenswürdig, Direktkontakt',
    apply: () =>
      withPalette(paletteForIndustry('realestate'), {
        profileTitle: 'Prime Estates',
        fontStyle: 'luxury',
        nfcBlocks: [
          { id: bid(), type: 'headline', title: 'Dein neues Zuhause', content: '' },
          {
            id: bid(),
            type: 'text',
            title: 'Objekte & Beratung',
            content: 'Aktuelle Angebote und persönliche Beratung – schreib uns oder ruf direkt an.',
          },
          {
            id: bid(),
            type: 'magic_button',
            buttonType: 'action_card',
            title: 'Makler kontaktieren',
            content: '',
            settings: { name: 'Sarah Schmidt', description: 'Senior Consultant', icon: 'home' },
          },
          { id: bid(), type: 'magic_button', buttonType: 'whatsapp', title: 'Direktanfrage', content: '' },
          { id: bid(), type: 'magic_button', buttonType: 'google_profile', title: 'Unser Büro', content: '' },
        ],
      }),
  },
];

export function splitBlocksForLanding(blocks: NFCBlock[]): {
  heroLine?: NFCBlock;
  stories: NFCBlock[];
  actions: NFCBlock[];
  extras: NFCBlock[];
} {
  const list = blocks || [];
  const heroLine = list.find((b) => b.type === 'headline');
  const stories = list.filter((b) => b.type === 'text' || b.type === 'image');
  const actions = list.filter((b) => b.type === 'magic_button');
  const extras = list.filter(
    (b) =>
      b.type === 'map' ||
      b.type === 'spacer' ||
      b.type === 'faq' ||
      b.type === 'hours' ||
      b.type === 'gallery' ||
      b.type === 'prices'
  );
  return { heroLine, stories, actions, extras };
}

export function ensureLandingDefaults(config: ModelConfig): ModelConfig {
  return {
    ...config,
    layoutMode: config.layoutMode || 'landing',
    textColor: config.textColor || (config.theme === 'dark' ? '#F5F5F4' : '#1C1917'),
    surfaceColor: config.surfaceColor || (config.theme === 'dark' ? '#0C0A09' : '#F8F5F0'),
  };
}
