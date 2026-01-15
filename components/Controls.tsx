
import React, { useState } from 'react';
import { ModelConfig, SVGPathData, BaseType, NFCBlock, MagicButtonType, Department, ActionIcon, FontStyle, ProfileTheme } from '../types';
import { Box, Type, Plus, Minus, Trash2, Smartphone, Wifi, Star, GripVertical, ChevronDown, Link as LinkIcon, Image as ImageIcon, Briefcase, Zap, Sliders, Award, MessageCircle, MapPin, Globe, ShoppingCart, Info, User, Mail, Phone, Loader2, ChevronUp, Instagram, Utensils, Sparkles, Shield, Layout, Camera, Dumbbell, Heart, Activity, Palette, Sun, Moon, Scissors, Coffee, Stethoscope, Hammer } from 'lucide-react';
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
    { id: 'zap', icon: Zap }
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {icons.map(i => (
        <button key={i.id} onClick={() => onSelect(i.id)} className={`p-2.5 rounded-xl flex items-center justify-center border transition-all ${selected === i.id ? 'bg-petrol text-white border-petrol shadow-lg scale-105' : 'bg-white border-navy/5 text-zinc-400 hover:border-petrol/30'}`}>
          <i.icon size={16} />
        </button>
      ))}
    </div>
  );
};

