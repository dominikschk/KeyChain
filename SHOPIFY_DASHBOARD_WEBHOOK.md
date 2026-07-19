# Shopify Webhook – Klick-für-Klick (ohne CLI)

Stand: 2026-07-19

Ziel: Bezahlte Shopify-Bestellungen landen automatisch im NUDAIM-Admin (`orders`, Status `paid`).

---

## Überblick (was wohin)

| Schritt | Tool |
|---------|------|
| A – SQL (Schema) | Supabase → SQL Editor |
| B – Edge Function + Secret | Supabase → Edge Functions |
| C – Webhook eintragen | Shopify Admin |
| D – Test | Shopify Testorder → NUDAIM Admin |

**Nicht in Vercel.** Vercel hostet nur die Website.

---

## A) Schema (falls noch nicht erledigt)

1. Öffne [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Wähle dein **NUDAIM-/Keychain-Projekt**
3. Links: **SQL Editor** → **New query**
4. Inhalt von `supabase/migrations/q1_q2_orders_webhook.sql` einfügen
5. **Run** (unten rechts)
6. Erfolg = keine rote Fehlermeldung

Kontrolle (neue Query, Run):

```sql
SELECT proname FROM pg_proc
WHERE proname IN ('upsert_order_from_shopify', 'record_nfc_scan');
```

Erwartung: **2 Zeilen**.

---

## B) Edge Function in Supabase anlegen

### B1 – Project-URL notieren

1. Links: **Project Settings** (Zahnrad)
2. **API**
3. Unter **Project URL** etwas wie:  
   `https://abcdefghxyz.supabase.co`  
   → das ist `DEIN-PROJEKT` für die Webhook-URL später.

### B2 – Function erstellen

1. Links im Menü: **Edge Functions**
2. **Deploy a new function** / **Create function** / **New function**
3. Name genau: `shopify-order-webhook`  
   (Kleinbuchstaben, Bindestriche – so wie im Code)
4. Editor öffnet sich mit Beispielcode → **alles löschen**
5. Öffne lokal im Repo die Datei:  
   `supabase/functions/shopify-order-webhook/index.ts`
6. **Gesamten Inhalt** kopieren und in den Supabase-Editor einfügen
7. Speichern / Deploy

### B3 – JWT-Verify AUS (wichtig!)

Shopify sendet **keinen** Supabase-JWT, sondern eine HMAC-Signatur.

1. Bei der Function `shopify-order-webhook` die **Details / Settings** öffnen
2. Option **Verify JWT** / **Enforce JWT** → **deaktivieren (OFF)**
3. Speichern / erneut deployen, falls nötig

Wenn JWT an bleibt: Shopify bekommt dauernd **401**, Sync läuft nie.

### B4 – Secret setzen

1. Entweder:
   - **Project Settings → Edge Functions → Secrets**, oder
   - bei der Function unter **Secrets / Environment variables**
2. **Add secret** / **New secret**
3. Name genau: `SHOPIFY_WEBHOOK_SECRET`
4. Wert: lass das Feld noch offen – den Wert holst du in Schritt C aus Shopify  
   (oder trage ihn ein, sobald Shopify ihn anzeigt)

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase für Edge Functions meist automatisch bereit. Extra setzen ist normalerweise nicht nötig.

### B5 – Function-URL notieren

Nach dem Deploy steht die URL ungefähr so:

```text
https://DEIN-PROJEKT.supabase.co/functions/v1/shopify-order-webhook
```

Beispiel:

```text
https://abcdefghxyz.supabase.co/functions/v1/shopify-order-webhook
```

Diese URL brauchst du in Shopify.

---

## C) Webhook in Shopify anlegen

### C1 – Webhooks öffnen

1. Shopify Admin öffnen (z. B. `https://nudaim3d.de/admin` oder `….myshopify.com/admin`)
2. Unten links: **Einstellungen** (Settings)
3. **Benachrichtigungen** (Notifications)
4. Ganz nach unten scrollen zu **Webhooks**
5. **Webhook erstellen** / **Create webhook**

(Falls du die Stelle nicht findest: Suche im Admin oben nach „Webhooks“.)

### C2 – Webhook konfigurieren

| Feld | Wert |
|------|------|
| **Event** | **Bestellung bezahlt** / **Order payment** / Topic `orders/paid` |
| **Format** | **JSON** |
| **URL** | `https://DEIN-PROJEKT.supabase.co/functions/v1/shopify-order-webhook` |
| **API-Version** | aktuelle / Default lassen |

Speichern.

### C3 – Signing secret kopieren

Nach dem Speichern zeigt Shopify ein **Signing secret** / **Geheimnis zur Signatur** (langer Hex-/Base64-String).

1. Secret **kopieren**
2. Zurück zu Supabase → Secret `SHOPIFY_WEBHOOK_SECRET` → Wert einfügen → speichern

**Wichtig:** Dasselbe Secret in Shopify und Supabase. Wenn du den Webhook später neu anlegst, Secret neu setzen.

### C4 – Optional zweiter Webhook

Zusätzlich Event **Bestellung erstellt** (`orders/create`) auf **dieselbe URL** – dann siehst du Orders schon vor der Zahlung als `pending`. Für den Start reicht `orders/paid`.

---

## D) Testen

### D1 – Voraussetzungen am Warenkorb

Die Bestellung muss Line-Item-Properties haben, vor allem:

- `Config-ID` = Short-ID aus dem Konfigurator

(Kommt automatisch, wenn der Kunde über euren Konfigurator in den Shopify-Warenkorb geht.)

### D2 – Smoke

1. Testbestellung über den Konfigurator → Checkout → als bezahlt markieren (oder echte Testzahlung)
2. Shopify → Bestellung → prüfen, dass Property `Config-ID` da ist
3. Shopify → Webhooks → bei eurem Webhook **Recent deliveries** / letzte Zustellungen:
   - **Status 200** = gut
   - **401** = Secret falsch oder JWT noch an
   - **500** = Schema/RPC fehlt oder Function-Log prüfen
4. NUDAIM **Admin** (`/admin`) → Bestellungen: Eintrag mit Status **`paid`**

### D3 – Function-Logs

Supabase → **Edge Functions** → `shopify-order-webhook` → **Logs**

- `invalid_hmac` → Secret stimmt nicht
- `misconfigured` → Secret oder Service-Role fehlt
- `no_config_id` → Bestellung ohne `Config-ID` (kein NUDAIM-Line-Item)
- `synced: 1` → Erfolg

---

## Checkliste

- [ ] SQL `q1_q2_orders_webhook.sql` gelaufen
- [ ] Edge Function `shopify-order-webhook` deployed
- [ ] **Verify JWT = OFF**
- [ ] Secret `SHOPIFY_WEBHOOK_SECRET` = Shopify Signing Secret
- [ ] Shopify Webhook `orders/paid` → Supabase-Function-URL
- [ ] Testorder → Admin zeigt `paid`

---

## Häufige Fehler

| Symptom | Ursache |
|---------|---------|
| Syntax error bei `supabase functions deploy` im SQL Editor | Das ist CLI, nicht SQL |
| Immer 401 von Shopify | JWT noch an **oder** falsches Secret |
| 200 aber nichts im Admin | Keine `Config-ID` an der Order |
| Function `misconfigured` | Secret nicht gesetzt |

Fertig bist du, wenn eine bezahlte Testorder ohne manuelles Verknüpfen im Admin als `paid` erscheint.
