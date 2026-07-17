# E-Mail nach Bestellung (Microsite + Short-ID)

Es gibt zwei Wege, dem Kunden nach der Bestellung die Microsite und die Short-ID per E-Mail zu schicken.

---

## Option 1: Shopify-Bestellbestätigung (ohne Code)

Die Microsite-URL und die Short-ID liegen bereits als **Line-Item-Properties** in der Bestellung (`Config-ID`, `Microsite-URL`). Du kannst sie in der **Bestellbestätigungs-E-Mail** anzeigen.

**Wo genau in Shopify?** → Siehe **SHOPIFY_CODE_EINFUEGEN.md**.

Kurz:
1. In **Shopify Admin**: **Einstellungen → Benachrichtigungen**
2. Bei **Bestellbestätigung** auf **Bearbeiten** klicken
3. In der E-Mail-Vorlage (z. B. nach der Produktliste) den folgenden Code einfügen:

```liquid
{% for line_item in line_items %}
  {% if line_item.properties['Microsite-URL'] != blank %}
    <p><strong>Deine Microsite:</strong><br>
    <a href="{{ line_item.properties['Microsite-URL'] }}">{{ line_item.properties['Microsite-URL'] }}</a></p>
    <p><strong>Short-ID:</strong> {{ line_item.properties['Config-ID'] }}</p>
  {% endif %}
{% endfor %}
```

Dann erhält der Kunde die Microsite und Short-ID in der normalen Bestellbestätigung.

---

## Option 2: Eigene E-Mail per Supabase Edge Function (Resend)

Mit einer **Supabase Edge Function** wird eine **eigene E-Mail** mit Microsite-Link und Short-ID versendet. Du rufst die Function z. B. aus **Shopify Flow** oder **Zapier** auf, sobald eine Bestellung erstellt wird.

### 1. Resend einrichten

- Auf [resend.com](https://resend.com) registrieren
- **API Key** erstellen (API Keys)
- Optional: **Domain** verifizieren, damit Absender z. B. `noreply@deine-domain.de` heißt

### 2. Edge Function deployen

```bash
# JWT-Prüfung der Platform kann bleiben; zusätzlich verlangt die Function EMAIL_WEBHOOK_SECRET
npx supabase functions deploy send-microsite-email --no-verify-jwt
```

`--no-verify-jwt` ist hier ok, **weil** die Function selbst `EMAIL_WEBHOOK_SECRET` prüft (Shopify/Zapier senden kein Supabase-User-JWT). Ohne Secret startet die Function nicht erfolgreich.

In Supabase: **Edge Functions** → `send-microsite-email` → **Secrets**:

- **RESEND_API_KEY** = dein Resend API Key
- **EMAIL_WEBHOOK_SECRET** = langes zufälliges Secret (nur für Shopify/Zapier)
- **FROM_EMAIL** (optional) = z. B. `NUDAIM <noreply@deine-domain.de>`
- **ALLOWED_MICROSITE_HOSTS** (empfohlen) = z. B. `konfigurator.nudaim3d.de` (Komma-separiert). Ohne Allowlist sind nur `https://`-URLs erlaubt.

### 3. Function aufrufen (nach Bestellung)

**POST** an:

`https://<DEIN_PROJEKT>.supabase.co/functions/v1/send-microsite-email`

**Header:**  
`Content-Type: application/json`  
`Authorization: Bearer <EMAIL_WEBHOOK_SECRET>`  
(oder `X-Webhook-Secret: <EMAIL_WEBHOOK_SECRET>`)

**Body (JSON):**

```json
{
  "to": "kunde@example.com",
  "microsite_url": "https://deine-app.de/?id=ABC123",
  "short_id": "ABC123"
}
```

- **to:** gültige E-Mail-Adresse
- **microsite_url:** gültige `http(s)`-URL (wird HTML-escaped)
- **short_id:** Short-ID (max. 64 Zeichen)

Ohne gültiges Secret → **401 Unauthorized**.

### 4. Mit Shopify verbinden

**Shopify Flow (falls verfügbar):**

1. Trigger: **Order created**
2. Aktion: **Send HTTP request**
   - URL: `https://<PROJEKT>.supabase.co/functions/v1/send-microsite-email`
   - Method: POST
   - Header: `Authorization: Bearer <EMAIL_WEBHOOK_SECRET>`
   - Body (JSON):  
     `to` = E-Mail der Bestellung,  
     `microsite_url` = erste Line-Item-Property `Microsite-URL`,  
     `short_id` = erste Line-Item-Property `Config-ID`

**Zapier / Make.com:**

1. Trigger: **Shopify – New Order**
2. Aktion: **Webhooks by Zapier – POST** (oder **HTTP**) mit derselben URL, dem Secret-Header und Body wie oben.

---

## Kurzüberblick

| Option | Aufwand | Ergebnis |
|--------|--------|----------|
| **1 – Shopify-Bestellbestätigung** | Nur E-Mail-Vorlage anpassen | Microsite + Short-ID in der Bestellbestätigung |
| **2 – Edge Function + Resend** | Resend + Deploy + Secret + Shopify Flow/Zapier | Eigene E-Mail mit Microsite + Short-ID |

Die Edge Function liegt unter `supabase/functions/send-microsite-email/index.ts`.
