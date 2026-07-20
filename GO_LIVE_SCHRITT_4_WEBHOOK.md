# Schritt 4 – Webhook: Bezahlte Order → NUDAIM-Admin

Stand: 2026-07-20  
**Nur machen, wenn Schritte 1–3 schon klappen** (Bestellen → Shopify-Warenkorb).

Ziel: Eine **bezahlte** Shopify-Bestellung erscheint **automatisch** im NUDAIM-Admin unter Bestellungen mit Status **`paid`**.

Du brauchst dafür **kein** Draft-Order-Token und **kein** Vercel-Secret.  
Alles läuft über **Supabase** + **Shopify**.

Nimm dir Ruhe. Ein Block nach dem anderen. Checkboxen helfen.

---

# Was passiert technisch? (1 Minute)

1. Kunde bestellt über den Konfigurator → Shopify-Warenkorb hat Property **`Config-ID`**.  
2. Kunde **bezahlt**.  
3. Shopify schickt eine Nachricht (Webhook) an deine Supabase-Function.  
4. Die Function prüft die Signatur und schreibt einen Eintrag in die Tabelle `orders`.  
5. Du öffnest `/admin` → siehst die Order als **paid**.

Ohne Webhook: Bestellungen existieren nur in Shopify – dein Admin weiß nichts davon.

---

# BLOCK A – SQL in Supabase (Schema)

## A1 – Datei öffnen

1. Auf dem Computer (oder GitHub) die Datei öffnen:  
   **`supabase/migrations/q1_q2_orders_webhook.sql`**
2. **Alles** markieren und kopieren (`Ctrl+A` / `Cmd+A`, dann kopieren).

Auf GitHub:  
https://github.com/dominikschk/KeyChain/blob/main/supabase/migrations/q1_q2_orders_webhook.sql  
→ Button **Raw** → alles kopieren.

## A2 – SQL Editor

1. https://supabase.com/dashboard öffnen  
2. Dein **NUDAIM-/KeyChain-Projekt** wählen (dasselbe wie für Vercel Env)  
3. Links: **SQL Editor**  
4. **New query** / **Neue Abfrage**  
5. Den kopierten SQL-Text **einfügen**  
6. **Run** (unten rechts) oder `Ctrl/Cmd + Enter`

### Erfolg
- Keine große rote Fehlermeldung  
- Oft steht „Success“ / grün

### Wenn schon mal gelaufen
- Kann „already exists“ / Notices geben – meist **ok**, weiter zu A3.

## A3 – Kontrolle

Neue Query, diesen Text einfügen, **Run**:

```sql
SELECT proname FROM pg_proc
WHERE proname IN ('upsert_order_from_shopify', 'record_nfc_scan');
```

**Erwartung:** genau **2 Zeilen** (beide Funktionsnamen).

Zweite Kontrolle (Print-QC-Spalten):

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('print_qc_status', 'print_qc_note', 'print_qc_at');
```

**Erwartung:** **3 Zeilen**.

### Fertig-Kontrolle Block A
- [ ] SQL ausgeführt  
- [ ] 2 Funktionen sichtbar  
- [ ] 3 Spalten sichtbar  

---

# BLOCK B – Edge Function anlegen

## B1 – Project-URL notieren

1. Supabase → **Project Settings** (Zahnrad)  
2. **API**  
3. **Project URL** kopieren, z. B.  
   `https://abcdefghxyz.supabase.co`  

Daraus wird später die Webhook-URL:

```text
https://abcdefghxyz.supabase.co/functions/v1/shopify-order-webhook
```

Schreib dir das auf (Notizzettel).

## B2 – Function erstellen

1. Links: **Edge Functions**  
2. **Deploy a new function** / **Create a new function**  
3. **Name genau:** `shopify-order-webhook`  
   - nur Kleinbuchstaben  
   - Bindestriche wie oben  
   - kein Leerzeichen  
4. Wenn ein Editor mit Beispielcode kommt: **alles löschen**  
5. Inhalt aus dem Repo kopieren:  
   **`supabase/functions/shopify-order-webhook/index.ts`**  
   (auf GitHub: Raw → alles kopieren)  
6. In den Supabase-Editor **einfügen**  
7. **Deploy** / Speichern  

### Wenn die Function schon existiert
- Öffnen → Code durch den aktuellen `index.ts` **ersetzen** → erneut deployen.

## B3 – JWT Verify AUSSCHALTEN (sehr wichtig)

Shopify sendet **keinen** Supabase-Login-Token. Nur eine Signatur.

1. Function `shopify-order-webhook` öffnen  
2. **Details** / **Settings** / **Configuration**  
3. Option **Verify JWT** / **Enforce JWT** / **Verify JWT with legacy secret** → **OFF / deaktiviert**  
4. Speichern  

**Wenn das an bleibt:** Shopify bekommt immer **401**, nichts kommt im Admin an.

## B4 – Function-URL prüfen

Nach dem Deploy sollte stehen:

```text
https://DEIN-PROJEKT.supabase.co/functions/v1/shopify-order-webhook
```

Kopieren und bereithalten für Shopify.

### Fertig-Kontrolle Block B
- [ ] Function `shopify-order-webhook` deployed  
- [ ] **Verify JWT = OFF**  
- [ ] Function-URL notiert  

---

# BLOCK C – Webhook in Shopify

