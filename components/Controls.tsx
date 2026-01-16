
import React, { useState } from 'react';
import { ModelConfig, SVGPathData, BaseType, NFCBlock, MagicButtonType, Department, ActionIcon, FontStyle, ProfileTheme } from '../types';
import { Box, Type, Plus, Minus, Trash2, Smartphone, Wifi, Star, GripVertical, ChevronDown, Link as LinkIcon, Image as ImageIcon, Briefcase, Zap, Sliders, Award, MessageCircle, MapPin, Globe, ShoppingCart, Info, User, Mail, Phone, Loader2, ChevronUp, Instagram, Utensils, Sparkles, Shield, Layout, Camera, Dumbbell, Heart, Activity, Palette, Sun, Moon, Scissors, Coffee, Stethoscope, Hammer, ArrowLeft, MoveVertical, Map as MapIcon, Calendar, Clock, Hash, Lock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ControlsProps {
  activeDept: Department;
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  svgElements: SVGPathData[] | null;
  onUpload: (e: any) => void;
  onUpdateColor: (id: string, color: string) => void;
}

const generateSecureKey = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let result = 'ND-';
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

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
    <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
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
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-navy">Bearbeiten</h2>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Element Titel</label>
          <input type="text" value={block.title || ''} onChange={e => onUpdate({ title: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-cream font-black" placeholder="Optionaler Titel" />
        </div>

        {block.type === 'text' && (
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inhalt</label>
            <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs h-32 md:h-40 bg-white resize-none font-medium leading-relaxed" placeholder="Dein Text..." />
          </div>
        )}

        {block.type === 'headline' && (
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Überschrift</label>
            <input type="text" value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" />
          </div>
        )}

        {block.type === 'image' && (
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Bild Upload</label>
            <div className="relative h-48 md:h-64 rounded-[2rem] border-2 border-dashed border-navy/10 bg-cream/50 flex flex-col items-center justify-center gap-3 group cursor-pointer hover:border-petrol/30 transition-all overflow-hidden shadow-inner">
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
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Standort</label>
            <input type="text" value={block.settings?.address || ''} onChange={e => onUpdate({ settings: { ...block.settings, address: e.target.value } })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" placeholder="Adresse hier eingeben" />
          </div>
        )}

        {block.type === 'spacer' && (
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Höhe (px)</label>
            <div className="flex items-center gap-4">
              <input type="range" min="10" max="100" step="10" value={block.settings?.height || 20} onChange={e => onUpdate({ settings: { ...block.settings, height: parseInt(e.target.value) } })} className="flex-1 accent-petrol" />
              <span className="text-xs font-black text-navy">{block.settings?.height || 20}</span>
            </div>
          </div>
        )}

        {block.type === 'magic_button' && (
          <div className="space-y-6">
            {block.buttonType !== 'stamp_card' && (
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inhalt (URL/Tel)</label>
                <input type="text" value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" />
              </div>
            )}
            
            {block.buttonType === 'stamp_card' && (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Hash size={12}/> Stempel Slots
                  </label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="5" max="15" step="1" value={block.settings?.slots || 10} onChange={e => onUpdate({ settings: { ...block.settings, slots: parseInt(e.target.value) } })} className="flex-1 accent-petrol" />
                    <span className="text-xs font-black text-navy">{block.settings?.slots || 10}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Lock size={12}/> Geheimer Key (40 Zeichen)
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={block.settings?.secretKey || ''} onChange={e => onUpdate({ settings: { ...block.settings, secretKey: e.target.value } })} className="flex-1 p-4 rounded-xl border border-navy/5 text-[9px] bg-white font-mono break-all" placeholder="Key..." />
                    <button 
                      onClick={() => onUpdate({ settings: { ...block.settings, secretKey: generateSecureKey() } })}
                      className="p-4 bg-navy text-white rounded-xl hover:bg-petrol transition-colors shrink-0"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

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
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const updateConfig = (key: keyof ModelConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));

  const magicButtons = [
    { id: 'review', label: 'Google Rezension', icon: <Star size={24} fill="currentColor" />, colorClass: 'text-yellow-500 bg-yellow-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'review', title: 'Bewerten', content: 'https://google.com' }]) },
    { id: 'whatsapp', label: 'WhatsApp Chat', icon: <MessageCircle size={24}/>, colorClass: 'text-emerald-500 bg-emerald-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'whatsapp', title: 'WhatsApp', content: '' }]) },
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={24}/>, colorClass: 'text-pink-500 bg-pink-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'instagram', title: 'Instagram', content: '@name' }]) },
    { id: 'wifi', label: 'WLAN Login', icon: <Wifi size={24}/>, colorClass: 'text-blue-500 bg-blue-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'wifi', title: 'Gäste-WLAN', content: '', settings: { ssid: '', password: '' } }]) },
    { id: 'stamps', label: 'Stempelkarte', icon: <Award size={24}/>, colorClass: 'text-petrol bg-cream', action: () => {
      updateConfig('nfcBlocks', [...config.nfcBlocks, { id: `block_${Date.now()}_${Math.random()}`, type: 'magic_button', buttonType: 'stamp_card', title: 'Treuekarte', content: '', settings: { slots: 10, secretKey: generateSecureKey() } }]);
    }},
    { id: 'google', label: 'Maps Standort', icon: <MapPin size={24}/>, colorClass: 'text-red-500 bg-red-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'google_profile', title: 'Anfahrt', content: 'https://goo.gl/maps' }]) },
    { id: 'link', label: 'Smart Button', icon: <LinkIcon size={24}/>, colorClass: 'text-navy bg-zinc-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'custom_link', title: 'Webseite', content: 'https://', settings: { icon: 'link' } }]) }
  ];

  const designColors = ['#006699', '#12A9E0', '#11235A', '#ff4d4d', '#2ecc71', '#d4af37', '#000000', '#0D9488', '#78350F', '#4F46E5', '#DB2777'];

  if (activeDept === '3d') {
    return (
      <div className="space-y-10 animate-in slide-in-from-left h-full overflow-y-auto pb-12 custom-scrollbar">
        <section className="bg-navy p-6 md:p-7 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] italic text-action">3D Design Studio</span>
            <p className="text-[11px] md:text-[12px] font-bold mt-2 leading-relaxed">Passe die Hardware deiner NFeC Card an.</p>
        </section>

        <div className="space-y-6">
           <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2">Logo Upload (SVG)</label>
           <div className="relative h-28 md:h-32 rounded-3xl border-2 border-dashed border-navy/5 bg-white flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-petrol/30 transition-all overflow-hidden shadow-sm">
              <ImageIcon size={28} className="text-zinc-200" />
              <input type="file" accept=".svg" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
           </div>
           {!svgElements && (
             <p className="text-[8px] text-zinc-400 font-bold px-2 italic uppercase">Optional: Überspringe diesen Schritt für Standard-Design.</p>
           )}
        </div>

        <div className="space-y-6">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2">Hardware-Farbe</label>
          <div className="flex flex-wrap gap-2.5 px-2">
            {designColors.map(c => (
              <button key={c} onClick={() => updateConfig('logoColor', c)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-4 transition-all ${config.logoColor === c ? 'border-navy scale-110 shadow-lg' : 'border-white shadow-sm'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

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

      <div className="flex-1 overflow-y-auto p-0 space-y-8 md:space-y-10 custom-scrollbar pb-24">
        <section className="bg-navy p-6 md:p-7 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group mx-4 mt-2">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] italic text-action">Profile Studio</span>
            <p className="text-[11px] md:text-[12px] font-bold mt-2 leading-relaxed">Gestalte den Inhalt deiner NFeC Card.</p>
        </section>

        {/* 1. DESIGN & TYPO */}
        <section className="bg-white border border-navy/5 p-6 md:p-7 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 shadow-sm mx-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <Palette size={14} className="text-petrol" /> Design
            </div>
            <div className="space-y-3">
            <label className="text-[9px] font-black uppercase text-zinc-400 px-1">Profil-Akzentfarbe</label>
            <div className="flex flex-wrap gap-2">
                {designColors.map(c => (
                <button key={c} onClick={() => updateConfig('accentColor', c)} className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 transition-all ${config.accentColor === c ? 'border-navy scale-110 ring-2 ring-navy/10' : 'border-white'}`} style={{ backgroundColor: c }} />
                ))}
            </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-navy/5">
                <label className="text-[9px] font-black uppercase text-zinc-400">Dark Mode</label>
                <button onClick={() => updateConfig('theme', config.theme === 'light' ? 'dark' : 'light')} className="w-12 h-7 md:w-14 md:h-8 bg-cream border border-navy/5 rounded-full relative flex items-center px-1 transition-all">
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center transition-all ${config.theme === 'dark' ? 'translate-x-5 md:translate-x-6 bg-navy text-white shadow-xl' : 'bg-white text-petrol shadow-sm'}`}>
                        {config.theme === 'light' ? <Sun size={10}/> : <Moon size={10}/>}
                    </div>
                </button>
            </div>
        </section>

        {/* 2. BASIS INHALTE */}
        <section className="space-y-4 px-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3 flex items-center gap-2">
               <Layout size={12} className="text-petrol" /> Bausteine
            </label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'headline', content: 'Neuer Titel' }])} className="p-3 md:p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-cream rounded-lg md:rounded-xl flex items-center justify-center text-navy"><Type size={14}/></div>
                <span className="text-[7px] font-black uppercase">Headline</span>
            </button>
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'text', content: 'Text...' }])} className="p-3 md:p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-cream rounded-lg md:rounded-xl flex items-center justify-center text-navy"><Box size={14}/></div>
                <span className="text-[7px] font-black uppercase">Text</span>
            </button>
            <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'image', content: '', imageUrl: '' }])} className="p-3 md:p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm active:scale-95 text-center">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-cream rounded-lg md:rounded-xl flex items-center justify-center text-navy"><ImageIcon size={14}/></div>
                <span className="text-[7px] font-black uppercase">Bild</span>
            </button>
            </div>
        </section>

        {/* 3. MAGIC BUTTONS */}
        <section className="space-y-4 px-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3 flex items-center gap-2">
               <Sparkles size={12} className="text-action" /> Magic Buttons
            </label>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
            {magicButtons.slice(0, 4).map(btn => (
                <button key={btn.id} onClick={btn.action} className={`p-4 md:p-5 bg-white border border-navy/5 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center gap-3 transition-all group shadow-sm hover:shadow-xl active:scale-95`}>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${btn.colorClass} shadow-inner`}>
                    {btn.icon}
                </div>
                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">{btn.label}</span>
                </button>
            ))}
            </div>
        </section>

        {/* Profile List */}
        <section className="space-y-3 px-4 pb-20">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 px-3">Live Struktur</label>
          {config.nfcBlocks.map((block, i) => (
            <div key={block.id} className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-navy/5 flex items-center gap-3 md:gap-4 shadow-sm group">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-cream flex items-center justify-center text-zinc-400 text-[10px] font-black">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] md:text-[10px] font-black text-navy uppercase truncate">{block.title || block.type}</p>
                <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest truncate">{block.content || '...'}</p>
              </div>
              <button onClick={() => setEditingBlockId(block.id)} className="p-1.5 md:p-2 hover:bg-cream rounded-lg text-petrol transition-colors">
                <Sliders size={14} />
              </button>
              <button onClick={() => updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id))} className="p-1.5 md:p-2 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
