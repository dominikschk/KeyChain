/**
 * Filament-/Material-Profile für physische Produkte (intern + Konfigurator-Hinweis).
 * Farben bleiben rechtlich unverbindlich – siehe LEGAL_COPY.md / MANUFACTURING_TOLERANCES.md.
 */

export type FilamentProfileId = 'pla_matte_keychain' | 'pla_matte_badge';

export interface FilamentProfile {
  id: FilamentProfileId;
  /** Kundenkurzname */
  label: string;
  /** Intern für Druckerei */
  material: string;
  nozzleMm: number;
  layerHeightMm: number;
  /** Empfohlene Plattenfarben (Hex) */
  plateColors: string[];
  /** Empfohlene Logo-/Prägefarbton-Hinweise */
  printColors: string[];
  notes: string;
}

export const FILAMENT_PROFILES: Record<FilamentProfileId, FilamentProfile> = {
  pla_matte_keychain: {
    id: 'pla_matte_keychain',
    label: 'PLA matt (Schlüsselanhänger)',
    material: 'PLA matt',
    nozzleMm: 0.4,
    layerHeightMm: 0.16,
    plateColors: [
      '#F8F5F0',
      '#FFFFFF',
      '#2A2A2A',
      '#7EB8E8',
      '#11235A',
      '#12A9E0',
      '#D6C3A8',
      '#6B4A2E',
      '#1F4D3A',
      '#A8D83A',
      '#E85D04',
      '#FF4D4D',
    ],
    printColors: ['#111111', '#FFFFFF', '#11235A', '#12A9E0', '#d4af37'],
    notes: 'Kleine Fläche – feine Schichtstärke. Max. 3 Logo-Farben im Druck.',
  },
  pla_matte_badge: {
    id: 'pla_matte_badge',
    label: 'PLA matt (Messe-Badge)',
    material: 'PLA matt',
    nozzleMm: 0.4,
    layerHeightMm: 0.2,
    plateColors: ['#F8F5F0', '#FFFFFF', '#11235A', '#2A2A2A'],
    printColors: ['#111111', '#FFFFFF', '#11235A', '#d4af37'],
    notes: 'Größere Platte – etwas höhere Schicht möglich. Logo weiterhin max. 3 Farben.',
  },
};

/** Mapping Produkt-ID → Profil */
export const PRODUCT_FILAMENT: Record<string, FilamentProfileId> = {
  keychain: 'pla_matte_keychain',
  badge: 'pla_matte_badge',
};

export function filamentForProduct(productId: string): FilamentProfile {
  const id = PRODUCT_FILAMENT[productId] || 'pla_matte_keychain';
  return FILAMENT_PROFILES[id];
}

/** Kurzer Hinweis für den Konfigurator (Alltagssprache). */
export function filamentCustomerHint(productId: string): string {
  const p = filamentForProduct(productId);
  return `${p.label}: so wirkt’s ungefähr – der echte Druck kann etwas anders aussehen.`;
}
