/**
 * Fertiger Liquid-Schnipsel für die Shopify-Bestellbestätigung (NUDAIM-Stil).
 * Properties (Checkout): Handy-Seite, Bearbeiten-Link (+ versteckt _CCP-URL).
 * Alte Orders mit Microsite-URL bleiben in der Mail lesbar.
 */
export const SHOPIFY_ORDER_EMAIL_LIQUID = `{% comment %} --- START NUDAIM: Handy-Seite + Bearbeiten-Link (max. 1× pro Config) --- {% endcomment %}
{% assign nudaim_seen = '|' %}
{% for line in line_items %}
  {% assign nudaim_ms = '' %}
  {% assign nudaim_ccp = '' %}
  {% assign nudaim_cfg = '' %}
  {% for p in line.properties %}
    {% if p.first == 'Microsite-URL' and p.last != blank %}{% assign nudaim_ms = p.last %}{% endif %}
    {% if p.first == 'Handy-Seite' and p.last != blank %}{% assign nudaim_ms = p.last %}{% endif %}
    {% if p.first == '_CCP-URL' and p.last != blank %}{% assign nudaim_ccp = p.last %}{% endif %}
    {% if p.first == 'Bearbeiten-Link' and p.last != blank %}{% assign nudaim_ccp = p.last %}{% endif %}
    {% if p.first == 'CCP-URL' and p.last != blank %}{% assign nudaim_ccp = p.last %}{% endif %}
    {% if p.first == 'Config-ID' and p.last != blank %}{% assign nudaim_cfg = p.last %}{% endif %}
  {% endfor %}
  {% if nudaim_ms == blank and line.properties['Microsite-URL'] != blank %}{% assign nudaim_ms = line.properties['Microsite-URL'] %}{% endif %}
  {% if nudaim_ccp == blank and line.properties['Bearbeiten-Link'] != blank %}{% assign nudaim_ccp = line.properties['Bearbeiten-Link'] %}{% endif %}
  {% if nudaim_ccp == blank and line.properties['_CCP-URL'] != blank %}{% assign nudaim_ccp = line.properties['_CCP-URL'] %}{% endif %}

  {% if nudaim_ms != blank or nudaim_ccp != blank %}
    {% assign nudaim_key = nudaim_cfg %}
    {% if nudaim_key == blank %}{% assign nudaim_key = nudaim_ms %}{% endif %}
    {% if nudaim_key == blank %}{% assign nudaim_key = nudaim_ccp %}{% endif %}
    {% assign nudaim_marker = '|' | append: nudaim_key | append: '|' %}
    {% unless nudaim_seen contains nudaim_marker %}
      {% assign nudaim_seen = nudaim_seen | append: nudaim_key | append: '|' %}
    <div style="margin: 20px 0 28px; padding: 22px 20px; background: #FDFCF8; border: 1px solid rgba(17,35,90,0.12); border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
      <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #006699;">NUDAIM</p>
      <p style="margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #11235A; line-height: 1.25;">Deine Handy-Seite ist bereit</p>
      <p style="margin: 0 0 18px; font-size: 14px; color: #4b5563; line-height: 1.5;">So sehen deine Kunden die Seite, wenn sie den Anhänger ans Handy halten.</p>
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
    {% endunless %}
  {% endif %}
{% endfor %}
{% comment %} --- ENDE NUDAIM --- {% endcomment %}
`;
