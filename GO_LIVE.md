# Go-Live – Überblick

Ziel jetzt: **Kunden können bestellen** (Shopify-Warenkorb).  
Unfertiges ist ausgeschaltet. Später: `VITE_FEATURES_FULL=1`.

---

## Starte hier (extrem detailliert)

### → [`GO_LIVE_SCHRITT_1_3.md`](GO_LIVE_SCHRITT_1_3.md)

Darin Klick-für-Klick:

1. **PR #1 mergen** (Code auf `main`)  
2. **Vercel Env** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) + Redeploy  
3. **Testbestellung** (Logo → Warenkorb)

Mach nur diese Datei. Nichts anderes parallel.

---

## Kundenpfad (wenn live)

1. Logo / Anhänger gestalten  
2. Stückzahl  
3. **In den Warenkorb** → `nudaim3d.de` Shopify-Cart  
4. Bezahlen im Shop  

---

## Minimum (Checkliste)

- [ ] PR #1 merged  
- [ ] Vercel Production: `VITE_SUPABASE_URL`  
- [ ] Vercel Production: `VITE_SUPABASE_ANON_KEY` (anon, nicht service_role)  
- [ ] Redeploy Ready  
- [ ] Eine Testbestellung landet im Cart  

**Nicht nötig für den ersten Erfolg:** Draft-Secrets, Webhook, Admin-Sync.

---

## Danach (erst wenn 1–3 grün)

1. Echte Variant-ID  
2. Webhook → Admin `paid` (`PHASE0_GO_LIVE.md`)  
3. Draft Orders / Staffelpreis  
4. Print-QC Alltag  

Siehe `PROFI_TODO.md`.
