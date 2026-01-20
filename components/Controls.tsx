
import React, { useState } from 'react';
import { ModelConfig, SVGPathData, NFCBlock, Department, ActionIcon, NFCTemplate, MagicButtonType } from '../types';
import { Box, Type, Trash2, Link as LinkIcon, Image as ImageIcon, Sliders, Award, MessageCircle, Globe, ShoppingCart, Info, User, Mail, Phone, Loader2, Instagram, Utensils, Shield, Layout, Camera, Dumbbell, Heart, Palette, ArrowLeft, RefreshCw, Star, MapPin, Wifi, CreditCard, Briefcase, Zap, Sparkles, Home, Music, Hammer, Stethoscope, ChevronDown, ChevronUp, Calendar, Youtube, Video } from 'lucide-react';
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
    <div className="fixed md:absolute inset-0 bg-white z-[900] flex flex-col h-full overflow-hidden circular-reveal">
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

            {['custom_link', 'instagram', 'whatsapp', 'review', 'google_profile', 'tiktok', 'linkedin', 'booking', 'email', 'youtube', 'phone'].includes(block.buttonType || '') && (
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Ziel (URL / Telefon / Handle)</label>
                <input type="text" value={block.content} placeholder={block.buttonType === 'instagram' ? '@deinname' : block.buttonType === 'phone' ? '+49...' : 'https://...'} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-white font-bold outline-none" />
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
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [showAllButtons, setShowAllButtons] = useState(false);
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
    },
    {
      id: 'creator',
      name: 'Creator Pro',
      icon: <Zap size={18} />,
      blocks: [
        { id: 'c1', type: 'headline', content: 'Stay Connected', title: 'New Content daily' },
        { id: 'c2', type: 'magic_button', buttonType: 'instagram', title: 'Instagram', content: '@' },
        { id: 'c3', type: 'magic_button', buttonType: 'tiktok', title: 'TikTok', content: '@' },
        { id: 'c4', type: 'magic_button', buttonType: 'youtube', title: 'YouTube Channel', content: '' }
      ],
      accent: '#DB2777',
      profileTitle: 'CREATOR SPACE'
    }
  ];

  const applyTemplate = (tpl: any) => {
    if (confirm(`Möchtest du die Vorlage "${tpl.name}" anwenden?`)) {
      setConfig(prev => ({
        ...prev,
        profileTitle: tpl.profileTitle || tpl.name.toUpperCase(),
        accentColor: tpl.accent,
        nfcBlocks: [...tpl.blocks] as any[]
      }));
    }
  };

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
      { id: 'phone', label: 'Anruf', icon: <Phone size={18}/>, color: 'text-green-500 bg-green-50', type: 'phone' },
      { id: 'link', label: 'Link', icon: <LinkIcon size={18}/>, color: 'text-navy bg-zinc-50', type: 'custom_link' },
    ]}
  ];

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
          <label className="text-[9px] font-black uppercase text-zinc-400 px-2">Card & Logo Farbe</label>
          <div className="flex flex-wrap gap-2.5">
            {designColors.map(c => (
              <button key={c} onClick={() => updateConfig('logoColor', c)} className={`w-8 h-8 rounded-full border-2 transition-all ${config.logoColor === c ? 'border-navy scale-110 shadow-md ring-2 ring-navy/20' : 'border-white'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-navy/5">
           <label className="text-[9px] font-black uppercase text-zinc-400 px-2">Skalierung & Tiefe</label>
           <div className="space-y-6 px-2">
              <div className="space-y-2">
                 <div className="flex justify-between text-[8px] font-black uppercase"><span className="opacity-50">Größe</span><span>{config.logoScale.toFixed(2)}</span></div>
                 <input type="range" min="0.5" max="2.0" step="0.05" value={config.logoScale} onChange={e => updateConfig('logoScale', parseFloat(e.target.value))} className="w-full accent-petrol" />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-[8px] font-black uppercase"><span className="opacity-50">Prägetiefe</span><span>{config.logoDepth.toFixed(1)}mm</span></div>
                 <input type="range" min="0.5" max="4.0" step="0.1" value={config.logoDepth} onChange={e => updateConfig('logoDepth', parseFloat(e.target.value))} className="w-full accent-petrol" />
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 h-full">
      {editingBlockId && config.nfcBlocks.find(b => b.id === editingBlockId) && (
        <PropertyPanel 
          block={config.nfcBlocks.find(b => b.id === editingBlockId)!} 
          onUpdate={u => updateConfig('nfcBlocks', config.nfcBlocks.map(b => b.id === editingBlockId ? {...b, ...u} : b))} 
          onClose={() => setEditingBlockId(null)} 
        />
      )}

      {/* Vorlagen */}
      <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <label className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-2">
               <Sparkles size={10} className="text-petrol" /> Vorlagen
            </label>
            <button onClick={() => setShowAllTemplates(!showAllTemplates)} className="text-[8px] font-black uppercase text-petrol flex items-center gap-1 transition-all">
               {showAllTemplates ? 'Weniger' : 'Alle Vorlagen'} {showAllTemplates ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 px-1">
             {(showAllTemplates ? industryTemplates : industryTemplates.slice(0, 2)).map(tpl => (
               <button key={tpl.id} onClick={() => applyTemplate(tpl)} className="p-4 bg-white border border-navy/5 rounded-3xl flex flex-col items-start gap-3 transition-all active:scale-95 shadow-sm group hover:border-petrol/30 animate-in fade-in duration-300">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: `${tpl.accent}15`, color: tpl.accent }}>
                    {tpl.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-black uppercase tracking-wider text-navy leading-tight">{tpl.name}</p>
                    <p className="text-[6px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 opacity-60">Presets laden</p>
                  </div>
               </button>
             ))}
          </div>
      </section>

      {/* Profile Branding Settings */}
      <section className="bg-white border border-navy/5 p-6 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase text-zinc-400">
              <Layout size={10} className="text-petrol" /> Branding & Media
          </div>
          
          <div className="space-y-3">
             <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Profil Titel</label>
             <input type="text" value={config.profileTitle} onChange={e => updateConfig('profileTitle', e.target.value)} className="w-full p-3 rounded-xl border border-navy/5 text-xs bg-cream font-bold outline-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Banner Bild</label>
               <div className="relative h-20 rounded-2xl border border-dashed border-navy/10 bg-cream flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-petrol transition-all">
                  {config.headerImageUrl ? (
                     <img src={config.headerImageUrl} className="w-full h-full object-cover" />
                  ) : (
                     <ImageIcon size={20} className="text-zinc-300" />
                  )}
                  <input type="file" accept="image/*" onChange={async (e) => {
                     const file = e.target.files?.[0]; if(!file || !supabase) return;
                     setIsUploadingBanner(true);
                     const { data } = await supabase.storage.from('nudaim').upload(`banner_${Date.now()}_${file.name}`, file);
                     if(data) {
                       const { data: { publicUrl } } = supabase.storage.from('nudaim').getPublicUrl(data.path);
                       updateConfig('headerImageUrl', publicUrl);
                     }
                     setIsUploadingBanner(false);
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Profil Logo</label>
               <div className="relative h-20 rounded-2xl border border-dashed border-navy/10 bg-cream flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-petrol transition-all">
                  {config.profileLogoUrl ? (
                     <img src={config.profileLogoUrl} className="w-full h-full object-contain p-2" />
                  ) : (
                     <User size={20} className="text-zinc-300" />
                  )}
                  <input type="file" accept="image/*" onChange={async (e) => {
                     const file = e.target.files?.[0]; if(!file || !supabase) return;
                     setIsUploadingLogo(true);
                     const { data } = await supabase.storage.from('nudaim').upload(`plogo_${Date.now()}_${file.name}`, file);
                     if(data) {
                       const { data: { publicUrl } } = supabase.storage.from('nudaim').getPublicUrl(data.path);
                       updateConfig('profileLogoUrl', publicUrl);
                     }
                     setIsUploadingLogo(false);
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Akzentfarbe</label>
             <div className="flex flex-wrap gap-2">
                {designColors.map(c => (
                  <button key={c} onClick={() => updateConfig('accentColor', c)} className={`w-6 h-6 rounded-full border border-white shadow-sm transition-all ${config.accentColor === c ? 'scale-125 ring-2 ring-navy/20' : ''}`} style={{ backgroundColor: c }} />
                ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
             <button onClick={() => updateConfig('theme', config.theme === 'light' ? 'dark' : 'light')} className="py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest bg-cream border-navy/5 text-navy transition-all active:scale-95">
                {config.theme === 'light' ? 'Hell' : 'Dunkel'}
             </button>
             <button onClick={() => updateConfig('fontStyle', config.fontStyle === 'luxury' ? 'modern' : 'luxury')} className="py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest bg-cream border-navy/5 text-navy transition-all active:scale-95">
                Schriftstil
             </button>
          </div>
      </section>

      {/* Magic Buttons */}
      <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <label className="text-[9px] font-black uppercase text-zinc-400">Magic Buttons</label>
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

      {/* Module Liste */}
      <section className="space-y-3 px-1 pb-24">
        <label className="text-[9px] font-black uppercase text-zinc-400 px-2 flex justify-between items-center">
          Profil Inhalte <span>{config.nfcBlocks.length}</span>
        </label>
        <div className="space-y-2">
          {config.nfcBlocks.map((block, i) => (
            <div key={block.id} className="bg-white p-4 rounded-3xl border border-navy/5 flex items-center gap-3 shadow-sm group animate-in slide-in-from-right duration-300">
              <div className="w-6 h-6 rounded-full bg-cream flex items-center justify-center text-zinc-400 text-[8px] font-black shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-navy uppercase truncate leading-tight">{block.title || block.type}</p>
                <p className="text-[7px] font-bold text-zinc-400 uppercase opacity-60 mt-0.5 tracking-widest">{block.buttonType || block.type}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditingBlockId(block.id)} className="p-2.5 hover:bg-cream rounded-xl text-petrol transition-colors"><Sliders size={16} /></button>
                <button onClick={() => updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id))} className="p-2.5 hover:bg-red-50 rounded-xl text-red-300 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
