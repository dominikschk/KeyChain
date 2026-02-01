# E-Mail nach Bestellung (Microsite + Short-ID)

Es gibt zwei Wege, dem Kunden nach der Bestellung die Microsite und die Short-ID per E-Mail zu schicken.

---

## Option 1: Shopify-Bestellbestätigung (ohne Code)

Die Microsite-URL und die Short-ID liegen bereits als **Line-Item-Properties** in der Bestellung (`Config-ID`, `Microsite-URL`). Du kannst sie in der **Bestellbestätigungs-E-Mail** anzeigen.

**Wo genau in Shopify?** → Siehe **SHOPIFY_CODE_EINFUEGEN.md** (Schritt-für-Schritt: Einstellungen → Benachrichtigungen → Bestellbestätigung bearbeiten und wo in der Vorlage der Code hinkommt).

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
# Im Projektroot (KeyChain)
cd "d:\Neuer Ordner (3)\KeyChain"
npx supabase functions deploy send-microsite-email --no-verify-jwt
```

In Supabase: **Edge Functions** → `send-microsite-email` → **Secrets**:

- **RESEND_API_KEY** = dein Resend API Key
- **FROM_EMAIL** (optional) = z. B. `NUDAIM <noreply@deine-domain.de>` (sonst wird Resend-Standard genutzt)

### 3. Function aufrufen (nach Bestellung)

**POST** an:

`https://<DEIN_PROJEKT>.supabase.co/functions/v1/send-microsite-email`

**Header:**  
`Content-Type: application/json`  
Optional: `Authorization: Bearer <SUPABASE_ANON_KEY>` (wenn du JWT aktivierst)

**Body (JSON):**

```json
{
  "to": "kunde@example.com",
  "microsite_url": "https://deine-app.de/?id=ABC123",
  "short_id": "ABC123"
}
```

- **to:** E-Mail-Adresse des Kunden (z. B. aus der Bestellung)
- **microsite_url:** Link zur Microsite (z. B. aus `line_item.properties['Microsite-URL']`)
- **short_id:** Short-ID (z. B. aus `line_item.properties['Config-ID']`)

### 4. Mit Shopify verbinden

**Shopify Flow (falls verfügbar):**

1. Trigger: **Order created**
2. Aktion: **Send HTTP request**
   - URL: `https://<PROJEKT>.supabase.co/functions/v1/send-microsite-email`
   - Method: POST
   - Body (JSON):  
     `to` = E-Mail der Bestellung,  
     `microsite_url` = erste Line-Item-Property `Microsite-URL`,  
     `short_id` = erste Line-Item-Property `Config-ID`

**Zapier / Make.com:**

1. Trigger: **Shopify – New Order**
2. Aktion: **Webhooks by Zapier – POST** (oder **HTTP**) mit der gleichen URL und Body wie oben; Felder aus der Bestellung mappen (E-Mail, Line-Item-Properties).

---

## Kurzüberblick

| Option | Aufwand | Ergebnis |
|--------|--------|----------|
| **1 – Shopify-Bestellbestätigung** | Nur E-Mail-Vorlage anpassen | Microsite + Short-ID in der Bestellbestätigung |
| **2 – Edge Function + Resend** | Resend + Deploy + Shopify Flow/Zapier | Eigene E-Mail mit Microsite + Short-ID nach Bestellung |

Die Edge Function liegt unter `supabase/functions/send-microsite-email/index.ts`.
