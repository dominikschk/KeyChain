# AGENTS.md – NUDAIM / Keychain

Anweisungen für autonome Coding-Agents (Cursor Cloud & lokal).

## Produktprinzip

1. **Kernprodukt** ist der physische NFC-Schlüsselanhänger (3D / Logo-Prägung).
2. Microsite / CCP / Chip-Link sind **Zusatz**, nicht der Fokus.
3. Bei Feature-Arbeit: Anhänger zuerst (Logo-Upload, Prägung, Material, Bestellflow, Print/STL).

## Quellen der Wahrheit

| Datei | Rolle |
|-------|--------|
| [`TASKS.md`](TASKS.md) | Kurzfristiges Agent-Backlog (Priorität, Status) |
| [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md) | Jahres-Prioritäten Q1–Q4 |
| [`VORHABEN.md`](VORHABEN.md) | Produkt-Slices (Microsite etc.) |
| [`SECURITY_ISSUES.md`](SECURITY_ISSUES.md) | Security-Schuld & Deploy-Checkliste |

## Arbeitsablauf

1. `AGENTS.md`, `TASKS.md`, Roadmap lesen.
2. Höchste offene Aufgabe in `TASKS.md` wählen (P0 vor P1).
3. Feature-Branch: `cursor/<kurzbeschreibung>-da6f`.
4. Umsetzen, `npm run ci` grün halten.
5. Docs/Status in `TASKS.md` (und ggf. Roadmap) aktualisieren.
6. Commit, Push, PR.

## Qualitätsregeln

- UI-Texte: kurz, alltagssprachlich, nicht redundant; 3D-Druck-Disclaimer beachten (Vorschau unverbindlich, max. 3 Farben).
- Keine neuen offenen Writes ohne `write_token`.
- Keine Secrets committen; `.env.example` pflegen.
- Scope klein halten: eine abgeschlossene Q1-Scheibe pro Session.

## Lokale Checks

```bash
npm ci
npm run typecheck
npm run test
npm run build
# oder:
npm run ci
```
