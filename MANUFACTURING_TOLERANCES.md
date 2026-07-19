# Fertigung: Material & Farbtoleranzen (intern)

Stand: 2026-07-19  
Für Druckerei und Support. Kunden-Rechtstexte bleiben in [`LEGAL_COPY.md`](LEGAL_COPY.md).

## Prinzip

- Bildschirmvorschau = Orientierung, **nicht** farbverbindlich.
- Logos im Druck: **höchstens 3 Farben**.
- Raster-Logos → Print-PNG (vereinfacht); STL oft nur Platte.
- Vektor-SVG → STL kann Logo-Geometrie enthalten.

## Profile (Code: `lib/filamentProfiles.ts`)

| Produkt | Material | Düse | Schicht | Hinweis |
|---------|----------|------|---------|---------|
| Schlüsselanhänger | PLA matt | 0,4 mm | ~0,16 mm | kleine Fläche, fein |
| Messe-Badge | PLA matt | 0,4 mm | ~0,2 mm | größere Platte |

## Toleranzen (Richtwerte)

- Farbtonabweichung gegenüber Monitor: normal / erwartet.
- Kanten und Prägetiefe können je nach Charge leicht variieren.
- Bei QC-Ablehnung: Reprint-Grund im Admin setzen (Metrik).

## Print-QC

1. Side-by-Side: Kunden-Vorschau vs. Print-PNG  
2. Freigabe → Status oft `in_production`  
3. SLA-Ziel: Start innerhalb 48h nach `paid` (Admin zeigt Überziehung)

## Assets pro Order

- **Print-PNG** – druckfertig (wenn Raster/Pipeline geliefert)
- **STL** – Geometrie für den Drucker
- CSV-Export / STL-URL-Liste aus Admin
