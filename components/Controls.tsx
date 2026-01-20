import React, { useState } from 'react';
import { ModelConfig, SVGPathData, NFCBlock, Department, ActionIcon, NFCTemplate, MagicButtonType } from '../types';
import { Box, Type, Trash2, Edit3, Link as LinkIcon, Image as ImageIcon, Sliders, Award, MessageCircle, Globe, ShoppingCart, Info, User, Mail, Phone, Loader2, Instagram, Utensils, Shield, Layout, Camera, Dumbbell, Heart, Palette, ArrowLeft, RefreshCw, Star, MapPin, Wifi, CreditCard, Briefcase, Zap, Sparkles, Home, Music, Hammer, Stethoscope, ChevronDown, ChevronUp, Calendar, Youtube, Video } from 'lucide-react';
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
    { id: 'home', icon: Home }, { id: 'hammer', icon: Hammer }, { id: 'stethoscope', icon: Stethoscope },
    { id: 'youtube', icon: Youtube }, { id: 'video', icon: Video }
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
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col h-full overflow-hidden circular-reveal shadow-2xl">
      <header className="p-4 md:p-6 border-b border-navy/5 flex items-center justify-between shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3">
           <button onClick={onClose} className="p-2.5 hover:bg-cream rounded-full transition-colors active:scale-90"><ArrowLeft size={22} className="text-navy"/></button>
           <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-navy">Modul bearbeiten</h2>
        </div>
        <button onClick={onClose} className="text-[9px] font-black uppercase text-petrol bg-petrol/5 px-5 py-2.5 rounded-xl transition-all active:scale-95">Speichern</button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-container pb-44">
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Anzeigetitel</label>
          <input type="text" value={block.title || ''} placeholder="Titel des Moduls..." onChange={e => onUpdate({ title: e.target.value })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-cream font-bold outline-none focus:border-petrol/30 transition-colors" />
        </div>

        {(block.type === 'text' || block.type === 'headline') && (
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Textinhalt</label>
            <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs h-40 bg-white resize-none font-medium leading-relaxed outline-none focus:border-petrol/30 transition-colors" />
          </div>
        )}

        {block.type === 'image' && (
          <div className="space-y-3">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Medien-Upload</label>
            <div className="relative h-56 rounded-[2rem] border-2 border-dashed border-navy/10 bg-cream flex flex-col items-center justify-center gap-2 overflow-hidden shadow-inner cursor-pointer group hover:border-petrol/30 transition-all">
              {block.imageUrl ? (
                <img src={block.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-300">
                  {isUploading ? <Loader2 className="animate-spin text-petrol" /> : <ImageIcon size={32} strokeWidth={1.5} />}
                  <span className="text-[7px] font-black uppercase tracking-widest">JPG/PNG hochladen</span>
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
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Standort Adresse</label>
            <input type="text" value={block.settings?.address || ''} placeholder="Musterstraße 1, 12345 Stadt" onChange={e => onUpdate({ settings: { ...block.settings, address: e.target.value } })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none focus:border-petrol/30 transition-colors" />
          </div>
        )}

        {block.type === 'magic_button' && (
          <div className="space-y-6">
            {block.buttonType === 'wifi' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">WLAN Name (SSID)</label>
                  <input type="text" value={block.settings?.ssid || ''} onChange={e => onUpdate({ settings: { ...block.settings, ssid: e.target.value } })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Passwort</label>
                  <input type="password" value={block.settings?.password || ''} onChange={e => onUpdate({ settings: { ...block.settings, password: e.target.value } })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                </div>
              </div>
            )}

            {['custom_link', 'instagram', 'whatsapp', 'review', 'google_profile', 'tiktok', 'linkedin', 'booking', 'email', 'youtube', 'phone'].includes(block.buttonType || '') && (
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Link / Handle / Telefon</label>
                <input type="text" value={block.content} placeholder={block.buttonType === 'instagram' ? '@name' : 'https://...'} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none" />
              </div>
            )}

            {block.buttonType === 'action_card' && (
              <div className="space-y-4">
                 <input type="text" value={block.settings?.name || ''} placeholder="Vor- & Nachname" onChange={e => onUpdate({ settings: { ...block.settings, name: e.target.value } })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                 <input type="text" value={block.settings?.description || ''} placeholder="Position / Firma" onChange={e => onUpdate({ settings: { ...block.settings, description: e.target.value } })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none" />
                 <input type="text" value={block.settings?.phone || ''} placeholder="Mobilnummer" onChange={e => onUpdate({ settings: { ...block.settings, phone: e.target.value } })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none" />
              </div>
            )}

            {block.buttonType === 'custom_link' && (
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Icon auswählen</label>
                <IconSelector selected={block.settings?.icon || 'link'} onSelect={i => onUpdate({ settings: { ...block.settings, icon: i } })} />
              </div>
            )}

            {block.buttonType === 'stamp_card' && (
              <div className="bg-cream p-4 rounded-xl space-y-4 border border-navy/5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black uppercase text-zinc-400">Slots</label>
                    <span className="text-[10px] font-black text-petrol">{block.settings?.slots || 10}</span>
                  </div>
                  <input type="range" min="5" max="15" value={block.settings?.slots || 10} onChange={e => onUpdate({ settings: { ...block.settings, slots: parseInt(e.target.value) } })} className="w-full accent-petrol" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Admin Code</label>
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
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const updateConfig = (key: keyof ModelConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));

  const industryTemplates = [
    {
      id: 'super-base',
      name: 'Super Base',
      icon: <Layout size={18} />,
      blocks: [
        { id: 'sb1', type: 'headline', content: 'Willkommen', title: 'Entdecke mehr' },
        { id: 'sb2', type: 'magic_button', buttonType: 'action_card', title: 'Kontakt sichern', content: '' },
        { id: 'sb3', type: 'magic_button', buttonType: 'instagram', title: 'Folge uns', content: '@' },
        { id: 'sb4', type: 'magic_button', buttonType: 'custom_link', title: 'Webseite', content: 'https://', settings: { icon: 'globe' } }
      ],
      accent: '#11235A',
      profileTitle: 'NUDAIM STUDIO'
    },
    {
      id: 'gastro',
      name: 'Gastronomie',
      icon: <Utensils size={18} />,
      blocks: [
        { id: 'g1', type: 'headline', content: 'Genuss pur', title: 'Herzlich Willkommen' },
        { id: 'g2', type: 'magic_button', buttonType: 'review', title: 'Bewerte uns', content: '' },
        { id: 'g3', type: 'magic_button', buttonType: 'whatsapp', title: 'Tisch reservieren', content: '' },
        { id: 'g4', type: 'magic_button', buttonType: 'wifi', title: 'Gäste WLAN', content: '', settings: { ssid: 'WiFi' } }
      ],
      accent: '#0D9488',
      profileTitle: 'REST-AURANT'
    }
  ];

  const magicButtonsGroups = [
    { group: 'Social Media', items: [
      { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={18}/>, color: 'text-emerald-500 bg-emerald-50', type: 'whatsapp' },
      { id: 'instagram', label: 'Instagram', icon: <Instagram size={18}/>, color: 'text-pink-500 bg-pink-50', type: 'instagram' },
      { id: 'tiktok', label: 'TikTok', icon: <Music size={18}/>, color: 'text-zinc-900 bg-zinc-100', type: 'tiktok' },
      { id: 'linkedin', label: 'LinkedIn', icon: <Briefcase size={18}/>, color: 'text-blue-600 bg-blue-50', type: 'linkedin' },
      { id: 'youtube', label: 'YouTube', icon: <Youtube size={18}/>, color: 'text-red-600 bg-red-50', type: 'youtube' },
    ]},
    { group: 'Business Tools', items: [
      { id: 'action_card', label: 'VCard', icon: <CreditCard size={18}/>, color: 'text-indigo-500 bg-indigo-50', type: 'action_card' },
      { id: 'booking', label: 'Booking', icon: <Calendar size={18}/>, color: 'text-sky-500 bg-sky-50', type: 'booking' },
      { id: 'email', label: 'E-Mail', icon: <Mail size={18}/>, color: 'text-amber-500 bg-amber-50', type: 'email' },
      { id: 'wifi', label: 'Wi-Fi', icon: <Wifi size={18}/>, color: 'text-blue-500 bg-blue-50', type: 'wifi' },
      { id: 'link', label: 'Link', icon: <LinkIcon size={18}/>, color: 'text-navy bg-zinc-50', type: 'custom_link' },
      { id: 'stamp', label: 'Stempel', icon: <Award size={18}/>, color: 'text-orange-500 bg-orange-50', type: 'stamp_card' },
    ]}
  ];

  const applyTemplate = (tpl: any) => {
    if (confirm(`Vorlage "${tpl.name}" laden? Bestehende Inhalte gehen verloren.`)) {
      setConfig(prev => ({
        ...prev,
        profileTitle: tpl.profileTitle,
        accentColor: tpl.accent,
        nfcBlocks: JSON.parse(JSON.stringify(tpl.blocks))
      }));
    }
  };

  const addMagicButton = (type: MagicButtonType, label: string) => {
    const newBlock: NFCBlock = {
      id: `mb_${Date.now()}`,
      type: 'magic_button',
      buttonType: type,
      title: label,
      content: '',
      settings: type === 'stamp_card' ? { slots: 10, secretKey: generateSecureKey() } : {}
    };
    updateConfig('nfcBlocks', [...config.nfcBlocks, newBlock]);
  };

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
              Logo (SVG) <span className="text-[7px] opacity-50">transparent</span>
           </label>
           <div className="relative h-28 rounded-2xl border-2 border-dashed border-navy/5 bg-white flex flex-col items-center justify-center gap-1 group shadow-sm overflow-hidden cursor-pointer hover:border-petrol/30 transition-all">
              <ImageIcon size={28} className="text-zinc-200" />
              <span className="text-[8px] font-black text-zinc-300 uppercase mt-2">Vektordatei wählen</span>
              <input type="file" accept=".svg" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
           </div>
        </div>

        <div className="space-y-3 px-1">
          <label className="text-[9px] font-black uppercase text-zinc-400 px-2">Card & Logo Farbe</label>
          <div className="flex flex-wrap gap-2.5">
            {['#006699', '#12A9E0', '#11235A', '#ff4d4d', '#2ecc71', '#d4af37', '#000000'].map(c => (
              <button key={c} onClick={() => updateConfig('logoColor', c)} className={`w-8 h-8 rounded-full border-2 transition-all ${config.logoColor === c ? 'border-navy scale-110 shadow-md ring-2 ring-navy/20' : 'border-white'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-navy/5">
           <div className="space-y-2 px-2">
              <div className="flex justify-between text-[8px] font-black uppercase"><span className="opacity-50 tracking-widest">Größe</span><span>{config.logoScale.toFixed(2)}</span></div>
              <input type="range" min="0.5" max="2.0" step="0.05" value={config.logoScale} onChange={e => updateConfig('logoScale', parseFloat(e.target.value))} className="w-full accent-petrol" />
           </div>
           <div className="space-y-2 px-2">
              <div className="flex justify-between text-[8px] font-black uppercase"><span className="opacity-50 tracking-widest">Prägetiefe</span><span>{config.logoDepth.toFixed(1)}mm</span></div>
              <input type="range" min="0.5" max="4.0" step="0.1" value={config.logoDepth} onChange={e => updateConfig('logoDepth', parseFloat(e.target.value))} className="w-full accent-petrol" />
           </div>
        </div>
      </div>
    );
  }

  const currentEditingBlock = config.nfcBlocks.find(b => b.id === editingBlockId);

  return (
    <div className="flex flex-col space-y-8 h-full">
      {editingBlockId && currentEditingBlock && (
        <PropertyPanel 
          block={currentEditingBlock} 
          onUpdate={u => updateConfig('nfcBlocks', config.nfcBlocks.map(b => b.id === editingBlockId ? {...b, ...u} : b))} 
          onClose={() => setEditingBlockId(null)} 
        />
      )}

      {/* Vorlagen */}
      <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <label className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-2 tracking-widest">
               <Sparkles size={10} className="text-petrol" /> Design Vorlagen
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 px-1">
             {industryTemplates.map(tpl => (
               <button key={tpl.id} onClick={() => applyTemplate(tpl)} className="p-4 bg-white border border-navy/5 rounded-3xl flex flex-col items-start gap-3 transition-all active:scale-95 shadow-sm group hover:border-petrol/30">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: `${tpl.accent}15`, color: tpl.accent }}>
                    {tpl.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-black uppercase tracking-wider text-navy">{tpl.name}</p>
                    <p className="text-[6px] font-bold text-zinc-300 uppercase mt-0.5 tracking-widest">Preset laden</p>
                  </div>
               </button>
             ))}
          </div>
      </section>

      {/* Branding Settings */}
      <section className="bg-white border border-navy/5 p-6 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="space-y-3">
             <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Profil Name</label>
             <input type="text" value={config.profileTitle} onChange={e => updateConfig('profileTitle', e.target.value)} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-cream font-bold outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
               <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Banner</label>
               <div className="relative h-20 rounded-2xl border border-dashed border-navy/10 bg-cream flex items-center justify-center overflow-hidden cursor-pointer">
                  {config.headerImageUrl ? <img src={config.headerImageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-zinc-300" />}
                  <input type="file" accept="image/*" onChange={async (e) => {
                     const file = e.target.files?.[0]; if(!file || !supabase) return;
                     setIsUploadingBanner(true);
                     const { data } = await supabase.storage.from('nudaim').upload(`b_${Date.now()}`, file);
                     if(data) {
                       const { data: { publicUrl } } = supabase.storage.from('nudaim').getPublicUrl(data.path);
                       updateConfig('headerImageUrl', publicUrl);
                     }
                     setIsUploadingBanner(false);
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Logo</label>
               <div className="relative h-20 rounded-2xl border border-dashed border-navy/10 bg-cream flex items-center justify-center overflow-hidden cursor-pointer">
                  {config.profileLogoUrl ? <img src={config.profileLogoUrl} className="w-full h-full object-contain p-2" /> : <User size={20} className="text-zinc-300" />}
                  <input type="file" accept="image/*" onChange={async (e) => {
                     const file = e.target.files?.[0]; if(!file || !supabase) return;
                     setIsUploadingLogo(true);
                     const { data } = await supabase.storage.from('nudaim').upload(`l_${Date.now()}`, file);
                     if(data) {
                       const { data: { publicUrl } } = supabase.storage.from('nudaim').getPublicUrl(data.path);
                       updateConfig('profileLogoUrl', publicUrl);
                     }
                     setIsUploadingLogo(false);
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
          </div>
      </section>

      {/* Add Content Selection Grid */}
      <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Inhalt hinzufügen</label>
          </div>
          <div className="space-y-8">
            {magicButtonsGroups.map((group) => (
              <div key={group.group} className="space-y-3">
                <div className="flex items-center gap-2 px-2 opacity-30">
                   <div className="h-[1px] flex-1 bg-navy" />
                   <span className="text-[7px] font-black uppercase tracking-widest">{group.group}</span>
                   <div className="h-[1px] flex-1 bg-navy" />
                </div>
                <div className="grid grid-cols-2 gap-2.5 px-1">
                {group.items.map(btn => (
                    <button key={btn.id} onClick={() => addMagicButton(btn.type as MagicButtonType, btn.label)} className="p-3.5 bg-white border border-navy/5 rounded-3xl flex items-center gap-3 active:scale-95 shadow-sm group hover:border-petrol/30 transition-all">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${btn.color} transition-transform group-hover:scale-110`}>{btn.icon}</div>
                      <span className="text-[8px] font-black uppercase tracking-wider truncate">{btn.label}</span>
                    </button>
                ))}
                </div>
              </div>
            ))}
          </div>
      </section>

      {/* Profile Contents List */}
      <section className="space-y-4 px-1 pb-32">
        <div className="flex items-center justify-between px-2">
           <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Aktive Module</label>
        </div>
        <div className="space-y-3">
          {config.nfcBlocks.map((block) => (
            <div key={block.id} className="bg-white p-5 rounded-[2rem] border border-navy/5 flex items-center gap-4 shadow-sm group animate-in slide-in-from-right duration-500">
              <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center text-zinc-400 shrink-0 group-hover:bg-petrol/5 group-hover:text-petrol transition-colors">
                <Sliders size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-navy uppercase truncate leading-none">{block.title || block.type}</p>
                <p className="text-[7px] font-bold text-zinc-300 uppercase tracking-widest mt-1.5">{block.buttonType || 'Standard'}</p>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setEditingBlockId(block.id)} 
                  className="w-10 h-10 flex items-center justify-center bg-cream hover:bg-petrol hover:text-white rounded-xl text-zinc-400 transition-all active:scale-90"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id))} 
                  className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-500 hover:text-white rounded-xl text-red-200 transition-all active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};