## C1 – Webhooks-Seite finden

1. Shopify Admin öffnen:  
   `https://nudaim3d.de/admin` **oder** `https://DEIN-SHOP.myshopify.com/admin`  
2. Unten links: **Einstellungen** (Settings)  
3. **Benachrichtigungen** (Notifications)  
4. Ganz nach **unten** scrollen → Abschnitt **Webhooks**  
5. **Webhook erstellen** / **Create webhook**

Falls nicht sichtbar: Oben im Admin nach „Webhooks“ suchen.

## C2 – Felder ausfüllen

| Feld | Exakter Wert |
|------|----------------|
| **Event / Ereignis** | **Bestellung bezahlt** / Order payment / Topic **`orders/paid`** |
| **Format** | **JSON** |
| **URL** | `https://DEIN-PROJEKT.supabase.co/functions/v1/shopify-order-webhook` |
| **API-Version** | Default / aktuell lassen |

**Speichern.**

## C3 – Signing Secret (nur einmal sichtbar!)

Direkt nach dem Speichern zeigt Shopify ein **Signing secret** / **Geheimnis zur Signatur**.

1. **Sofort kopieren** (Passwortmanager / Notiz)  
2. Zurück zu Supabase  

### Secret in Supabase eintragen

1. Supabase → **Project Settings** → **Edge Functions** → **Secrets**  
   (oder: Edge Functions → Secrets)  
2. **Add / New secret**  
3. Name **genau:** `SHOPIFY_WEBHOOK_SECRET`  
4. Wert = das kopierte Shopify-Signing-Secret  
5. Speichern  

### Secret verpasst?
1. Alten Webhook in Shopify löschen  
2. Neu anlegen (C2)  
3. Neues Secret sofort kopieren  
4. In Supabase `SHOPIFY_WEBHOOK_SECRET` **überschreiben**

## C4 – Optional (nicht nötig für den ersten Test)
Zweiter Webhook **Bestellung erstellt** (`orders/create`) → **dieselbe URL**.  
Für den Start reicht **`orders/paid`**.

### Fertig-Kontrolle Block C
- [ ] Webhook `orders/paid` existiert  
- [ ] URL zeigt auf deine Supabase-Function  
- [ ] `SHOPIFY_WEBHOOK_SECRET` in Supabase = Shopify-Signing-Secret  

---

# BLOCK D – Testen

## D1 – Wichtig vor dem Test

Die Shopify-Order **muss** die Property **`Config-ID`** haben.  
Das passiert automatisch, wenn du über den **Konfigurator** in den Warenkorb gehst (nicht über ein leeres Shopify-Produkt ohne Konfigurator).

## D2 – Ablauf

1. Konfigurator (Production) öffnen  
2. Logo → **In den Warenkorb**  
3. In Shopify **bezahlen** (Testgateway oder echte kleine Zahlung)  
   - Alternativ: Order im Admin manuell als bezahlt markieren, **wenn** Shopify dann `orders/paid` feuert (je nach Setup)  
4. Shopify → die Bestellung öffnen → unter Position prüfen: Property **Config-ID** sichtbar?  
5. Shopify → Einstellungen → Benachrichtigungen → Webhooks → bei deinem Webhook **Recent deliveries** / letzte Zustellungen:
   - **200** = gut  
   - **401** = JWT noch an oder Secret falsch  
   - **500** = SQL/RPC fehlt → Function-Logs  
6. NUDAIM **Admin** öffnen: `https://DEINE-APP/admin`  
7. Einloggen → Bestellungen: Eintrag mit Status **`paid`**, passende Config-ID

## D3 – Function-Logs (wenn etwas schiefgeht)

Supabase → Edge Functions → `shopify-order-webhook` → **Logs**

| Log / Symptom | Bedeutung |
|---------------|-----------|
| `invalid_hmac` | Secret stimmt nicht |
| `misconfigured` | Secret oder Service-Role fehlt |
| `no_config_id` | Order ohne Config-ID (nicht über Konfigurator) |
| `synced: 1` | Erfolg |

### Fertig-Kontrolle Block D
- [ ] Recent delivery **200**  
- [ ] Admin zeigt Order **`paid`**  

**Dann ist Schritt 4 erledigt.**

---

# Checkliste Gesamt

- [ ] A SQL + 2 Funktionen + 3 Spalten  
- [ ] B Function deployed + JWT OFF + URL  
- [ ] C Webhook + Secret in Supabase  
- [ ] D Testorder → Admin `paid`  

---

# Häufige Fehler

| Symptom | Fix |
|---------|-----|
| Immer 401 | JWT Verify **OFF**; Secret neu setzen |
| 200, aber Admin leer | Keine `Config-ID` an der Order |
| Function `misconfigured` | Secret `SHOPIFY_WEBHOOK_SECRET` fehlt |
| SQL-Fehler „syntax“ weil du `supabase functions deploy` im SQL Editor ausgeführt hast | Das ist **CLI**, nicht SQL – nur den Inhalt der `.sql`-Datei ausführen |

---

# Was danach kommt (noch nicht jetzt)

1. Echte Variant-ID in Vercel feinjustieren  
2. Draft Orders (berechneter Preis)  
3. Print-QC mit Druckerei  

Wenn Block D grün ist: kurz Bescheid sagen – dann geht’s zum nächsten Stück.
