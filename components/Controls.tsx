
import React, { useState } from 'react';
import { ModelConfig, SVGPathData, BaseType, NFCBlock, MagicButtonType, Department, ActionIcon, FontStyle, ProfileTheme } from '../types';
import { Box, Type, Plus, Minus, Trash2, Smartphone, Wifi, Star, GripVertical, ChevronDown, Link as LinkIcon, Image as ImageIcon, Briefcase, Zap, Sliders, Award, MessageCircle, MapPin, Globe, ShoppingCart, Info, User, Mail, Phone, Loader2, ChevronUp, Instagram, Utensils, Sparkles, Shield, Layout, Camera, Dumbbell, Heart, Activity, Palette, Sun, Moon, Scissors, Coffee, Stethoscope, Hammer, ArrowLeft, MoveVertical, Map as MapIcon, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ControlsProps {
  activeDept: Department;
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  svgElements: SVGPathData[] | null;
  onUpload: (e: any) => void;
  onUpdateColor: (id: string, color: string) => void;
}

const IconSelector: React.FC<{ selected: ActionIcon, onSelect: (i: ActionIcon) => void }> = ({ selected, onSelect }) => {
  const icons: { id: ActionIcon, icon: any }[] = [
    { id: 'briefcase', icon: Briefcase }, { id: 'utensils', icon: Utensils }, { id: 'camera', icon: Camera },
    { id: 'dumbbell', icon: Dumbbell }, { id: 'link', icon: LinkIcon }, { id: 'globe', icon: Globe }, 
    { id: 'shopping-cart', icon: ShoppingCart }, { id: 'info', icon: Info }, { id: 'user', icon: User }, 
    { id: 'star', icon: Star }, { id: 'mail', icon: Mail }, { id: 'phone', icon: Phone }, 
    { id: 'instagram', icon: Instagram }, { id: 'shield', icon: Shield }, { id: 'heart', icon: Heart },
    { id: 'zap', icon: Zap }, { id: 'map', icon: MapIcon }, { id: 'clock', icon: Clock }, { id: 'calendar', icon: Calendar }
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {icons.map(i => (
        <button key={i.id} onClick={() => onSelect(i.id)} className={`p-2.5 rounded-xl flex items-center justify-center border transition-all ${selected === i.id ? 'bg-petrol text-white border-petrol shadow-lg scale-105' : 'bg-white border-navy/5 text-zinc-400 hover:border-petrol/30'}`}>
          <i.icon size={16} />
        </button>
      ))}
    </div>
  );
};

const PropertyPanel: React.FC<{ block: NFCBlock, onUpdate: (u: Partial<NFCBlock>) => void, onClose: () => void }> = ({ block, onUpdate, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      <header className="p-6 border-b border-navy/5 flex items-center gap-4">
        <button onClick={onClose} className="p-2 hover:bg-cream rounded-full transition-colors"><ArrowLeft size={20}/></button>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-navy">Element bearbeiten</h2>
      </header>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Element Titel</label>
          <input type="text" value={block.title || ''} onChange={e => onUpdate({ title: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-cream font-black" placeholder="Optionaler Titel" />
        </div>

        {block.type === 'text' && (
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inhalt / Nachricht</label>
            <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs h-40 bg-white resize-none font-medium leading-relaxed" placeholder="Dein Text hier..." />
          </div>
        )}

        {block.type === 'headline' && (
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Überschrift Inhalt</label>
            <input type="text" value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" />
          </div>
        )}

        {block.type === 'image' && (
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Bild Upload</label>
            <div className="relative h-64 rounded-[2rem] border-2 border-dashed border-navy/10 bg-cream/50 flex flex-col items-center justify-center gap-3 group cursor-pointer hover:border-petrol/30 transition-all overflow-hidden shadow-inner">
              {block.imageUrl ? (
                <img src={block.imageUrl} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-300">
                  {isUploading ? <Loader2 className="animate-spin text-petrol" /> : <ImageIcon size={48} strokeWidth={1} />}
                  <span className="text-[8px] font-black uppercase">Foto auswählen</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={async (e) => {
                 const file = e.target.files?.[0]; if(!file || !supabase) return;
                 setIsUploading(true);
                 const { data } = await supabase.storage.from('nudaim').upload(`img_${Date.now()}_${file.name}`, file);
                 if(data) {
                   const { data: { publicUrl } } = supabase.storage.from('nudaim').getPublicUrl(data.path);
                   onUpdate({ imageUrl: publicUrl });
                 }
                 setIsUploading(false);
              }} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>
        )}

        {block.type === 'map' && (
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Adresse / Standort</label>
            <input type="text" value={block.settings?.address || ''} onChange={e => onUpdate({ settings: { ...block.settings, address: e.target.value } })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" placeholder="Hauptstraße 1, 12345 Stadt" />
            <p className="text-[8px] text-zinc-400 italic">Die Karte wird automatisch basierend auf der Adresse generiert.</p>
          </div>
        )}

        {block.type === 'spacer' && (
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Abstandshöhe (px)</label>
            <div className="flex items-center gap-4">
              <input type="range" min="10" max="100" step="10" value={block.settings?.height || 20} onChange={e => onUpdate({ settings: { ...block.settings, height: parseInt(e.target.value) } })} className="flex-1 accent-petrol" />
              <span className="text-xs font-black text-navy">{block.settings?.height || 20}px</span>
            </div>
          </div>
        )}

        {block.type === 'magic_button' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inhalt / URL / Telefon</label>
              <input type="text" value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" />
            </div>
            
            {block.buttonType === 'custom_link' && (
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Button Icon</label>
                <IconSelector selected={block.settings?.icon || 'link'} onSelect={i => onUpdate({ settings: { ...block.settings, icon: i } })} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ activeDept, config, setConfig, svgElements, onUpload, onUpdateColor }) => {
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [showAllMagicButtons, setShowAllMagicButtons] = useState(false);
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const updateConfig = (key: keyof ModelConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));

  const templates = [
    {
      id: 're', label: 'Immobilien', icon: <Globe size={20} />, company: 'RE/MAX Agent',
      action: () => {
        const blocks: NFCBlock[] = [
          { id: 're-text', type: 'text', title: 'EXPOSÉ VORSCHAU', content: 'Scannen Sie für alle Details und den 360° Rundgang dieser Immobilie.' },
          { id: 're-btn-tour', type: 'magic_button', buttonType: 'custom_link', title: 'Virtuelle Tour', content: 'https://matterport.com/demo', settings: { icon: 'globe' } },
          { id: 're-btn-wa', type: 'magic_button', buttonType: 'whatsapp', title: 'Besichtigung anfragen', content: '+49123456789' }
        ];
        setConfig(prev => ({ ...prev, profileTitle: 'IMMOBILIEN AGENT', profileIcon: 'briefcase', headerImageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#11235A' }));
      }
    },
    {
        id: 'coach', label: 'Personal Coach', icon: <User size={20} />, company: 'Personal Brand',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'c-h1', type: 'headline', title: '', content: 'Level Up Your Life' },
            { id: 'c-text', type: 'text', title: 'ÜBER MICH', content: 'Ich helfe Unternehmern dabei, ihre Produktivität zu verdoppeln.' },
            { id: 'c-insta', type: 'magic_button', buttonType: 'instagram', title: '@coach_brand', content: '@coach_brand' },
            { id: 'c-book', type: 'magic_button', buttonType: 'custom_link', title: '1:1 Session buchen', content: 'https://calendly.com', settings: { icon: 'calendar' } }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'COACH MAX', profileIcon: 'user', headerImageUrl: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#4F46E5' }));
        }
    },
    {
        id: 'event', label: 'Event / Party', icon: <Calendar size={20} />, company: 'Wedding Hub',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'e-h1', type: 'headline', title: '', content: 'SARA & TOM' },
            { id: 'e-text', type: 'text', title: 'UNSERE HOCHZEIT', content: 'Schön, dass ihr dabei seid! Hier findet ihr alle Infos zum Ablauf.' },
            { id: 'e-map', type: 'map', title: 'Location', content: '', settings: { address: 'Schlossgarten 1, 80333 München' } },
            { id: 'e-wa', type: 'magic_button', buttonType: 'whatsapp', title: 'Rückmeldung geben', content: '+49123456789' }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'THE BIG DAY', profileIcon: 'heart', headerImageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#DB2777' }));
        }
    },
    {
        id: 'saas', label: 'Software/SaaS', icon: <Zap size={20} />, company: 'Tech Startup',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 's-h1', type: 'headline', title: '', content: 'Next-Gen Analytics' },
            { id: 's-text', type: 'text', title: 'CLOUD POWER', content: 'Skaliere dein Business mit Echtzeit-Daten.' },
            { id: 's-demo', type: 'magic_button', buttonType: 'custom_link', title: 'Demo ansehen', content: 'https://demo.app', settings: { icon: 'zap' } },
            { id: 's-shop', type: 'magic_button', buttonType: 'custom_link', title: 'Preise & Pakete', content: 'https://app.com/pricing', settings: { icon: 'shopping-cart' } }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'TECH STUDIO', profileIcon: 'zap', headerImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#10B981' }));
        }
    },
    {
        id: 'retail', label: 'Einzelhandel', icon: <ShoppingCart size={20} />, company: 'Local Store',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'r-h1', type: 'headline', title: '', content: 'Wohnkultur & Design' },
            { id: 'r-text', type: 'text', title: 'ÖFFNUNGSZEITEN', content: 'Mo-Sa: 10:00 - 18:00 Uhr\nBesuchen Sie uns im Laden!' },
            { id: 'r-map', type: 'map', title: 'Storefinder', content: '', settings: { address: 'Hafenstraße 12, 20457 Hamburg' } },
            { id: 'r-shop', type: 'magic_button', buttonType: 'custom_link', title: 'Online Shop', content: 'https://shop.com', settings: { icon: 'shopping-cart' } }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'LOCAL DESIGN', profileIcon: 'shopping-cart', headerImageUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#B45309' }));
        }
    },
    {
      id: 'res', label: 'Gastronomie', icon: <Utensils size={20} />, company: 'Ristorante Hub',
      action: () => {
        const blocks: NFCBlock[] = [
          { id: 'res-text', type: 'text', title: 'BENVENUTI', content: 'Genießen Sie unsere hausgemachte Pasta und Weine.' },
          { id: 'res-btn-menu', type: 'magic_button', buttonType: 'custom_link', title: 'Speisekarte (PDF)', content: 'https://example.com/menu.pdf', settings: { icon: 'utensils' } },
          { id: 'res-btn-wifi', type: 'magic_button', buttonType: 'wifi', title: 'Gäste-WLAN', content: '', settings: { ssid: 'Guest_WLAN', password: 'Pasta' } }
        ];
        setConfig(prev => ({ ...prev, profileTitle: 'RISTORANTE BELLA', profileIcon: 'utensils', headerImageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#006699' }));
      }
    },
    {
      id: 'hw', label: 'Handwerk', icon: <Shield size={20} />, company: 'Elektro Schmidt',
      action: () => {
        const blocks: NFCBlock[] = [
          { id: 'hw-text', type: 'text', title: 'MEISTERBETRIEB', content: 'Qualität seit 1990. Ihr Partner für moderne Installationen.' },
          { id: 'hw-btn-wa', type: 'magic_button', buttonType: 'whatsapp', title: 'Direkt-Anfrage', content: '+49123456789' },
          { id: 'hw-btn-rev', type: 'magic_button', buttonType: 'review', title: 'Bewertungen', content: 'https://google.com' }
        ];
        setConfig(prev => ({ ...prev, profileTitle: 'ELEKTRO SCHMIDT', profileIcon: 'shield', headerImageUrl: 'https://images.unsplash.com/photo-1581092921461-7d65697c4a24?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#12A9E0' }));
      }
    }
  ];

  const magicButtons = [
    { id: 'review', label: 'Google Rezension', icon: <Star size={24} fill="currentColor" />, colorClass: 'text-yellow-500 bg-yellow-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'review', title: 'Bewerten', content: 'https://google.com' }]) },
    { id: 'whatsapp', label: 'WhatsApp Chat', icon: <MessageCircle size={24}/>, colorClass: 'text-emerald-500 bg-emerald-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'whatsapp', title: 'WhatsApp', content: '' }]) },
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={24}/>, colorClass: 'text-pink-500 bg-pink-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'instagram', title: 'Instagram', content: '@name' }]) },
    { id: 'wifi', label: 'WLAN Login', icon: <Wifi size={24}/>, colorClass: 'text-blue-500 bg-blue-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'wifi', title: 'Gäste-WLAN', content: '', settings: { ssid: '', password: '' } }]) },
    { id: 'stamps', label: 'Stempelkarte', icon: <Award size={24}/>, colorClass: 'text-petrol bg-cream', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'stamp_card', title: 'Treuekarte', content: '', settings: { slots: 10, secretKey: 'SECRET' } }]) },
    { id: 'google', label: 'Maps Standort', icon: <MapPin size={24}/>, colorClass: 'text-red-500 bg-red-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'google_profile', title: 'Anfahrt', content: 'https://goo.gl/maps' }]) },
    { id: 'link', label: 'Smart Button', icon: <LinkIcon size={24}/>, colorClass: 'text-navy bg-zinc-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'custom_link', title: 'Webseite', content: 'https://', settings: { icon: 'link' } }]) }
  ];

  const designColors = ['#006699', '#12A9E0', '#11235A', '#ff4d4d', '#2ecc71', '#d4af37', '#000000', '#0D9488', '#78350F', '#4F46E5', '#DB2777'];
  const fontOptions: { id: FontStyle, label: string }[] = [
    { id: 'luxury', label: 'Luxury (Serif + Sans)' },
    { id: 'modern', label: 'Modern (Full Sans)' },
    { id: 'elegant', label: 'Elegant (Classic Serif)' }
  ];

  if (activeDept === '3d') {
    return (
      <div className="space-y-10 animate-in slide-in-from-left h-full overflow-y-auto pb-12 custom-scrollbar relative">
        <div className="bg-navy p-6 rounded-[2.5rem] text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-action mb-2">Technical Preview</p>
          <p className="text-xs font-medium leading-relaxed">Massives 40x40mm Design mit verstärktem Eyelet für maximale Haltbarkeit im 3D-Druck.</p>
        </div>
        <div className="space-y-6">
           <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2">Logo Upload (SVG)</label>
           <div className="relative h-32 rounded-3xl border-2 border-dashed border-navy/5 bg-white flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-petrol/30 transition-all overflow-hidden shadow-sm">
              <ImageIcon size={32} className="text-zinc-200" />
              <input type="file" accept=".svg" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
           </div>
        </div>
        {svgElements && (
          <div className="space-y-6">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2">Logo Farbe</label>
            <div className="flex flex-wrap gap-3">
              {designColors.map(c => (
                <button key={c} onClick={() => updateConfig('logoColor', c)} className={`w-10 h-10 rounded-full border-4 transition-all ${config.logoColor === c ? 'border-navy scale-110 shadow-lg' : 'border-white'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const visibleTemplates = showAllTemplates ? templates : templates.slice(0, 4);
  const visibleMagicButtons = showAllMagicButtons ? magicButtons : magicButtons.slice(0, 4);
  const visibleBlocks = showAllBlocks ? config.nfcBlocks : config.nfcBlocks.slice(0, 4);

  const activeEditingBlock = config.nfcBlocks.find(b => b.id === editingBlockId);

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
      {activeEditingBlock && (
        <PropertyPanel 
          block={activeEditingBlock} 
          onUpdate={u => updateConfig('nfcBlocks', config.nfcBlocks.map(b => b.id === activeEditingBlock.id ? {...b, ...u} : b))}
          onClose={() => setEditingBlockId(null)}
        />
      )}

      <div className="flex-1 overflow-y-auto p-0 space-y-12 custom-scrollbar pb-24">
        <section className="bg-navy p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group mx-4 mt-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] italic text-action">Digital Studio</span>
            <p className="text-[12px] font-bold mt-2 leading-relaxed">Personalisiere dein interaktives Business-Erlebnis.</p>
        </section>

        {/* 1. DESIGN & TYPO */}
        <section className="bg-white border border-navy/5 p-7 rounded-[2.5rem] space-y-8 shadow-sm mx-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <Palette size={14} className="text-petrol" /> Design & Typografie
            </div>
            <div className="space-y-3">
            <label className="text-[9px] font-black uppercase text-zinc-400 px-1">Markenfarbe</label>
            <div className="flex flex-wrap gap-2.5">
                {designColors.map(c => (
                <button key={c} onClick={() => updateConfig('accentColor', c)} className={`w-8 h-8 rounded-full border-2 transition-all ${config.accentColor === c ? 'border-navy scale-110 ring-2 ring-navy/10' : 'border-white'}`} style={{ backgroundColor: c }} />
                ))}
            </div>
            </div>
            <div className="space-y-3">
            <label className="text-[9px] font-black uppercase text-zinc-400 px-1">Schriftart</label>
            <div className="grid grid-cols-1 gap-2">
                {fontOptions.map(f => (
                <button key={f.id} onClick={() => updateConfig('fontStyle', f.id)} className={`p-4 rounded-2xl border text-[10px] font-bold text-left transition-all ${config.fontStyle === f.id ? 'bg-navy text-white border-navy shadow-md' : 'bg-cream text-zinc-500 border-navy/5 hover:border-petrol/30'}`}>
                    {f.label}
                </button>
                ))}
            </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-navy/5">
                <label className="text-[9px] font-black uppercase text-zinc-400">Midnight Mode</label>
                <button onClick={() => updateConfig('theme', config.theme === 'light' ? 'dark' : 'light')} className="w-14 h-8 bg-cream border border-navy/5 rounded-full relative flex items-center px-1 transition-all">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${config.theme === 'dark' ? 'translate-x-6 bg-navy text-white shadow-xl' : 'bg-white text-petrol shadow-sm'}`}>
                        {config.theme === 'light' ? <Sun size={12}/> : <Moon size={12}/>}
                    </div>
                </button>
            </div>
        </section>

        {/* 2. SMART TEMPLATES */}
        <section className="space-y-5 px-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3 flex items-center gap-2">
            <Sparkles size={12} className="text-petrol" /> Smart Templates
            </label>
            <div className="grid grid-cols-2 gap-3">
            {visibleTemplates.map(t => (
                <button key={t.id} onClick={t.action} className="p-5 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-3 hover:border-petrol/30 transition-all group shadow-sm text-center active:scale-95">
                <div className="text-petrol group-hover:scale-110 transition-transform bg-cream p-3 rounded-2xl">{t.icon}</div>
                <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase leading-tight block">{t.label}</span>
                    <span className="text-[6px] text-zinc-400 font-bold uppercase block tracking-tighter">{t.company}</span>
                </div>
                </button>
            ))}
            </div>
            {templates.length > 4 && (
            <button onClick={() => setShowAllTemplates(!showAllTemplates)} className="w-full py-4 border border-dashed border-navy/10 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase text-zinc-400 hover:bg-cream transition-all group">
                {showAllTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAllTemplates ? 'Templates einklappen' : `${templates.length - 4} weitere Templates`}
            </button>
            )}
        </section>

        {/* 3. BASIS INHALTE */}
        <section className="space-y-5 px-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3">Basis Inhalte</label>
            <div className="grid grid-cols-3 gap-3">
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'headline', title: '', content: 'Titel' }])} className="p-4 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-2 hover:border-petrol/30 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-8 h-8 bg-cream rounded-xl flex items-center justify-center text-navy"><Type size={16}/></div>
                <span className="text-[7px] font-black uppercase">Überschrift</span>
            </button>
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'text', title: '', content: 'Dein Text hier...' }])} className="p-4 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-2 hover:border-petrol/30 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-8 h-8 bg-cream rounded-xl flex items-center justify-center text-navy"><Box size={16}/></div>
                <span className="text-[7px] font-black uppercase">Textblock</span>
            </button>
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'image', title: '', content: '', imageUrl: '' }])} className="p-4 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-2 hover:border-petrol/30 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-8 h-8 bg-cream rounded-xl flex items-center justify-center text-navy"><ImageIcon size={16}/></div>
                <span className="text-[7px] font-black uppercase">Bild</span>
            </button>
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'map', title: '', content: '', settings: { address: '' } }])} className="p-4 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-2 hover:border-petrol/30 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-8 h-8 bg-cream rounded-xl flex items-center justify-center text-navy"><MapIcon size={16}/></div>
                <span className="text-[7px] font-black uppercase">Karte</span>
            </button>
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'spacer', title: '', content: '', settings: { height: 20 } }])} className="p-4 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-2 hover:border-petrol/30 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-8 h-8 bg-cream rounded-xl flex items-center justify-center text-navy"><MoveVertical size={16}/></div>
                <span className="text-[7px] font-black uppercase">Abstand</span>
            </button>
            </div>
        </section>

        {/* 4. MAGIC BUTTONS */}
        <section className="space-y-5 px-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3">Interaktive Magic Buttons</label>
            <div className="grid grid-cols-2 gap-3">
            {visibleMagicButtons.map(btn => (
                <button key={btn.id} onClick={btn.action} className={`p-6 bg-white border border-navy/5 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group shadow-sm hover:shadow-xl hover:scale-[1.02] active:scale-95`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${btn.colorClass} shadow-inner`}>
                    {btn.icon}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest">{btn.label}</span>
                </button>
            ))}
            </div>
            {magicButtons.length > 4 && (
            <button onClick={() => setShowAllMagicButtons(!showAllMagicButtons)} className="w-full py-4 border border-dashed border-navy/10 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase text-zinc-400 hover:bg-cream transition-all group">
                {showAllMagicButtons ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAllMagicButtons ? 'Buttons einklappen' : `${magicButtons.length - 4} weitere Buttons`}
            </button>
            )}
        </section>

        <section className="bg-white border border-navy/5 p-7 rounded-[2.5rem] space-y-6 shadow-sm mx-4">
            <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-1">Profil Überschrift</label>
            <input type="text" value={config.profileTitle} onChange={e => updateConfig('profileTitle', e.target.value)} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-cream font-black uppercase" placeholder="DEINE BRAND" />
            </div>
            <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-1">Profil Logo Icon</label>
            <IconSelector selected={config.profileIcon} onSelect={i => updateConfig('profileIcon', i)} />
            </div>
        </section>

        {/* 5. INHALTS-REIHENFOLGE */}
        <section className="space-y-6 px-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3 flex items-center justify-between">
            <span>Inhalts-Reihenfolge</span>
            <span className="text-[8px] bg-navy text-white px-2.5 py-1 rounded-full">{config.nfcBlocks.length}</span>
            </label>
            <div className="space-y-3">
            {visibleBlocks.map(block => (
                <div key={block.id} className="group relative">
                <div onClick={() => setEditingBlockId(block.id)} className="p-5 bg-white border border-navy/5 rounded-[2rem] flex items-center gap-4 hover:border-petrol/30 transition-all cursor-pointer shadow-sm">
                    <GripVertical size={14} className="text-zinc-200 group-hover:text-petrol" />
                    <div className="flex-1 flex flex-col">
                    <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{block.type}</span>
                    <span className="text-[10px] font-bold text-navy truncate">{block.title || block.content || 'Kein Inhalt'}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id)) }} className="p-2 text-zinc-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                </div>
                </div>
            ))}
            </div>
            {config.nfcBlocks.length > 4 && (
            <button onClick={() => setShowAllBlocks(!showAllBlocks)} className="w-full py-4 border border-dashed border-navy/10 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase text-zinc-400 hover:bg-cream transition-all group">
                {showAllBlocks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAllBlocks ? 'Liste einklappen' : `${config.nfcBlocks.length - 4} weitere Elemente`}
            </button>
            )}
        </section>
      </div>
    </div>
  );
};
