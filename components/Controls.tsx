import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ModelConfig, NFCBlock, Department, ActionIcon, MagicButtonType, FontStyle } from '../types';
import { Box, Trash2, Edit3, Link as LinkIcon, Image as ImageIcon, Sliders, Award, MessageCircle, Globe, ShoppingCart, Info, User, Mail, Phone, Loader2, Instagram, Utensils, Shield, Layout, Camera, Dumbbell, Heart, ArrowLeft, RefreshCw, Star, MapPin, Wifi, CreditCard, Briefcase, Sparkles, Home, Music, Hammer, Stethoscope, Calendar, Youtube, Video, Building2, Copy, ChevronUp, ChevronDown, Sun, Moon, RotateCw, FlipHorizontal2, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateSecureKey, showError, resetFileInput } from '../lib/utils';
import { validateImageFile, isValidEmail, normalizePhoneInput } from '../lib/validation';
import { uploadAndGetPublicUrl, storagePath } from '../lib/storage';
import { SITE_FONTS, SITE_TEMPLATES, type SiteTemplate } from '../lib/siteLayouts';
import { paletteForIndustry } from '../lib/brandPalette';

interface ControlsProps {
  activeDept: Department;
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  hasLogo?: boolean;
  logoPreviewUrl?: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLogo?: () => void;
  onApplyTextEngrave?: (text: string) => Promise<void>;
  logoBusy?: boolean;
  onUpdateColor?: (id: string, color: string) => void;
}

