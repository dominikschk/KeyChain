/**
 * Fertiger Liquid-Schnipsel für die Shopify-Bestellbestätigung (NUDAIM-Stil).
 * Farben: Navy #11235A, Petrol #006699, Cream #FDFCF8
 *
 * Hinweis: Shopify „Test-E-Mail“ aus den Einstellungen hat keine echten
 * Line-Item-Properties – nur echte Konfigurator-Bestellung testen.
 */
export const SHOPIFY_ORDER_EMAIL_LIQUID = `{% comment %} --- START NUDAIM: Handy-Seite + Bearbeiten-Link --- {% endcomment %}
{% for line in line_items %}
  {% assign nudaim_ms = '' %}
  {% assign nudaim_ccp = '' %}
  {% assign nudaim_cfg = '' %}
  {% for p in line.properties %}
    {% if p.first == 'Microsite-URL' and p.last != blank %}
      {% assign nudaim_ms = p.last %}
    {% endif %}
    {% if p.first == '_CCP-URL' and p.last != blank %}
      {% assign nudaim_ccp = p.last %}
    {% endif %}
    {% if p.first == 'CCP-URL' and p.last != blank %}
      {% assign nudaim_ccp = p.last %}
    {% endif %}
    {% if p.first == 'Config-ID' and p.last != blank %}
      {% assign nudaim_cfg = p.last %}
    {% endif %}
  {% endfor %}
  {% if nudaim_ms == blank and line.properties['Microsite-URL'] != blank %}
    {% assign nudaim_ms = line.properties['Microsite-URL'] %}
  {% endif %}
  {% if nudaim_ccp == blank and line.properties['_CCP-URL'] != blank %}
    {% assign nudaim_ccp = line.properties['_CCP-URL'] %}
  {% endif %}

  {% if nudaim_ms != blank or nudaim_ccp != blank %}
    <div style="margin: 20px 0 28px; padding: 22px 20px; background: #FDFCF8; border: 1px solid rgba(17,35,90,0.12); border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
      <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #006699;">NUDAIM</p>
      <p style="margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #11235A; line-height: 1.25;">Deine Handy-Seite ist bereit</p>
      <p style="margin: 0 0 18px; font-size: 14px; color: #4b5563; line-height: 1.5;">
        So sehen deine Kunden die Seite, wenn sie den Anhänger ans Handy halten.
        {% if line.title != blank %}<br><span style="color:#6b7280;font-size:13px;">Zu: {{ line.title }}</span>{% endif %}
      </p>
      {% if nudaim_ms != blank %}
        <p style="margin: 0 0 10px;">
          <a href="{{ nudaim_ms }}" style="display: inline-block; background: #11235A; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 14px;">Handy-Seite öffnen</a>
        </p>
      {% endif %}
      {% if nudaim_ccp != blank %}
        <p style="margin: 18px 0 8px; font-size: 15px; font-weight: 700; color: #11235A;">Seite später ändern?</p>
        <p style="margin: 0 0 12px; font-size: 14px; color: #4b5563; line-height: 1.5;">Mit diesem privaten Link kannst du Texte, Links und Logo jederzeit anpassen.</p>
        <p style="margin: 0 0 8px;">
          <a href="{{ nudaim_ccp }}" style="display: inline-block; background: #006699; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 14px;">Seite bearbeiten</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #6b7280;">Diesen Link bitte nicht öffentlich teilen.</p>
      {% endif %}
      {% if nudaim_cfg != blank %}
        <p style="margin: 14px 0 0; font-size: 12px; color: #9ca3af;">Bestell-Code: {{ nudaim_cfg }}</p>
      {% endif %}
    </div>
  {% endif %}
{% endfor %}
{% comment %} --- ENDE NUDAIM --- {% endcomment %}
`;
