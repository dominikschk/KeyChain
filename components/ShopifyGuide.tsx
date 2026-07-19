import React from 'react';
import { X, Copy, Check, ExternalLink, Info, Search, FileCode, ArrowRightLeft, Mail } from 'lucide-react';
import { SHOPIFY_ORDER_EMAIL_LIQUID } from '../lib/shopifyOrderEmailLiquid';

export const ShopifyGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [copiedCart, setCopiedCart] = React.useState(false);
  const [copiedMail, setCopiedMail] = React.useState(false);
  const [tab, setTab] = React.useState<'mail' | 'cart'>('mail');

  const liquidCode = `{% comment %} START: 3D-Logo Vorschau Code {% endcomment %}
{% for property in item.properties %}
  {% assign property_first_char = property.first | slice: 0 %}
  {% if property.last != blank and property_first_char != '_' %}
    <div class="cart-item__property" style="margin-top: 10px; font-size: 0.9em; display: flex; flex-direction: column; gap: 5px;">
      <span style="font-weight: bold; color: #121212;">{{ property.first }}: </span>
      <span>
        {% if property.last contains 'https://' and property.last contains '.png' %}
          <a href="{{ property.last }}" target="_blank" style="display: block; width: fit-content;">
            <img src="{{ property.last }}" alt="Deine Konfiguration" 
                 style="width: 100px; height: 100px; object-fit: contain; border: 1px solid #e8e8e8; border-radius: 12px; background: #fbfbfb; padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          </a>
        {% else %}
          {{ property.last }}
        {% endif %}
      </span>
    </div>
  {% endif %}
{% endfor %}
{% comment %} ENDE: 3D-Logo Vorschau Code {% endcomment %}`;

  const copy = async (text: string, which: 'mail' | 'cart') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'mail') {
        setCopiedMail(true);
        window.setTimeout(() => setCopiedMail(false), 2000);
      } else {
        setCopiedCart(true);
        window.setTimeout(() => setCopiedCart(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <header className="p-6 sm:p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 shrink-0">
              <ExternalLink size={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-xl text-white">Shopify einrichten</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                Bestellmail &amp; Warenkorb
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-all text-zinc-400 hover:text-white shrink-0"
            aria-label="Schließen"
          >
            <X size={24} />
          </button>
        </header>

        <div className="px-6 sm:px-8 pt-4 flex gap-2 border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setTab('mail')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider ${
              tab === 'mail' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Bestell-E-Mail
          </button>
          <button
            type="button"
            onClick={() => setTab('cart')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider ${
              tab === 'cart' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Warenkorb-Bild
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
          {tab === 'mail' ? (
            <>
              <section className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl flex gap-4">
                <Mail className="text-emerald-400 shrink-0" size={24} />
                <div className="space-y-2">
                  <p className="text-sm text-emerald-200 font-bold">Damit Uwe die Seite später ändern kann</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    In der Bestellbestätigung erscheinen zwei klare Buttons: Handy-Seite öffnen (öffentlich) und
                    Seite bearbeiten (privater Link). Der Bearbeiten-Link kommt aus der versteckten Property{' '}
                    <code className="text-zinc-300">_CCP-URL</code>.
                  </p>
                  <ol className="text-xs text-zinc-400 list-decimal pl-4 space-y-1">
                    <li>Shopify Admin → Einstellungen → Benachrichtigungen</li>
                    <li>Bestellbestätigung → Bearbeiten</li>
                    <li>Code unten nach der Produktliste einfügen → Speichern</li>
                  </ol>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                    <FileCode size={14} className="text-emerald-400" />
                    <span>Code für die Bestell-E-Mail</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(SHOPIFY_ORDER_EMAIL_LIQUID, 'mail')}
                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-6 py-3 rounded-2xl transition-all text-white shadow-xl ${
                      copiedMail ? 'bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {copiedMail ? <Check size={16} /> : <Copy size={16} />}
                    {copiedMail ? 'Kopiert!' : 'Code kopieren'}
                  </button>
                </div>
                <pre className="bg-black/60 p-6 rounded-2xl text-[10px] font-mono text-zinc-300 overflow-x-auto border border-zinc-800 leading-relaxed max-h-72 whitespace-pre-wrap">
                  {SHOPIFY_ORDER_EMAIL_LIQUID}
                </pre>
              </section>
            </>
          ) : (
            <>
              <section className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl flex gap-4">
                <Info className="text-amber-500 shrink-0" size={24} />
                <div className="space-y-1">
                  <p className="text-sm text-amber-200 font-bold">Vorschaubild im Warenkorb</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Optional: Damit das Vorschaubild im Warenkorb erscheint, den Standard-Code für{' '}
                    <code>item.properties</code> ersetzen. Properties mit Unterstrich (z. B. _CCP-URL) bleiben
                    versteckt.
                  </p>
                </div>
              </section>

              <div className="space-y-6">
                <div className="flex items-center gap-3 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                  <ArrowRightLeft size={16} className="text-blue-500" />
                  <span>Code ersetzen</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest px-2">
                      1. Das löschst du:
                    </p>
                    <div className="bg-black/40 border border-red-500/20 p-4 rounded-xl font-mono text-[9px] text-zinc-500 line-through opacity-50">
                      {'{%- for property in item.properties -%}'}
                      <br />
                      &nbsp;&nbsp;... (der Standard Code) ...
                      <br />
                      {'{%- endfor -%}'}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest px-2">
                      2. Das fügst du ein:
                    </p>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl font-mono text-[9px] text-emerald-200/70">
                      {'{% comment %} START: 3D-Logo {% endcomment %}'}
                      <br />
                      {'{% for property in item.properties %}'}
                      <br />
                      &nbsp;&nbsp;... (neuer Code) ...
                      <br />
                      {'{% endfor %}'}
                    </div>
                  </div>
                </div>
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                    <FileCode size={14} className="text-blue-500" />
                    <span>Warenkorb-Liquid</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(liquidCode, 'cart')}
                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-6 py-3 rounded-2xl transition-all text-white shadow-xl ${
                      copiedCart ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {copiedCart ? <Check size={16} /> : <Copy size={16} />}
                    {copiedCart ? 'Kopiert!' : 'Code kopieren'}
                  </button>
                </div>
                <pre className="bg-black/60 p-6 rounded-2xl text-[10px] font-mono text-zinc-300 overflow-x-auto border border-zinc-800 leading-relaxed max-h-64">
                  {liquidCode}
                </pre>
              </section>

              <div className="bg-zinc-800/30 p-6 rounded-3xl border border-zinc-800 flex items-start gap-4">
                <Search className="text-blue-500 shrink-0 mt-1" size={20} />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-zinc-200">Wo finde ich die Datei?</p>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Suche in Shopify nach <b>main-cart-items.liquid</b>, <b>cart-item.liquid</b> oder{' '}
                    <b>sections/cart-drawer.liquid</b>.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="p-6 sm:p-8 bg-zinc-900/90 border-t border-zinc-800 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-10 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-[10px] font-bold text-zinc-200 transition-all uppercase tracking-[0.2em]"
          >
            Fertig
          </button>
        </footer>
      </div>
    </div>
  );
};
