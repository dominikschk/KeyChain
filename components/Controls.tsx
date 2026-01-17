
import React, { useState } from 'react';
import { ModelConfig, SVGPathData, NFCBlock, Department, ActionIcon, NFCTemplate } from '../types';
import { Box, Type, Trash2, Link as LinkIcon, Image as ImageIcon, Sliders, Award, MessageCircle, Globe, ShoppingCart, Info, User, Mail, Phone, Loader2, Instagram, Utensils, Shield, Layout, Camera, Dumbbell, Heart, Palette, ArrowLeft, RefreshCw, Star, MapPin, Wifi, CreditCard, Briefcase, Zap, Sparkles } from 'lucide-react';
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
    { id: 'instagram', icon: Instagram }, { id: 'shield', icon: Shield }, { id: 'heart', icon: Heart }
  ];
  return (
    <div className="grid grid-cols-5 gap-1.5 md:gap-2">
      {icons.map(i => (
        <button key={i.id} onClick={() => onSelect(i.id)} className={`p-2 rounded-lg flex items-center justify-center border transition-all ${selected === i.id ? 'bg-petrol text-white border-petrol' : 'bg-white border-navy/5 text-zinc-300'}`}>
          <i.icon size={14} />
        </button>
      ))}
    </div>
  );
};