const IconSelector: React.FC<{ selected: ActionIcon; onSelect: (i: ActionIcon) => void }> = ({ selected, onSelect }) => {
  const icons: { id: ActionIcon; icon: React.ComponentType<{ size?: number | string }> }[] = [
    { id: 'briefcase', icon: Briefcase }, { id: 'utensils', icon: Utensils }, { id: 'camera', icon: Camera },
    { id: 'dumbbell', icon: Dumbbell }, { id: 'link', icon: LinkIcon }, { id: 'globe', icon: Globe }, 
    { id: 'shopping-cart', icon: ShoppingCart }, { id: 'info', icon: Info }, { id: 'user', icon: User }, 
    { id: 'star', icon: Star }, { id: 'mail', icon: Mail }, { id: 'phone', icon: Phone }, 
    { id: 'instagram', icon: Instagram }, { id: 'shield', icon: Shield }, { id: 'heart', icon: Heart },
    { id: 'home', icon: Home }, { id: 'hammer', icon: Hammer }, { id: 'stethoscope', icon: Stethoscope },
    { id: 'youtube', icon: Youtube }, { id: 'video', icon: Video }, { id: 'music', icon: Music }
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

const PropertyPanel: React.FC<{ block: NFCBlock; onUpdate: (u: Partial<NFCBlock>) => void; onClose: () => void }> = ({ block, onUpdate, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col h-full overflow-hidden circular-reveal shadow-2xl">
      <header className="p-4 md:p-6 border-b border-navy/5 flex items-center justify-between shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3">
           <button onClick={onClose} className="p-2.5 hover:bg-cream rounded-full transition-colors active:scale-90"><ArrowLeft size={22} className="text-navy"/></button>
           <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-navy">Inhalt bearbeiten</h2>
        </div>
        <button onClick={onClose} className="text-[9px] font-black uppercase text-petrol bg-petrol/5 px-5 py-2.5 rounded-xl transition-all active:scale-95 font-bold">Fertig</button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-container pb-44">
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Titel (sichtbar für Kunden)</label>
          <input type="text" value={block.title || ''} placeholder="z. B. WhatsApp schreiben" onChange={e => onUpdate({ title: e.target.value })} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-cream font-bold outline-none focus:border-petrol/30 transition-colors" />
        </div>

        {(block.type === 'text' || block.type === 'headline') && (
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Inhaltstext</label>
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
                 const file = e.target.files?.[0];
                 if (!file || !supabase) {
                   resetFileInput(e.target);
                   return;
                 }
                 const check = validateImageFile(file);
                 if (!check.valid) {
                   showError(check.error!);
                   resetFileInput(e.target);
                   return;
                 }
                 setIsUploading(true);
                 try {
                   const path = storagePath('img_', file.name);
                   const url = await uploadAndGetPublicUrl(supabase, path, file);
                   if (url) onUpdate({ imageUrl: url });
                 } catch (err) {
                   console.error('Upload error:', err);
                   showError('Bitte versuche es erneut.', 'Fehler beim Hochladen des Bildes.');
                 } finally {
                   setIsUploading(false);
                   resetFileInput(e.target);
                 }
              }} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>
        )}

        {block.type === 'spacer' && (
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Abstandshöhe (px)</label>
            <div className="flex items-center gap-3">
              <input type="range" min="8" max="80" step="4" value={block.settings?.height ?? 24} onChange={e => onUpdate({ settings: { ...block.settings, height: parseInt(e.target.value, 10) } })} className="flex-1 accent-petrol" />
              <span className="text-[10px] font-black text-navy w-8">{block.settings?.height ?? 24}</span>
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
                <input 
                  type="text" 
                  value={block.content} 
                  placeholder={block.buttonType === 'instagram' ? '@deinname' : block.buttonType === 'phone' ? '+49123456789' : 'https://...'} 
                  onChange={e => {
                    const raw = e.target.value;
                    const value = block.buttonType === 'phone' ? normalizePhoneInput(raw) : raw;
                    onUpdate({ content: value });
                  }} 
                  className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-white font-bold outline-none focus:border-petrol/30 transition-colors" 
                />
                {block.buttonType === 'email' && block.content && !isValidEmail(block.content) && (
                  <p className="text-[7px] text-orange-500 font-bold uppercase">Bitte gib eine gültige E-Mail-Adresse ein</p>
                )}
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
                    <label className="text-[8px] font-black uppercase text-zinc-400">Anzahl Stempel</label>
                    <span className="text-[10px] font-black text-petrol">{block.settings?.slots || 10}</span>
                  </div>
                  <input type="range" min="5" max="15" value={block.settings?.slots || 10} onChange={e => onUpdate({ settings: { ...block.settings, slots: parseInt(e.target.value) } })} className="w-full accent-petrol" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-zinc-400 px-1">Validierungs-Code</label>
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

export const Controls: React.FC<ControlsProps> = ({
  activeDept,
  config,
  setConfig,
  hasLogo = false,
  logoPreviewUrl = null,
  onUpload,
  onClearLogo,
  logoBusy = false,
}) => {
  const [showFineTune, setShowFineTune] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const updateConfig = useCallback((key: keyof ModelConfig, val: unknown) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  }, [setConfig]);

  const templateIcon = (tpl: SiteTemplate) => {
    switch (tpl.industry) {
      case 'bakery':
      case 'gastro':
        return <Utensils size={18} />;
      case 'creative':
        return <Camera size={18} />;
      case 'fitness':
        return <Dumbbell size={18} />;
      case 'wellness':
        return <Heart size={18} />;
      case 'realestate':
        return <Building2 size={18} />;
      default:
        return <Layout size={18} />;
    }
  };

  const magicButtonsGroups = useMemo(() => [
    { group: 'Beliebt bei Kunden', items: [
      { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={18}/>, color: 'text-emerald-500 bg-emerald-50', type: 'whatsapp' },
      { id: 'instagram', label: 'Instagram', icon: <Instagram size={18}/>, color: 'text-pink-500 bg-pink-50', type: 'instagram' },
      { id: 'tiktok', label: 'TikTok', icon: <Music size={18}/>, color: 'text-zinc-900 bg-zinc-100', type: 'tiktok' },
      { id: 'linkedin', label: 'LinkedIn', icon: <Briefcase size={18}/>, color: 'text-blue-600 bg-blue-50', type: 'linkedin' },
      { id: 'youtube', label: 'YouTube', icon: <Youtube size={18}/>, color: 'text-red-600 bg-red-50', type: 'youtube' },
    ]},
    { group: 'Für dein Geschäft', items: [
      { id: 'action_card', label: 'Visitenkarte', icon: <CreditCard size={18}/>, color: 'text-indigo-500 bg-indigo-50', type: 'action_card' },
      { id: 'booking', label: 'Termin buchen', icon: <Calendar size={18}/>, color: 'text-sky-500 bg-sky-50', type: 'booking' },
      { id: 'email', label: 'E-Mail', icon: <Mail size={18}/>, color: 'text-amber-500 bg-amber-50', type: 'email' },
      { id: 'wifi', label: 'WLAN teilen', icon: <Wifi size={18}/>, color: 'text-blue-500 bg-blue-50', type: 'wifi' },
      { id: 'link', label: 'Website-Link', icon: <LinkIcon size={18}/>, color: 'text-navy bg-zinc-50', type: 'custom_link' },
      { id: 'stamp', label: 'Stempelkarte', icon: <Award size={18}/>, color: 'text-orange-500 bg-orange-50', type: 'stamp_card' },
    ]}
  ], []);

  const applyTemplate = useCallback((tpl: SiteTemplate) => {
    if (confirm(`Vorlage „${tpl.name}“ übernehmen? Deine bisherigen Texte und Buttons werden ersetzt.`)) {
      setConfig((prev) => ({
        ...prev,
        ...tpl.apply(),
      }));
    }
  }, [setConfig]);

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

  const addSpacer = () => {
    const newBlock: NFCBlock = {
      id: `sp_${Date.now()}`,
      type: 'spacer',
      content: '',
      settings: { height: 24 }
    };
    updateConfig('nfcBlocks', [...config.nfcBlocks, newBlock]);
  };

  const duplicateBlock = (blockId: string) => {
    const block = config.nfcBlocks.find(b => b.id === blockId);
    if (!block) return;
    const copy: NFCBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: `mb_${Date.now()}`,
    };
    if (copy.settings?.secretKey && block.type === 'magic_button' && block.buttonType === 'stamp_card') {
      copy.settings.secretKey = generateSecureKey();
    }
    const idx = config.nfcBlocks.findIndex(b => b.id === blockId);
    const next = [...config.nfcBlocks];
    next.splice(idx + 1, 0, copy);
    updateConfig('nfcBlocks', next);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = config.nfcBlocks.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= config.nfcBlocks.length) return;
    const next = [...config.nfcBlocks];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    updateConfig('nfcBlocks', next);
  };

  if (activeDept === '3d') {
    const plateColors = ['#F8F5F0', '#FFFFFF', '#2A2A2A', '#11235A', '#12A9E0', '#D6C3A8', '#1F4D3A', '#ff4d4d'];
    const printColors = ['#111111', '#FFFFFF', '#11235A', '#12A9E0', '#d4af37', '#ff4d4d', '#2ecc71', '#8B5E3C'];
    const layout = config.engraveLayout || 'logo_above';
    const layouts: { id: NonNullable<ModelConfig['engraveLayout']>; label: string; icon: string }[] = [
      { id: 'logo_above', label: 'Logo oben', icon: '⬆' },
      { id: 'text_above', label: 'Text oben', icon: '⬇' },
      { id: 'logo_only', label: 'Nur Logo', icon: '▣' },
      { id: 'text_only', label: 'Nur Text', icon: 'T' },
    ];

    return (
      <div className="space-y-5 pb-6">
        <div className="rounded-2xl border border-navy/10 bg-gradient-to-br from-white via-white to-petrol/[0.04] p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-petrol">Studio · 3D-Druck</p>
          <p className="mt-1 text-sm font-bold text-navy leading-snug">Dein Anhänger, druckfertig vorbereitet</p>
          <p className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed">
            Wir entfernen den Hintergrund, prüfen ob es ein Logo ist und ob die Linien für den 3D-Druck stark genug sind – ohne KI, mit klaren Regeln.
          </p>
        </div>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-navy">Logo</h3>
            {hasLogo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 border border-emerald-100">
                Druckbereit
              </span>
            )}
          </div>
          {hasLogo && logoPreviewUrl ? (
            <div className="flex items-start gap-3">
              <div className="w-[72px] h-[72px] rounded-xl border border-navy/10 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0] flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoPreviewUrl} alt="Logo" className="max-w-[85%] max-h-[85%] object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-navy">Hintergrund entfernt · Motiv geprüft</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">Geeignet für Prägung auf dem Schlüsselanhänger.</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-xs">
                  <label className="text-petrol font-bold cursor-pointer hover:underline relative">
                    Ersetzen
                    <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" onChange={onUpload} disabled={logoBusy} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </label>
                  {onClearLogo && (
                    <button type="button" onClick={onClearLogo} className="text-zinc-500 hover:text-red-600 font-semibold">Entfernen</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <label className={`relative flex flex-col items-center justify-center gap-2.5 min-h-[124px] rounded-xl border-2 border-dashed border-navy/20 bg-cream/60 cursor-pointer transition-colors hover:border-petrol/50 hover:bg-petrol/[0.03] ${logoBusy ? 'opacity-50 pointer-events-none' : ''}`}>
              {logoBusy ? (
                <>
                  <Loader2 className="animate-spin text-petrol" size={26} />
                  <span className="text-sm font-semibold text-navy">Wird geprüft…</span>
                  <span className="text-[11px] text-zinc-500">Hintergrund · Logo · Druckbarkeit</span>
                </>
              ) : (
                <>
                  <div className="w-11 h-11 rounded-full bg-navy/5 flex items-center justify-center">
                    <ImageIcon className="text-navy/70" size={22} />
                  </div>
                  <span className="text-sm font-bold text-navy">Logo hochladen</span>
                  <span className="text-[11px] text-zinc-500 text-center px-4 leading-snug">PNG, JPG oder SVG · Fotos werden abgelehnt</span>
                </>
              )}
              <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          )}
          <ul className="grid gap-1.5 pt-1">
            {[
              'Klarer Kontrast, möglichst wenige Farben',
              'Kräftige Linien (ca. 1 mm) – keine Haarlinien',
              'Kein Personen-/Produktfoto',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[11px] text-zinc-500 leading-snug">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-petrol shrink-0" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-navy">Prägetext</h3>
          <input
            type="text"
            value={config.engraveText || ''}
            onChange={(e) => updateConfig('engraveText', e.target.value.slice(0, 28))}
            placeholder="z. B. Firmenname"
            maxLength={28}
            className="w-full px-3.5 py-3 rounded-xl border border-navy/10 text-sm text-navy bg-cream/50 outline-none focus:border-petrol/40 focus:bg-white transition-colors"
          />
          <p className="text-[11px] text-zinc-400">{(config.engraveText || '').length}/28 Zeichen · fette Schrift für den Druck</p>
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-navy">Abstand Logo / Text</h3>
            <span className="text-[11px] font-semibold tabular-nums text-zinc-500">{config.engraveGap ?? 40}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={config.engraveGap ?? 40}
            onChange={(e) => updateConfig('engraveGap', parseInt(e.target.value, 10))}
            className="w-full accent-petrol"
          />
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-navy">Farben</h3>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Druckfarbe</p>
            <div className="flex flex-wrap gap-2">
              {printColors.map((c) => (
                <button
                  key={`print-${c}`}
                  type="button"
                  onClick={() => updateConfig('logoColor', c)}
                  className={`w-9 h-9 rounded-full border-2 transition-transform active:scale-95 ${config.logoColor?.toLowerCase() === c.toLowerCase() ? 'border-navy ring-2 ring-offset-2 ring-petrol/40 scale-105' : 'border-white shadow-sm ring-1 ring-zinc-200'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Druckfarbe ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Produktfarbe</p>
            <div className="flex flex-wrap gap-2">
              {plateColors.map((c) => (
                <button
                  key={`plate-${c}`}
                  type="button"
                  onClick={() => updateConfig('plateColor', c)}
                  className={`w-9 h-9 rounded-full border-2 transition-transform active:scale-95 ${(config.plateColor || '#F8F5F0').toLowerCase() === c.toLowerCase() ? 'border-navy ring-2 ring-offset-2 ring-petrol/40 scale-105' : 'border-white shadow-sm ring-1 ring-zinc-200'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Produktfarbe ${c}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-navy">Ausrichtung</h3>
          <div className="grid grid-cols-4 gap-2">
            {layouts.map((l) => (
              <button
                key={l.id}
                type="button"
                title={l.label}
                onClick={() => updateConfig('engraveLayout', l.id)}
                className={`h-12 rounded-xl border text-sm font-bold transition-colors ${layout === l.id ? 'border-navy bg-navy text-white shadow-sm' : 'border-navy/10 bg-cream/40 text-navy hover:border-petrol/40'}`}
              >
                {l.icon}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500">
            {layouts.find((l) => l.id === layout)?.label}
          </p>
        </section>

        <section className="space-y-2 pt-0.5">
          <button
            type="button"
            onClick={() => setShowFineTune((v) => !v)}
            className="text-xs font-bold text-petrol hover:text-navy transition-colors"
          >
            {showFineTune ? '− Feineinstellung schließen' : '+ Größe & Position'}
          </button>
          {showFineTune && (
            <div className="space-y-4 rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-zinc-500"><span>Größe</span><span>{Math.round(config.logoScale * 100)}%</span></div>
                <input type="range" min="0.4" max="1.8" step="0.01" value={config.logoScale} onChange={(e) => updateConfig('logoScale', parseFloat(e.target.value))} className="w-full accent-petrol" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-zinc-500">Links / Rechts</div>
                  <input type="range" min="-15" max="15" step="0.5" value={config.logoPosX} onChange={(e) => updateConfig('logoPosX', parseFloat(e.target.value))} className="w-full accent-petrol" />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-zinc-500">Hoch / Runter</div>
                  <input type="range" min="-15" max="15" step="0.5" value={config.logoPosY} onChange={(e) => updateConfig('logoPosY', parseFloat(e.target.value))} className="w-full accent-petrol" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-navy">
                <input type="checkbox" checked={config.hasChain !== false} onChange={(e) => updateConfig('hasChain', e.target.checked)} className="accent-petrol" />
                Schlüsselring anzeigen
              </label>
            </div>
          )}
        </section>
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
      <section className="space-y-3">
          <label className="text-[9px] font-black uppercase text-zinc-500 px-1 flex items-center gap-2">
             <Sparkles size={12} className="text-petrol" /> Fertige Vorlagen
          </label>
          <p className="text-[10px] text-zinc-500 px-1 -mt-1">Tipp: Vorlage wählen, dann Namen und Links anpassen – fertig.</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
             {SITE_TEMPLATES.map((tpl) => {
               const accent = paletteForIndustry(tpl.industry).accent;
               return (
               <button key={tpl.id} type="button" onClick={() => applyTemplate(tpl)} className="card p-3 sm:p-4 flex flex-col items-start gap-2 sm:gap-3 transition-all active:scale-[0.98] min-h-[80px] sm:min-h-0 text-left hover:border-petrol/25">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}18`, color: accent }}>{templateIcon(tpl)}</div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-wider text-navy truncate">{tpl.name}</p>
                    <p className="text-[6px] font-bold text-zinc-400 uppercase mt-0.5 line-clamp-2">{tpl.blurb}</p>
                  </div>
               </button>
               );
             })}
          </div>
      </section>

      {/* Branding Settings */}
      <section className="card p-4 sm:p-5 space-y-5">
          <div className="space-y-3">
             <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Firmenname (auf der Handy-Seite)</label>
             <input type="text" value={config.profileTitle} onChange={e => updateConfig('profileTitle', e.target.value)} className="w-full p-4 rounded-2xl border border-navy/5 text-xs bg-cream font-bold outline-none focus:border-petrol/30" placeholder="z. B. Bäckerei Müller" />
          </div>

          <div className="space-y-3">
             <label className="text-[8px] font-black uppercase text-zinc-400 px-1 tracking-widest">Aussehen</label>
             <div className="flex gap-2 flex-wrap">
               <span className="text-[7px] font-bold text-zinc-400 uppercase w-full px-1">Seiten-Stil</span>
               <button type="button" onClick={() => updateConfig('layoutMode', 'landing')} className={`flex-1 min-w-0 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${(config.layoutMode || 'landing') === 'landing' ? 'bg-navy text-white border-navy' : 'bg-cream border-navy/10 text-zinc-500 hover:border-petrol/30'}`}>Wie eine kleine Website</button>
               <button type="button" onClick={() => updateConfig('layoutMode', 'stack')} className={`flex-1 min-w-0 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${config.layoutMode === 'stack' ? 'bg-navy text-white border-navy' : 'bg-cream border-navy/10 text-zinc-500 hover:border-petrol/30'}`}>Einfache Liste</button>
             </div>
             <div className="flex gap-2 flex-wrap mt-2">
               <span className="text-[7px] font-bold text-zinc-400 uppercase w-full px-1">Hell oder dunkel</span>
               <button type="button" onClick={() => updateConfig('theme', 'light')} className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${config.theme === 'light' ? 'bg-navy text-white border-navy' : 'bg-cream border-navy/10 text-zinc-500 hover:border-petrol/30'}`}><Sun size={12} /> Hell</button>
               <button type="button" onClick={() => updateConfig('theme', 'dark')} className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${config.theme === 'dark' ? 'bg-navy text-white border-navy' : 'bg-cream border-navy/10 text-zinc-500 hover:border-petrol/30'}`}><Moon size={12} /> Dunkel</button>
             </div>
             <div className="flex gap-2 flex-wrap mt-2">
               <span className="text-[7px] font-bold text-zinc-400 uppercase w-full px-1">Schriftart</span>
               {(Object.keys(SITE_FONTS) as FontStyle[]).map((style) => (
                 <button key={style} type="button" onClick={() => updateConfig('fontStyle', style)} className={`min-w-[30%] flex-1 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${config.fontStyle === style ? 'bg-petrol text-white border-petrol' : 'bg-cream border-navy/10 text-zinc-500 hover:border-petrol/30'}`}>
                   {SITE_FONTS[style].label}
                 </button>
               ))}
             </div>
             <div className="grid grid-cols-3 gap-2 mt-2">
               <div className="space-y-1">
                 <span className="text-[7px] font-bold text-zinc-400 uppercase px-1">Button-Farbe</span>
                 <input type="color" value={config.accentColor || '#11235A'} onChange={(e) => updateConfig('accentColor', e.target.value)} className="w-full h-10 rounded-xl border border-navy/10 bg-cream cursor-pointer" aria-label="Button-Farbe" />
               </div>
               <div className="space-y-1">
                 <span className="text-[7px] font-bold text-zinc-400 uppercase px-1">Hintergrund</span>
                 <input type="color" value={config.surfaceColor || '#F8F5F0'} onChange={(e) => updateConfig('surfaceColor', e.target.value)} className="w-full h-10 rounded-xl border border-navy/10 bg-cream cursor-pointer" aria-label="Hintergrundfarbe" />
               </div>
               <div className="space-y-1">
                 <span className="text-[7px] font-bold text-zinc-400 uppercase px-1">Textfarbe</span>
                 <input type="color" value={config.textColor || '#1C1917'} onChange={(e) => updateConfig('textColor', e.target.value)} className="w-full h-10 rounded-xl border border-navy/10 bg-cream cursor-pointer" aria-label="Textfarbe" />
               </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
               <label className="text-[8px] font-black uppercase text-zinc-500 px-1">Kopfbild (optional)</label>
               <div className="relative min-h-[72px] sm:min-h-[80px] rounded-xl border border-dashed border-navy/10 bg-cream/80 flex items-center justify-center overflow-hidden cursor-pointer">
                  {config.headerImageUrl ? <img src={config.headerImageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-zinc-300" />}
              <input type="file" accept="image/*" onChange={async (e) => {
                 const file = e.target.files?.[0];
                 if (!file || !supabase) {
                   resetFileInput(e.target);
                   return;
                 }
                 const check = validateImageFile(file);
                 if (!check.valid) {
                   showError(check.error!);
                   resetFileInput(e.target);
                   return;
                 }
                 setIsUploadingBanner(true);
                 try {
                   const path = storagePath('b_', file.name);
                   const url = await uploadAndGetPublicUrl(supabase, path, file);
                   if (url) updateConfig('headerImageUrl', url);
                 } catch (err) {
                   console.error('Upload error:', err);
                   showError('Bitte versuche es erneut.', 'Kopfbild konnte nicht hochgeladen werden.');
                 } finally {
                   setIsUploadingBanner(false);
                   resetFileInput(e.target);
                 }
              }} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
            <div className="space-y-1.5">
               <label className="text-[8px] font-black uppercase text-zinc-500 px-1">Dein Logo</label>
               <div className="relative min-h-[72px] sm:min-h-[80px] rounded-xl border border-dashed border-navy/10 bg-cream/80 flex items-center justify-center overflow-hidden cursor-pointer">
                  {config.profileLogoUrl ? <img src={config.profileLogoUrl} className="w-full h-full object-contain p-2" /> : <User size={20} className="text-zinc-300" />}
                  <input type="file" accept="image/*" onChange={async (e) => {
                     const file = e.target.files?.[0];
                     if (!file || !supabase) {
                       resetFileInput(e.target);
                       return;
                     }
                     const check = validateImageFile(file);
                     if (!check.valid) {
                       showError(check.error!);
                       resetFileInput(e.target);
                       return;
                     }
                     setIsUploadingLogo(true);
                     try {
                       const path = storagePath('l_', file.name);
                       const url = await uploadAndGetPublicUrl(supabase, path, file);
                       if (url) updateConfig('profileLogoUrl', url);
                     } catch (err) {
                       console.error('Upload error:', err);
                       showError('Bitte versuche es erneut.', 'Logo konnte nicht hochgeladen werden.');
                     } finally {
                       setIsUploadingLogo(false);
                       resetFileInput(e.target);
                     }
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
          </div>
      </section>

      {/* Add Content Selection Grid */}
      <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Buttons & Inhalte hinzufügen</label>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={addSpacer} className="card p-3 flex items-center gap-2 text-zinc-500 hover:border-petrol/25 transition-all text-[8px] font-black uppercase tracking-wider min-h-[44px]" title="Abstand einfügen">
              <div className="w-7 h-7 rounded-lg bg-cream flex items-center justify-center"><div className="w-full h-0.5 bg-zinc-300 rounded" /></div>
              Abstand
            </button>
          </div>
          <div className="space-y-6">
            {magicButtonsGroups.map((group) => (
              <div key={group.group} className="space-y-2">
                <p className="text-[7px] font-black uppercase tracking-wider text-zinc-400 px-1">{group.group}</p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map(btn => (
                    <button key={btn.id} type="button" onClick={() => addMagicButton(btn.type as MagicButtonType, btn.label)} className="card p-3 flex items-center gap-2 sm:gap-3 active:scale-[0.98] min-h-[48px] sm:min-h-0 text-left">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${btn.color}`}>{btn.icon}</div>
                      <span className="text-[8px] font-black uppercase tracking-wider truncate">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
      </section>

      {/* Profile Contents List */}
      <section className="space-y-4 px-1 pb-44">
        <div className="flex items-center justify-between px-2">
           <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Was auf der Handy-Seite steht</label>
        </div>
        <div className="space-y-3">
          {config.nfcBlocks.length === 0 && (
            <div className="card text-center py-10 rounded-xl border border-dashed border-navy/10">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider leading-relaxed">Noch leer.<br />Oben eine Vorlage wählen oder Buttons hinzufügen.</p>
            </div>
          )}
          {config.nfcBlocks.map((block, index) => (
            <div key={block.id} className="card p-4 flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center text-zinc-400 shrink-0">
                <Sliders size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-navy uppercase truncate">{block.type === 'spacer' ? `Abstand (${block.settings?.height ?? 24} px)` : (block.title || block.type)}</p>
                <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{block.type === 'spacer' ? 'Spacer' : (block.buttonType || 'Inhalt')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => moveBlock(block.id, 'up')} disabled={index === 0} className="btn-tap flex items-center justify-center rounded-xl text-zinc-400 hover:bg-cream hover:text-navy disabled:opacity-30 disabled:pointer-events-none" title="Nach oben" aria-label="Nach oben"><ChevronUp size={16} /></button>
                <button type="button" onClick={() => moveBlock(block.id, 'down')} disabled={index === config.nfcBlocks.length - 1} className="btn-tap flex items-center justify-center rounded-xl text-zinc-400 hover:bg-cream hover:text-navy disabled:opacity-30 disabled:pointer-events-none" title="Nach unten" aria-label="Nach unten"><ChevronDown size={16} /></button>
                <button type="button" onClick={() => duplicateBlock(block.id)} className="btn-tap flex items-center justify-center rounded-xl text-zinc-400 hover:bg-cream hover:text-navy" title="Duplizieren" aria-label="Duplizieren"><Copy size={16} /></button>
                <button type="button" onClick={() => setEditingBlockId(block.id)} className="btn-tap flex items-center justify-center bg-cream hover:bg-petrol hover:text-white rounded-xl text-zinc-500 transition-all active:scale-95" title="Bearbeiten" aria-label="Bearbeiten"><Edit3 size={16} /></button>
                <button type="button" onClick={() => updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id))} className="btn-tap flex items-center justify-center bg-red-50 hover:bg-red-500 hover:text-white rounded-xl text-red-300 transition-all active:scale-95" title="Löschen" aria-label="Löschen"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};