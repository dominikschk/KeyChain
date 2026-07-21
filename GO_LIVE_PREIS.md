# Preise anpassen (NFC-Preisliste)

## Kurz

| Weg | Was Shopify abrechnet |
|-----|------------------------|
| Alter **Warenkorb** `/cart/add` | Immer **Katalogpreis** der Variante |
| **Draft Order** (jetzt) | Staffelpreis aus Supabase `PRICE_*` |

Anzeige (Vercel) und Abrechnung (Supabase) müssen **dieselbe Staffel** haben.

---

## Deine NFC-Preisliste (Standard im Code)

| Ab Stück | € / Chip |
|----------|----------|
| 1–19 | 1,50 |
| 20 | 1,50 |
| 50 | 1,45 |
| 100 | 1,40 |
| 250 | 1,30 |
| 400 | 1,20 |
| 600 | 1,10 |
| 800 | 1,00 |
| 1000+ | 0,95 |

Das ist schon der Default – ohne Env. Staffel gilt **pro Design**, nicht über den ganzen Warenkorb.

---

## Selbst weitere Stufen ändern (ohne Code)

Ein Env-String – beliebig viele `Menge:Euro`:

```text
1:1.50,20:1.50,50:1.45,100:1.40,250:1.30,400:1.20,600:1.10,800:1.00,1000:0.95
```

### 1) Anzeige – Vercel

Environment Variable:

- Name: `VITE_PRICE_KEYCHAIN_TIERS`
- Wert: der String oben (oder deine Variante)
- Redeploy der App

### 2) Abrechnung – Supabase (Secrets)

```bash
supabase secrets set PRICE_KEYCHAIN_TIERS="1:1.50,20:1.50,50:1.45,100:1.40,250:1.30,400:1.20,600:1.10,800:1.00,1000:0.95"
```

Danach Edge Function neu deployen:

```bash
supabase functions deploy create-draft-order
```

**Wichtig:** Vercel- und Supabase-String müssen gleich sein, sonst weicht die Kasse von der Vorschau ab.

---

## Beispiel: Stufe ergänzen

Ab 2000 Stück 0,90 € – einfach anhängen:

```text
…,1000:0.95,2000:0.90
```

---

## Alte 3er-Staffel (Legacy)

Nur aktiv, wenn **`VITE_PRICE_KEYCHAIN_Q10_CENTS` oder `_Q25_`** (bzw. Supabase `PRICE_KEYCHAIN_Q10/Q25`) gesetzt sind.

- **`VITE_PRICE_KEYCHAIN_CENTS` allein** → ignoriert, NFC-Liste aus dem Code gilt.
- Wenn Preise „wieder falsch“ sind: in **Vercel** und **Supabase** die alten `*_Q10_` / `*_Q25_` löschen **oder** überall dieselbe `*_TIERS`-Zeile setzen.

---

## Check

- [ ] 20 Stück → 1,50 € / Stück in der Vorschau
- [ ] 1000 Stück → 0,95 € / Stück
- [ ] Bestellen → Draft-Kasse mit derselben Summe
- [ ] Vercel `VITE_PRICE_KEYCHAIN_TIERS` = Supabase `PRICE_KEYCHAIN_TIERS`
