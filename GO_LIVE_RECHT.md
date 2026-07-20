# Recht & Datenschutz vor Go-Live

Stand: 2026-07-20  

**Kurz:** Impressum/AGB/Datenschutz/Widerruf verlinken auf **deine Shopify-Policies**.  
KI-Chat startet erst nach Datenschutz-Zustimmung.

---

## BLOCK 1 – Shopify-Links in Vercel

Shopify Admin → **Einstellungen** → **Rechtliches** → jeweilige Policy öffnen → URL kopieren.

In Vercel (Production) setzen + **Redeploy**:

| Variable | Beispiel |
|----------|----------|
| `VITE_LEGAL_IMPRESSUM_URL` | `https://nudaim3d.de/policies/legal-notice` |
| `VITE_LEGAL_DATENSCHUTZ_URL` | `https://nudaim3d.de/policies/privacy-policy` |
| `VITE_LEGAL_AGB_URL` | `https://nudaim3d.de/policies/terms-of-service` |
| `VITE_LEGAL_WIDERRUF_URL` | `https://nudaim3d.de/policies/refund-policy` |

### Kontrolle
- [ ] Footer-Link „Impressum“ öffnet Shopify
- [ ] „Datenschutz“ öffnet Shopify
- [ ] Policies im Shopify-Checkout sind auch gefüllt

---

## BLOCK 2 – KI-Chat

- [ ] Assistent zeigt zuerst „Datenschutz akzeptieren“
- [ ] Erst danach kann man schreiben

---

## BLOCK 3 – Draft-Kasse (falls „Config-ID ungültig“)

1. Diesen Legal-PR + Code-Fix mergen  
2. Supabase Function **`create-draft-order` neu deployen** (wichtig – Server-Regex)  
3. Alten Warenkorb/Entwurf leeren, **neu speichern**, nochmal „Zur Kasse“

Ursache des Fehlers: Die Kassen-Function hat die Config-ID abgelehnt (zu strenge Prüfung oder veraltete Function). Ohne gültige Draft-Antwort gibt’s keinen Konfigurator-Preis.

---

## Hinweis

Code verlinkt nur. Die **Texte** in Shopify müssen inhaltlich stimmen (ggf. Generator / Anwalt).
