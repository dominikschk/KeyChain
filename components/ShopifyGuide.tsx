
import React from 'react';
import { X, Copy, Check, ExternalLink, Info, Search, FileCode, ArrowRightLeft } from 'lucide-react';

export const ShopifyGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [copied, setCopied] = React.useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(liquidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <header className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <ExternalLink size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Shopify Integration</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Setup Guide</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-all text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <section className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl flex gap-4">
            <Info className="text-amber-500 shrink-0" size={24} />
            <div className="space-y-1">
              <p className="text-sm text-amber-200 font-bold">Anpassung im Shopify Admin</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Damit das Vorschaubild im Warenkorb erscheint, musst du den Standard-Code für <code>item.properties</code> in deinem Theme ersetzen.
              </p>
            </div>
          </section>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-400 font-bold text-xs uppercase tracking-widest">
              <ArrowRightLeft size={16} className="text-blue-500" />
              <span>Code Ersetzen</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest px-2">1. Das löschst du:</p>
                <div className="bg-black/40 border border-red-500/20 p-4 rounded-xl font-mono text-[9px] text-zinc-500 line-through opacity-50">
                  {"{%- for property in item.properties -%}"}<br/>
                  &nbsp;&nbsp;... (der Standard Code) ...<br/>
                  {"{%- endfor -%}"}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest px-2">2. Das fügst du ein:</p>
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl font-mono text-[9px] text-emerald-200/70">
                  {"{% comment %} START: 3D-Logo {% endcomment %}"}<br/>
                  {"{% for property in item.properties %}"}<br/>
                  &nbsp;&nbsp;... (mein neuer Code) ...<br/>
                  {"{% endfor %}"}
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                <FileCode size={14} className="text-blue-500" />
                <span>Liquid Code</span>
              </div>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-6 py-3 rounded-2xl transition-all ${
                  copied ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
                } text-white shadow-xl`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Kopiert!' : 'Code kopieren'}
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
                Suche in Shopify links nach <b>"main-cart-items.liquid"</b> oder <b>"cart-item.liquid"</b>. 
                In manchen Themes ist es auch <b>"sections/cart-drawer.liquid"</b>.
              </p>
            </div>
          </div>
        </div>

        <footer className="p-8 bg-zinc-900/90 border-t border-zinc-800 flex justify-center">
          <button 
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
