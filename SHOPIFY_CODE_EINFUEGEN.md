# Wo du in Shopify den Code einfügst (Microsite + Short-ID in der E-Mail)

---

## 1. In Shopify anmelden und zur richtigen Stelle gehen

1. **Shopify Admin** öffnen (z. B. `https://dein-shop.myshopify.com/admin`).
2. **Links in der Seitenleiste:** ganz unten auf **Einstellungen** (Zahnrad-Symbol) klicken.
3. Unter **Einstellungen** im Bereich **Benachrichtigungen** auf **Benachrichtigungen** klicken.  
   (Direktlink oft: `.../admin/settings/notifications`)
4. Du siehst eine Liste aller E-Mail-Vorlagen (Bestellbestätigung, Versandbestätigung, etc.).
5. Bei **„Bestellbestätigung“** (Order confirmation) auf **Bearbeiten** klicken (oder den Namen der Vorlage anklicken).

---

## 2. In der E-Mail-Vorlage: wo der Code hinkommt

Du bist jetzt in der **Liquid-Vorlage** der Bestellbestätigung. Der Inhalt ist z. B. in Tabs wie **„E-Mail-Vorlage“** oder **„HTML“** / **„Body“**.

- **Such einen Abschnitt, in dem die Bestellung bzw. die Produkte vorkommen** – z. B.:
  - `{{ line_items }}` oder
  - „Produktliste“ / „Bestelldetails“ / „Items“.
- **Direkt nach diesem Block** (nach der Produktliste) oder **vor dem Abschluss der E-Mail** (z. B. vor „Danke für deine Bestellung“) den folgenden Code einfügen.

**Beispiel – typischer Aufbau der Vorlage:**

```liquid
... (Begrüßung, Bestellnummer etc.) ...

{% for line in line_items %}
  ... (Produktname, Menge, Preis) ...
{% endfor %}

<!-- HIER DEN CODE EINFÜGEN (Microsite + Short-ID) -->
{% for line_item in line_items %}
  {% if line_item.properties['Microsite-URL'] != blank %}
    <p><strong>Deine Microsite:</strong><br>
    <a href="{{ line_item.properties['Microsite-URL'] }}">{{ line_item.properties['Microsite-URL'] }}</a></p>
    <p><strong>Short-ID:</strong> {{ line_item.properties['Config-ID'] }}</p>
  {% endif %}
{% endfor %}

... (Rest der E-Mail, z. B. Versandinfos, Danke) ...
```

- Wenn deine Vorlage **`line_items`** statt **`line`** in der Schleife nutzt, ist das kein Problem – der neue Code verwendet **`line_items`** (die Standardvariable in der Bestellbestätigung).
- **Speichern** nicht vergessen (Button unten, z. B. „Speichern“ oder „Vorlage aktualisieren“).

---

## 3. Kurz zusammengefasst

| Schritt | Wo |
|--------|-----|
| 1 | Shopify Admin → **Einstellungen** (unten links) |
| 2 | **Benachrichtigungen** |
| 3 | **Bestellbestätigung** → **Bearbeiten** |
| 4 | In der **E-Mail-Vorlage** einen Platz suchen (z. B. nach der Produktliste) |
| 5 | Den **Liquid-Code** (siehe oben) dort einfügen und **Speichern** |

Danach erhält der Kunde in der Bestellbestätigung den Microsite-Link und die Short-ID – aber nur, wenn die Bestellung die Properties **Microsite-URL** und **Config-ID** enthält (wie bei Bestellungen aus dem NUDAIM-Konfigurator).