const PropertyPanel: React.FC<{ block: NFCBlock, onUpdate: (u: Partial<NFCBlock>) => void, onClose: () => void }> = ({ block, onUpdate, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="fixed md:absolute inset-0 bg-white z-[900] flex flex-col animate-in slide-in-from-right duration-300 h-full overflow-hidden">
      <header className="p-4 border-b border-navy/5 flex items-center justify-between shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3">
           <button onClick={onClose} className="p-2 hover:bg-cream rounded-full transition-colors"><ArrowLeft size={20}/></button>
           <h2 className="text-[10px] font-black uppercase tracking-widest text-navy">Edit {block.buttonType || block.type}</h2>
        </div>
        <button onClick={onClose} className="text-[9px] font-black uppercase text-petrol font-bold px-4 py-2 hover:bg-petrol/5 rounded-lg transition-colors">Fertig</button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-container pb-44">
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Beschriftung</label>
          <input type="text" value={block.title || ''} placeholder="Titel des Moduls..." onChange={e => onUpdate({ title: e.target.value })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-cream font-bold outline-none" />
        </div>

        {(block.type === 'text' || block.type === 'headline') && (
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Inhalt</label>
            <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-3 rounded-xl border border-navy/5 text-xs h-32 bg-white resize-none font-medium leading-relaxed outline-none" />
          </div>
        )}

        {block.type === 'image' && (
          <div className="space-y-3">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Medien</label>
            <div className="relative h-44 rounded-2xl border-2 border-dashed border-navy/5 bg-cream flex flex-col items-center justify-center gap-2 overflow-hidden shadow-inner cursor-pointer group">
              {block.imageUrl ? (
                <img src={block.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-zinc-300">
                  {isUploading ? <Loader2 className="animate-spin text-petrol" /> : <ImageIcon size={32} strokeWidth={1} />}
                  <span className="text-[7px] font-black uppercase">Bild hochladen</span>
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
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Adresse</label>
            <input type="text" value={block.settings?.address || ''} placeholder="Musterstraße 1, 12345 Stadt" onChange={e => onUpdate({ settings: { ...block.settings, address: e.target.value } })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
          </div>
        )}

        {block.type === 'magic_button' && (
          <div className="space-y-5">
            {block.buttonType === 'wifi' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-zinc-400 px-1">WLAN Name (SSID)</label>
                  <input type="text" value={block.settings?.ssid || ''} onChange={e => onUpdate({ settings: { ...block.settings, ssid: e.target.value } })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-zinc-400 px-1">WLAN Passwort</label>
                  <input type="password" value={block.settings?.password || ''} onChange={e => onUpdate({ settings: { ...block.settings, password: e.target.value } })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                </div>
              </div>
            )}

            {['custom_link', 'instagram', 'whatsapp', 'review', 'google_profile'].includes(block.buttonType || '') && (
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Ziel (URL / Telefon / Handle)</label>
                <input type="text" value={block.content} placeholder={block.buttonType === 'instagram' ? '@deinname' : 'https://...'} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
              </div>
            )}

            {block.buttonType === 'action_card' && (
              <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Voller Name</label>
                   <input type="text" value={block.settings?.name || ''} onChange={e => onUpdate({ settings: { ...block.settings, name: e.target.value } })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Position</label>
                   <input type="text" value={block.settings?.description || ''} onChange={e => onUpdate({ settings: { ...block.settings, description: e.target.value } })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Telefon</label>
                   <input type="text" value={block.settings?.phone || ''} onChange={e => onUpdate({ settings: { ...block.settings, phone: e.target.value } })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Email</label>
                   <input type="text" value={block.content || ''} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                 </div>
              </div>
            )}

            {block.buttonType === 'custom_link' && (
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Icon</label>
                <IconSelector selected={block.settings?.icon || 'link'} onSelect={i => onUpdate({ settings: { ...block.settings, icon: i } })} />
              </div>
            )}

            {block.buttonType === 'stamp_card' && (
               <div className="bg-cream p-4 rounded-xl space-y-4 border border-navy/5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[8px] font-black uppercase text-zinc-400">Anzahl Felder</label>
                      <span className="text-[10px] font-black text-petrol">{block.settings?.slots || 10}</span>
                    </div>
                    <input type="range" min="5" max="15" value={block.settings?.slots || 10} onChange={e => onUpdate({ settings: { ...block.settings, slots: parseInt(e.target.value) } })} className="w-full accent-petrol" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Admin Code (Geheim)</label>
                    <div className="flex gap-2">
                      <input type="text" value={block.settings?.secretKey || ''} readOnly className="flex-1 p-2 rounded bg-white text-[7px] font-mono border border-navy/5" />
                      <button onClick={() => onUpdate({ settings: { ...block.settings, secretKey: generateSecureKey() } })} className="p-2 bg-navy text-white rounded-lg active:scale-90 transition-transform"><RefreshCw size={12}/></button>
                    </div>
                  </div>
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

  const industryTemplates = [
    {
      id: 'gastro',
      name: 'Gastronomie',
      icon: <Utensils size={18} />,
      blocks: [
        { id: 'g1', type: 'headline', content: 'Willkommen', title: 'Genuss pur' },
        { id: 'g2', type: 'magic_button', buttonType: 'review', title: 'Bewerte uns bei Google', content: '' },
        { id: 'g3', type: 'magic_button', buttonType: 'wifi', title: 'Kostenloses Gäste-WLAN', content: '', settings: { ssid: 'Guest-WiFi' } },
        { id: 'g4', type: 'magic_button', buttonType: 'whatsapp', title: 'Tisch reservieren', content: '+49' },
        { id: 'g5', type: 'magic_button', buttonType: 'custom_link', title: 'Unsere Speisekarte', content: 'https://', settings: { icon: 'utensils' } }
      ],
      accent: '#0D9488'
    },
    {
      id: 'engineer',
      name: 'Ingenieur / Business',
      icon: <Briefcase size={18} />,
      blocks: [
        { id: 'e1', type: 'headline', content: 'Expertise & Präzision', title: 'Ingenieurbüro' },
        { id: 'e2', type: 'magic_button', buttonType: 'action_card', title: 'Kontakt speichern', content: '', settings: { name: 'Max Mustermann', description: 'Dipl. Ingenieur' } },
        { id: 'e3', type: 'magic_button', buttonType: 'custom_link', title: 'LinkedIn Profil', content: 'https://linkedin.com/in/', settings: { icon: 'briefcase' } },
        { id: 'e4', type: 'magic_button', buttonType: 'custom_link', title: 'Portfolio ansehen', content: 'https://', settings: { icon: 'globe' } },
        { id: 'e5', type: 'text', title: 'Über mich', content: 'Spezialisiert auf innovative Lösungen im Bereich Maschinenbau und CAD-Design.' }
      ],
      accent: '#11235A'
    },
    {
      id: 'creator',
      name: 'Content Creator',
      icon: <Zap size={18} />,
      blocks: [
        { id: 'c1', type: 'headline', content: 'Folgt mir!', title: 'Social Media' },
        { id: 'c2', type: 'magic_button', buttonType: 'instagram', title: 'Instagram Feed', content: '@' },
        { id: 'c3', type: 'magic_button', buttonType: 'custom_link', title: 'YouTube Channel', content: 'https://youtube.com/', settings: { icon: 'camera' } },
        { id: 'c4', type: 'magic_button', buttonType: 'custom_link', title: 'Mein Shop', content: 'https://', settings: { icon: 'shopping-cart' } }
      ],
      accent: '#DB2777'
    },
    {
      id: 'beauty',
      name: 'Beauty & Wellness',
      icon: <Sparkles size={18} />,
      blocks: [
        { id: 'b1', type: 'headline', content: 'Zeit für dich', title: 'Beauty Salon' },
        { id: 'b2', type: 'magic_button', buttonType: 'whatsapp', title: 'Termin vereinbaren', content: '+49' },
        { id: 'b3', type: 'magic_button', buttonType: 'instagram', title: 'Unsere Arbeiten', content: '@' },
        { id: 'b4', type: 'magic_button', buttonType: 'google_profile', title: 'Anfahrt & Standort', content: '' }
      ],
      accent: '#4F46E5'
    }
  ];

  const applyTemplate = (tpl: typeof industryTemplates[0]) => {
    if (confirm(`Möchtest du die Vorlage "${tpl.name}" anwenden? Deine aktuellen Inhalte werden ersetzt.`)) {
      setConfig(prev => ({
        ...prev,
        profileTitle: tpl.name.toUpperCase(),
        accentColor: tpl.accent,
        nfcBlocks: tpl.blocks as any[]
      }));
    }
  };

  const magicButtons = [
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={18}/>, colorClass: 'text-emerald-500 bg-emerald-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'whatsapp', title: 'WhatsApp', content: '' }]) },
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={18}/>, colorClass: 'text-pink-500 bg-pink-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'instagram', title: 'Instagram', content: '@' }]) },
    { id: 'stamps', label: 'Treue', icon: <Award size={18}/>, colorClass: 'text-amber-500 bg-amber-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: `block_${Date.now()}`, type: 'magic_button', buttonType: 'stamp_card', title: 'Treuekarte', content: '', settings: { slots: 10, secretKey: generateSecureKey() } }]) },
    { id: 'review', label: 'Review', icon: <Star size={18}/>, colorClass: 'text-yellow-500 bg-yellow-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'review', title: 'Google Review', content: '' }]) },
    { id: 'wifi', label: 'WiFi', icon: <Wifi size={18}/>, colorClass: 'text-blue-500 bg-blue-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'wifi', title: 'Kostenloses Gäste-WLAN', content: '' }]) },
    { id: 'google_profile', label: 'Standort', icon: <MapPin size={18}/>, colorClass: 'text-red-500 bg-red-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'google_profile', title: 'Find us here', content: '' }]) },
    { id: 'action_card', label: 'Visitenkarte', icon: <CreditCard size={18}/>, colorClass: 'text-indigo-500 bg-indigo-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'action_card', title: 'Kontakt speichern', content: '' }]) },
    { id: 'link', label: 'Smart Link', icon: <LinkIcon size={18}/>, colorClass: 'text-navy bg-zinc-50', action: () => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'custom_link', title: 'Webseite', content: 'https://', settings: { icon: 'link' } }]) }
  ];

  const designColors = ['#006699', '#12A9E0', '#11235A', '#ff4d4d', '#2ecc71', '#d4af37', '#000000', '#0D9488', '#4F46E5', '#DB2777'];

  if (activeDept === '3d') {
    return (
      <div className="space-y-8 animate-in slide-in-from-left">
        <div className="bg-navy p-5 rounded-3xl text-white shadow-xl flex items-center gap-4">
            <div className="bg-action/20 p-3 rounded-2xl"><Box size={24} className="text-action" /></div>
            <div>
               <span className="text-[8px] font-black uppercase text-action tracking-[0.2em]">Hardware Editor</span>
               <p className="text-[10px] font-bold mt-0.5 opacity-70 leading-snug">Card & Logo Branding</p>
            </div>
        </div>

        <div className="space-y-3 px-1">
           <label className="text-[9px] font-black uppercase text-zinc-400 px-2 flex items-center justify-between">
              Logo (SVG) <span className="text-[7px] opacity-50">transparent bevorzugt</span>
           </label>
           <div className="relative h-28 rounded-2xl border-2 border-dashed border-navy/5 bg-white flex flex-col items-center justify-center gap-1 group shadow-sm overflow-hidden cursor-pointer hover:border-petrol/30 transition-all">
              <ImageIcon size={28} className="text-zinc-200" />
              <span className="text-[8px] font-black text-zinc-300 uppercase mt-2">Vektordatei wählen</span>
              <input type="file" accept=".svg" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
           </div>
        </div>

        <div className="space-y-3 px-1">
          <label className="text-[9px] font-black uppercase text-zinc-400 px-2">Card & Accent Farbe</label>
          <div className="flex flex-wrap gap-2.5">
            {designColors.map(c => (
              <button key={c} onClick={() => updateConfig('logoColor', c)} className={`w-8 h-8 rounded-full border-2 transition-all ${config.logoColor === c ? 'border-navy scale-110 shadow-md ring-2 ring-navy/20' : 'border-white'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeEditingBlock = config.nfcBlocks.find(b => b.id === editingBlockId);

  return (
    <div className="flex flex-col space-y-8 h-full">
      {activeEditingBlock && (
        <PropertyPanel block={activeEditingBlock} onUpdate={u => updateConfig('nfcBlocks', config.nfcBlocks.map(b => b.id === activeEditingBlock.id ? {...b, ...u} : b))} onClose={() => setEditingBlockId(null)} />
      )}

      <section className="space-y-3">
          <label className="text-[9px] font-black uppercase text-zinc-400 px-2 flex items-center gap-2">
             <Sparkles size={10} className="text-petrol" /> Schnellstart Vorlagen
          </label>
          <div className="grid grid-cols-2 gap-2 px-1">
             {industryTemplates.map(tpl => (
               <button key={tpl.id} onClick={() => applyTemplate(tpl)} className="p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-start gap-3 transition-all active:scale-95 shadow-sm group hover:border-petrol/30">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:scale-110" style={{ backgroundColor: `${tpl.accent}10`, color: tpl.accent }}>
                    {tpl.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-black uppercase tracking-widest text-navy">{tpl.name}</p>
                    <p className="text-[6px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Preset laden</p>
                  </div>
               </button>
             ))}
          </div>
      </section>

      <section className="bg-white border border-navy/5 p-6 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase text-zinc-400">
              <Layout size={10} className="text-petrol" /> Layout-Template
          </div>
          <div className="grid grid-cols-3 gap-2">
             {(['modern', 'minimal', 'professional'] as NFCTemplate[]).map(t => (
               <button key={t} onClick={() => updateConfig('nfcTemplate', t)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${config.nfcTemplate === t ? 'bg-navy text-white border-navy shadow-lg' : 'bg-cream border-navy/5 text-zinc-400'}`}>
                 {t}
               </button>
             ))}
          </div>
          
          <div className="space-y-4 pt-4 border-t border-navy/5">
             <div className="flex items-center gap-2 text-[8px] font-black uppercase text-zinc-400">
                <Palette size={10} className="text-petrol" /> Profil-Design
             </div>
             <div className="flex flex-wrap gap-2">
                 {designColors.map(c => (
                 <button key={c} onClick={() => updateConfig('accentColor', c)} className={`w-7 h-7 rounded-full border-2 transition-all ${config.accentColor === c ? 'border-navy scale-110 shadow-sm' : 'border-white'}`} style={{ backgroundColor: c }} />
                 ))}
             </div>
             <div className="flex items-center justify-between pt-2">
                 <label className="text-[8px] font-black uppercase text-zinc-400">Dark Mode</label>
                 <button onClick={() => updateConfig('theme', config.theme === 'light' ? 'dark' : 'light')} className="w-11 h-6 bg-cream border border-navy/5 rounded-full relative flex items-center px-1 transition-colors">
                     <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-all ${config.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                 </button>
             </div>
          </div>
      </section>

      <section className="space-y-3">
          <label className="text-[9px] font-black uppercase text-zinc-400 px-2 flex items-center gap-2">
             <Layout size={10} className="text-petrol" /> Standard Module
          </label>
          <div className="grid grid-cols-4 gap-2 px-1">
            {[
              { type: 'headline', icon: <Type size={16}/>, label: 'Titel' },
              { type: 'text', icon: <Box size={16}/>, label: 'Text' },
              { type: 'image', icon: <ImageIcon size={16}/>, label: 'Media' },
              { type: 'map', icon: <MapPin size={16}/>, label: 'Karte' }
            ].map(item => (
              <button key={item.type} onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: item.type as any, content: item.label, title: item.label }])} className="p-3 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 shadow-sm group hover:border-petrol/30">
                  <div className="w-8 h-8 bg-cream rounded-xl flex items-center justify-center text-navy group-hover:bg-petrol group-hover:text-white transition-colors">{item.icon}</div>
                  <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
      </section>

      <section className="space-y-3">
          <label className="text-[9px] font-black uppercase text-zinc-400 px-2">Magic Buttons</label>
          <div className="grid grid-cols-2 gap-2.5 px-1">
          {magicButtons.map(btn => (
              <button key={btn.id} onClick={btn.action} className="p-3.5 bg-white border border-navy/5 rounded-[1.25rem] flex items-center gap-3 active:scale-95 shadow-sm group hover:border-petrol/30">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${btn.colorClass} transition-transform group-hover:scale-110`}>{btn.icon}</div>
                <span className="text-[8px] font-black uppercase tracking-wider truncate">{btn.label}</span>
              </button>
          ))}
          </div>
      </section>

      <section className="space-y-3 px-1 pb-16">
        <label className="text-[9px] font-black uppercase text-zinc-400 px-2 flex justify-between items-center">
          Profil-Inhalte <span>{config.nfcBlocks.length} Module</span>
        </label>
        <div className="space-y-2">
          {config.nfcBlocks.length === 0 && (
            <div className="bg-cream/50 border border-dashed border-navy/5 p-8 rounded-2xl text-center">
               <p className="text-[9px] text-zinc-300 italic">Noch keine Inhalte hinzugefügt.</p>
            </div>
          )}
          {config.nfcBlocks.map((block, i) => (
            <div key={block.id} className="bg-white p-3.5 rounded-2xl border border-navy/5 flex items-center gap-3 shadow-sm group animate-in slide-in-from-right duration-300">
              <div className="w-6 h-6 rounded-full bg-cream flex items-center justify-center text-zinc-400 text-[8px] font-black shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-navy uppercase truncate">{block.title || block.type}</p>
                <p className="text-[7px] font-bold text-zinc-400 uppercase opacity-60">{block.buttonType || block.type}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditingBlockId(block.id)} className="p-2 hover:bg-cream rounded-lg text-petrol transition-colors"><Sliders size={14} /></button>
                <button onClick={() => updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id))} className="p-2 hover:bg-red-50 rounded-lg text-red-300 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
