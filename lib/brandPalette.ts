/**
 * Marken-Paletten: Farben sollen zur Branche / Stimmung passen (nicht immer Tech-Dunkel).
 */
import type { ActionIcon, FontStyle, ProfileTheme } from '../types';

export interface BrandPalette {
  accent: string;
  theme: ProfileTheme;
  font: FontStyle;
  icon: ActionIcon;
  /** Seitenhintergrund (hell = warm/cremig, dunkel = charcoal) */
  surface: string;
  label: string;
}

const PALETTES: Record<string, BrandPalette> = {
  bakery: {
    accent: '#8B5E3C',
    theme: 'light',
    font: 'elegant',
    icon: 'utensils',
    surface: '#F6EFE6',
    label: 'Bäckerei / warm',
  },
  gastro: {
    accent: '#9A3412',
    theme: 'light',
    font: 'elegant',
    icon: 'utensils',
    surface: '#FFF7ED',
    label: 'Gastronomie',
  },
  fitness: {
    accent: '#EA580C',
    theme: 'light',
    font: 'modern',
    icon: 'dumbbell',
    surface: '#FFF7ED',
    label: 'Fitness',
  },
  realestate: {
    accent: '#1E3A5F',
    theme: 'light',
    font: 'luxury',
    icon: 'home',
    surface: '#F1F5F9',
    label: 'Immobilien',
  },
  wellness: {
    accent: '#6B7280',
    theme: 'light',
    font: 'elegant',
    icon: 'heart',
    surface: '#F8FAFC',
    label: 'Wellness',
  },
  creative: {
    accent: '#BE123C',
    theme: 'light',
    font: 'modern',
    icon: 'camera',
    surface: '#FFF1F2',
    label: 'Kreativ',
  },
  craft: {
    accent: '#B45309',
    theme: 'light',
    font: 'modern',
    icon: 'hammer',
    surface: '#FFFBEB',
    label: 'Handwerk',
  },
  tech: {
    accent: '#0EA5E9',
    theme: 'light',
    font: 'modern',
    icon: 'globe',
    surface: '#F0F9FF',
    label: 'Modern / Tech',
  },
  dark_luxe: {
    accent: '#D4AF37',
    theme: 'dark',
    font: 'luxury',
    icon: 'star',
    surface: '#0C0A09',
    label: 'Dunkel & edel',
  },
  nature: {
    accent: '#047857',
    theme: 'light',
    font: 'modern',
    icon: 'zap',
    surface: '#ECFDF5',
    label: 'Natur / frisch',
  },
  beauty: {
    accent: '#BE185D',
    theme: 'light',
    font: 'elegant',
    icon: 'camera',
    surface: '#FDF2F8',
    label: 'Beauty',
  },
  default: {
    accent: '#11235A',
    theme: 'light',
    font: 'luxury',
    icon: 'briefcase',
    surface: '#F8F5F0',
    label: 'Klassisch',
  },
};

export function paletteForIndustry(industry: string): BrandPalette {
  switch (industry) {
    case 'bakery':
      return PALETTES.bakery;
    case 'gastro':
      return PALETTES.gastro;
    case 'fitness':
      return PALETTES.fitness;
    case 'realestate':
      return PALETTES.realestate;
    case 'wellness':
      return PALETTES.wellness;
    case 'creative':
      return PALETTES.creative;
    case 'craft':
      return PALETTES.craft;
    default:
      return PALETTES.default;
  }
}

export function paletteForVibe(vibe: string): BrandPalette | null {
  const t = vibe.toLowerCase();
  if (/bäck|baeck|brot|café|cafe|backstube/.test(t)) return PALETTES.bakery;
  if (/dunkel|dark|nacht|schwarz|edel|luxus/.test(t)) return PALETTES.dark_luxe;
  if (/warm|holz|natur|beige|terra|gemütlich|rustikal/.test(t)) return PALETTES.bakery;
  if (/frisch|grün|öko|bio/.test(t)) return PALETTES.nature;
  if (/sport|kraft|orange|energie/.test(t)) return PALETTES.fitness;
  if (/blau|tech|modern|clean|minimal/.test(t)) return PALETTES.tech;
  if (/rosa|pink|beauty|glam/.test(t)) return PALETTES.beauty;
  if (/restaurant|gastro|essen|küche/.test(t)) return PALETTES.gastro;
  return null;
}

/** Hintergrundfarbe für Microsite – Fallback aus Theme + Accent. */
export function resolveSurface(theme: ProfileTheme, accent: string, surface?: string | null): string {
  if (surface && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(surface)) return surface;
  if (theme === 'dark') return '#0C0A09';
  // leichte Cremigkeit statt reines Schwarz/Tech
  return '#F8F5F0';
}

/** Button-Farben aus Markenfarbe (kohärent, kein Regenbogen). */
export function brandButtonStyle(accent: string, isDark: boolean): { bg: string; fg: string; border: string; muted: string } {
  if (isDark) {
    return {
      bg: 'rgba(255,255,255,0.08)',
      fg: '#fff',
      border: 'rgba(255,255,255,0.12)',
      muted: 'rgba(255,255,255,0.55)',
    };
  }
  return {
    bg: `${accent}14`,
    fg: accent,
    border: `${accent}22`,
    muted: `${accent}99`,
  };
}

export { PALETTES };