const NFCBlockEditor: React.FC<{ block: NFCBlock, onUpdate: (u: Partial<NFCBlock>) => void, onDelete: () => void }> = ({ block, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const getIcon = () => {
    if (block.type === 'text') return <Type size={18}/>;
    if (block.type === 'image') return <ImageIcon size={18}/>;
    switch (block.buttonType) {
      case 'stamp_card': return <Award size={18} className="text-petrol" />;
      case 'review': return <Star size={18} className="text-yellow-500" />;
      case 'wifi': return <Wifi size={18} className="text-blue-500" />;
      case 'google_profile': return <MapPin size={18} className="text-red-500" />;
      case 'whatsapp': return <MessageCircle size={18} className="text-emerald-500" />;
      case 'instagram': return <Instagram size={18} className="text-pink-500" />;
      default: return <LinkIcon size={18} className="text-petrol" />;
    }
  };

  return (
    <div className={`transition-all duration-300 ${expanded ? 'bg-white ring-2 ring-petrol shadow-2xl scale-[1.02] z-10' : 'bg-white/50 border border-navy/5 shadow-sm'} rounded-[2rem] overflow-hidden`}>
      <div onClick={() => setExpanded(!expanded)} className="p-5 flex items-center justify-between cursor-pointer group">
        <div className="flex items-center gap-4">
          <GripVertical size={14} className="text-zinc-200 group-hover:text-petrol transition-colors" />
          <div className="p-3 bg-cream rounded-2xl text-petrol">
            {getIcon()}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy">
              {block.type === 'text' ? 'Fließtext' : block.type === 'image' ? 'Bild / Foto' : (block.buttonType === 'custom_link' ? 'Button' : block.buttonType)}
            </span>
            <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[160px]">{block.title || block.content || 'Inhalt bearbeiten...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className={`p-2 transition-transform duration-300 ${expanded ? 'rotate-180 text-petrol' : 'text-zinc-300'}`}><ChevronDown size={20}/></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-zinc-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-8 border-t border-navy/5 bg-cream/30 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Überschrift</label>
              <input type="text" value={block.title || ''} onChange={e => onUpdate({ title: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-black" placeholder="Titel des Elements" />
            </div>

            {block.type === 'text' && (
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inhalt / Nachricht</label>
                <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs h-32 bg-white resize-none font-medium leading-relaxed" placeholder="Dein Text hier..." />
              </div>
            )}

            {block.type === 'image' && (
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Medien-Datei</label>
                <div className="relative h-48 rounded-[2rem] border-2 border-dashed border-navy/10 bg-white flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-petrol/30 transition-all overflow-hidden shadow-inner">
                  {block.imageUrl ? (
                    <img src={block.imageUrl} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-300">
                      {isUploading ? <Loader2 className="animate-spin text-petrol" /> : <Plus size={32} strokeWidth={1.5} />}
                      <span className="text-[8px] font-black uppercase">Foto auswählen</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={async (e) => {
                     const file = e.target.files?.[0]; if(!file) return;
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

            {(block.type === 'magic_button' || block.buttonType) && (
              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Ziel / URL / Wert</label>
                  <input type="text" value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" placeholder="z.B. https://..." />
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
      )}
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ activeDept, config, setConfig, svgElements, onUpload, onUpdateColor }) => {
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [showAllMagicButtons, setShowAllMagicButtons] = useState(false);
  const [showAllBlocks, setShowAllBlocks] = useState(false);

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
        id: 'cafe', label: 'Café & Bäckerei', icon: <Utensils size={20} />, company: 'The Morning Brew',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'c-img', type: 'image', title: 'Morning Specials', content: '', imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800' },
            { id: 'c-btn-stamps', type: 'magic_button', buttonType: 'stamp_card', title: '10. Kaffee gratis', content: '', settings: { slots: 10, secretKey: 'BREW' } },
            { id: 'c-btn-wifi', type: 'magic_button', buttonType: 'wifi', title: 'Coworking WLAN', content: '', settings: { ssid: 'MorningBrew_WiFi', password: 'Coffee' } }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'MORNING BREW', profileIcon: 'utensils', headerImageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#6F4E37' }));
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
    },
    {
        id: 'medical', label: 'Medizin/Health', icon: <Heart size={20} />, company: 'Praxis Dr. Vital',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'm-text', type: 'text', title: 'HERZLICH WILLKOMMEN', content: 'Ihre Gesundheit ist unser Anliegen. Termine online buchen.' },
            { id: 'm-btn-book', type: 'magic_button', buttonType: 'custom_link', title: 'Termin buchen', content: 'https://doctolib.de', settings: { icon: 'user' } },
            { id: 'm-btn-call', type: 'magic_button', buttonType: 'custom_link', title: 'Notfall-Kontakt', content: 'tel:+4912345678', settings: { icon: 'phone' } }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'DR. VITAL PRAXIS', profileIcon: 'heart', headerImageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#0D9488' }));
        }
    },
    {
        id: 'barber', label: 'Barber & Cut', icon: <Camera size={20} />, company: 'Gentleman\'s Club',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'b-img', type: 'image', title: 'Latest Styles', content: '', imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800' },
            { id: 'b-btn-book', type: 'magic_button', buttonType: 'custom_link', title: 'Nächster Schnitt', content: 'https://shore.com', settings: { icon: 'camera' } },
            { id: 'b-btn-insta', type: 'magic_button', buttonType: 'instagram', title: '@gentlemans_barber', content: '@gentlemans_barber' }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'BARBER CLUB', profileIcon: 'camera', headerImageUrl: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#1C1C1C' }));
        }
    },
    {
        id: 'artisan', label: 'Manufaktur', icon: <Zap size={20} />, company: 'Holzkunst Müller',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'a-text', type: 'text', title: 'ECHTES HANDWERK', content: 'Jedes Stück ein Unikat. Handgefertigt im Schwarzwald.' },
            { id: 'a-btn-shop', type: 'magic_button', buttonType: 'custom_link', title: 'Etsy Shop', content: 'https://etsy.com', settings: { icon: 'shopping-cart' } },
            { id: 'a-btn-insta', type: 'magic_button', buttonType: 'instagram', title: 'Arbeitsschritte', content: '@holzkunst_muller' }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'MÜLLER KUNST', profileIcon: 'zap', headerImageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#78350F' }));
        }
    },
    {
      id: 'beauty', label: 'Beauty Salon', icon: <Heart size={20} />, company: 'Skin & Glow Spa',
      action: () => {
        const blocks: NFCBlock[] = [
          { id: 'b-img', type: 'image', title: 'Wellness', content: '', imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800' },
          { id: 'b-btn-book', type: 'magic_button', buttonType: 'custom_link', title: 'Termin buchen', content: 'https://treatwell.de', settings: { icon: 'heart' } },
          { id: 'b-btn-insta', type: 'magic_button', buttonType: 'instagram', title: '@skin_glow_spa', content: '@skin_glow' }
        ];
        setConfig(prev => ({ ...prev, profileTitle: 'SKIN & GLOW SPA', profileIcon: 'heart', headerImageUrl: 'https://images.unsplash.com/photo-1522335789183-b11407384377?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#D4AF37' }));
      }
    },
    {
        id: 'fitness', label: 'Fitness Hub', icon: <Dumbbell size={20} />, company: 'Peak Performance',
        action: () => {
          const blocks: NFCBlock[] = [
            { id: 'gym-text', type: 'text', title: 'BE THE BEST', content: 'Dein Training auf dem nächsten Level. Starte heute.' },
            { id: 'gym-btn-wa', type: 'magic_button', buttonType: 'whatsapp', title: 'Probetraining', content: '+49123456789' },
            { id: 'gym-btn-insta', type: 'magic_button', buttonType: 'instagram', title: '@peak_gym', content: '@peak_performance' }
          ];
          setConfig(prev => ({ ...prev, profileTitle: 'PEAK FITNESS', profileIcon: 'dumbbell', headerImageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=1200', nfcBlocks: blocks, accentColor: '#ff4d4d' }));
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

  const designColors = ['#006699', '#12A9E0', '#11235A', '#ff4d4d', '#2ecc71', '#d4af37', '#000000', '#0D9488', '#78350F'];
  const fontOptions: { id: FontStyle, label: string }[] = [
    { id: 'luxury', label: 'Luxury (Serif + Sans)' },
    { id: 'modern', label: 'Modern (Full Sans)' },
    { id: 'elegant', label: 'Elegant (Classic Serif)' }
  ];

  if (activeDept === '3d') {
    return (
      <div className="space-y-10 animate-in slide-in-from-left h-full overflow-y-auto pb-12 custom-scrollbar">
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

  return (
    <div className="space-y-12 animate-in slide-in-from-right h-full overflow-y-auto pb-24 custom-scrollbar">
      <section className="bg-navy p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] italic text-action">Digital Studio</span>
        <p className="text-[12px] font-bold mt-2 leading-relaxed">Personalisiere dein interaktives Business-Erlebnis.</p>
      </section>

      {/* 1. DESIGN & TYPO */}
      <section className="bg-white border border-navy/5 p-7 rounded-[2.5rem] space-y-8 shadow-sm">
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
      <section className="space-y-5">
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

      {/* 3. BASIS INHALTE (NEU) */}
      <section className="space-y-5">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3">Basis Inhalte</label>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'text', title: 'Neuer Text', content: 'Inhalt hier einfügen...' }])} className="p-5 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-3 hover:border-petrol/30 transition-all shadow-sm active:scale-95">
             <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-navy"><Type size={20}/></div>
             <span className="text-[8px] font-black uppercase">Fließtext</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'image', title: 'Galeriebild', content: '', imageUrl: '' }])} className="p-5 bg-white border border-navy/5 rounded-[2rem] flex flex-col items-center gap-3 hover:border-petrol/30 transition-all shadow-sm active:scale-95">
             <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-navy"><ImageIcon size={20}/></div>
             <span className="text-[8px] font-black uppercase">Bild / Foto</span>
          </button>
        </div>
      </section>

      {/* 4. MAGIC BUTTONS */}
      <section className="space-y-5">
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

      <section className="bg-white border border-navy/5 p-7 rounded-[2.5rem] space-y-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-1">Profil Überschrift</label>
          <input type="text" value={config.profileTitle} onChange={e => updateConfig('profileTitle', e.target.value)} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-cream font-black uppercase" placeholder="DEINE BRAND" />
        </div>
        <div className="space-y-3">
          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-1">Profil Logo Icon</label>
          <IconSelector selected={config.profileIcon} onSelect={i => updateConfig('profileIcon', i)} />
        </div>
      </section>

      {/* 5. INHALTS-REIHENFOLGE & DETAIL EDITING */}
      <section className="space-y-6">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3 flex items-center justify-between">
          <span>Inhalts-Reihenfolge</span>
          <span className="text-[8px] bg-navy text-white px-2.5 py-1 rounded-full">{config.nfcBlocks.length}</span>
        </label>
        <div className="space-y-5">
          {visibleBlocks.map(block => (
            <NFCBlockEditor 
              key={block.id} block={block} 
              onUpdate={u => updateConfig('nfcBlocks', config.nfcBlocks.map(b => b.id === block.id ? {...b, ...u} : b))}
              onDelete={() => updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id))}
            />
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
  );
};
