
import React, { useState } from 'react';
import { ModelConfig, SVGPathData, BaseType, NFCBlock, MagicButtonType, Department, StampValidation } from '../types';
import { Maximize2, Move, RotateCw, Box, Type, Layers, Plus, Minus, Upload, Trash2, Smartphone, Wifi, Star, GripVertical, ChevronDown, Link as LinkIcon, Image as ImageIcon, Briefcase, Zap, Loader2, Sparkles, Sliders, Instagram, Linkedin, MapPin, Award, ShoppingCart, Info, Globe, ShieldCheck, Key, Fingerprint, Clock, QrCode, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ControlsProps {
  activeDept: Department;
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  svgElements: SVGPathData[] | null;
  onUpload: (e: any) => void;
  onUpdateColor: (id: string, color: string) => void;
}

const ControlGroup: React.FC<{ label: string, value: number, min: number, max: number, step?: number, onChange: (v: number) => void, icon: React.ReactNode }> = ({ label, value, min, max, step = 1, onChange, icon }) => (
  <div className="bg-white border border-navy/5 p-6 rounded-2xl space-y-5 shadow-sm hover:border-petrol/20 transition-all">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3 text-petrol">
        <div className="p-2 bg-cream rounded-xl">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-widest text-navy/40">{label}</span>
      </div>
      <span className="text-[11px] font-mono font-black bg-cream px-3 py-1 rounded-full text-petrol">{value.toFixed(step < 1 ? 1 : 0)}</span>
    </div>
    <div className="flex items-center gap-5 px-1">
      <button onClick={() => onChange(Math.max(min, value - step))} className="w-10 h-10 flex items-center justify-center bg-cream rounded-xl hover:bg-navy/5 transition-colors"><Minus size={16}/></button>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1 h-1.5 accent-petrol bg-zinc-100 rounded-full appearance-none cursor-pointer" />
      <button onClick={() => onChange(Math.min(max, value + step))} className="w-10 h-10 flex items-center justify-center bg-cream rounded-xl hover:bg-navy/5 transition-colors"><Plus size={16}/></button>
    </div>
  </div>
);

const NFCBlockEditor: React.FC<{ block: NFCBlock, onUpdate: (u: Partial<NFCBlock>) => void, onDelete: () => void }> = ({ block, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setIsUploading(true);
    try {
      const fileName = `microsite_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('nudaim').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('nudaim').getPublicUrl(fileName);
      onUpdate({ imageUrl: data.publicUrl });
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const getIcon = () => {
    if (block.type === 'text') return <Type size={18}/>;
    if (block.type === 'image') return <ImageIcon size={18}/>;
    switch (block.buttonType) {
      case 'stamp_card': return <Award size={18} className="text-petrol" />;
      case 'review': return <Star size={18} className="text-yellow-500" />;
      case 'wifi': return <Wifi size={18} className="text-blue-500" />;
      case 'whatsapp': return <MessageCircle size={18} className="text-emerald-500" />;
      case 'social_loop': return <Instagram size={18} className="text-pink-500" />;
      default: return <Zap size={18}/>;
    }
  };

  return (
    <div className="bg-white border border-navy/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GripVertical size={14} className="text-zinc-200 cursor-grab" />
          <div className="p-2 bg-cream rounded-xl text-petrol">
            {getIcon()}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-navy">
              {block.buttonType === 'stamp_card' ? 'Treuekarte' : block.buttonType === 'whatsapp' ? 'WhatsApp' : (block.buttonType || block.type)}
            </span>
            <span className="text-[9px] text-zinc-400 truncate max-w-[150px] font-bold">{block.title || block.content || 'Einstellen...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className={`p-2 transition-transform ${expanded ? 'rotate-180' : ''}`}><ChevronDown size={18}/></button>
          <button onClick={onDelete} className="p-2 text-red-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-6 border-t border-navy/5 bg-cream/20 space-y-5 animate-in slide-in-from-top-2">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Titel / Name</label>
            <input type="text" value={block.title || ''} onChange={e => onUpdate({ title: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" placeholder="z.B. Schreib mir" />
          </div>

          {block.buttonType === 'whatsapp' && (
            <>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Telefonnummer</label>
                <input type="text" value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" placeholder="z.B. +491701234567" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Vorausgefüllter Text (optional)</label>
                <textarea value={block.settings?.message || ''} onChange={e => onUpdate({ settings: { ...block.settings, message: e.target.value } })} className="w-full p-4 rounded-xl border border-navy/5 text-xs h-16 bg-white resize-none font-medium" placeholder="Hallo! Ich habe eine Frage zu..." />
              </div>
            </>
          )}

          {block.buttonType === 'stamp_card' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Anzahl Stempel</label>
                  <input type="number" min="1" max="15" value={block.settings?.slots || 10} onChange={e => onUpdate({ settings: { ...block.settings, slots: parseInt(e.target.value) } })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">QR Secret Key</label>
                  <input type="text" value={block.settings?.secretKey || 'NUDAIM-STAMP-123'} onChange={e => onUpdate({ settings: { ...block.settings, secretKey: e.target.value } })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white font-mono" placeholder="Z.B. MEINLADEN" />
                </div>
              </div>
              <div className="p-4 bg-petrol/5 rounded-2xl border border-petrol/10 space-y-2">
                <div className="flex items-center gap-2 text-petrol"><QrCode size={14}/><span className="text-[9px] font-black uppercase tracking-widest">Setup Info</span></div>
                <p className="text-[9px] text-petrol/80 leading-relaxed font-medium">Kunden erhalten einen Stempel, wenn sie einen QR-Code scannen, der exakt den Text <strong>"{block.settings?.secretKey || 'NUDAIM-STAMP-123'}"</strong> enthält.</p>
              </div>
            </>
          )}
          
          {block.type !== 'magic_button' && (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inhalt / Text</label>
              <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs h-24 bg-white resize-none font-medium leading-relaxed" placeholder="Beschreibe dein Angebot..." />
            </div>
          )}

          {block.type === 'image' && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Bild Upload</label>
              <div className="relative h-40 rounded-3xl border-2 border-dashed border-navy/5 bg-white flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-petrol/30 transition-all overflow-hidden">
                {block.imageUrl ? (
                  <img src={block.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform" />
                ) : (
                  isUploading ? <Loader2 size={28} className="animate-spin text-petrol" /> : <div className="flex flex-col items-center gap-2 text-zinc-300"><ImageIcon size={32} strokeWidth={1} /><span className="text-[8px] font-black tracking-widest uppercase">Bild hierher ziehen</span></div>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ activeDept, config, setConfig, svgElements, onUpload, onUpdateColor }) => {
  const [active3dTab, setActive3dTab] = useState<'shape' | 'logo' | 'style'>('shape');
  const updateConfig = (key: keyof ModelConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));

  if (activeDept === '3d') {
    return (
      <div className="space-y-10 animate-in slide-in-from-left duration-700">
        <nav className="flex gap-2 bg-cream p-1 rounded-2xl border border-navy/5 shadow-inner">
          {[
            { id: 'shape', label: 'Basis', icon: <Box size={14}/> },
            { id: 'logo', label: 'Logo', icon: <Type size={14}/> },
            { id: 'style', label: 'Anpassung', icon: <Sliders size={14}/> }
          ].map(t => (
            <button key={t.id} onClick={() => setActive3dTab(t.id as any)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${active3dTab === t.id ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {active3dTab === 'shape' && (
          <div className="grid grid-cols-2 gap-4">
            {(['keychain', 'circle', 'rect'] as BaseType[]).map((t) => (
              <button key={t} onClick={() => updateConfig('baseType', t)} className={`p-8 rounded-[30px] border-2 transition-all flex flex-col items-center gap-4 ${config.baseType === t ? 'border-petrol bg-white shadow-2xl scale-105' : 'border-transparent bg-white opacity-60 hover:opacity-100'}`}>
                <div className={`p-4 rounded-2xl ${config.baseType === t ? 'bg-petrol text-white' : 'bg-cream text-zinc-300'}`}><Box size={28} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
              </button>
            ))}
            <div className="col-span-2 bg-white p-6 rounded-3xl border border-navy/5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3"><div className="p-2 bg-cream rounded-xl text-petrol"><Layers size={16}/></div><span className="text-[10px] font-black uppercase tracking-widest text-navy">Öse für Kette</span></div>
              <button onClick={() => updateConfig('hasChain', !config.hasChain)} className={`w-14 h-7 rounded-full relative transition-all ${config.hasChain ? 'bg-petrol' : 'bg-zinc-200'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.hasChain ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>
        )}

        {active3dTab === 'logo' && (
          <div className="space-y-6">
            <div className="relative h-64 border-2 border-dashed border-navy/10 rounded-[40px] flex flex-col items-center justify-center gap-8 bg-white shadow-inner group cursor-pointer hover:border-petrol/40 transition-all overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-petrol/5 to-action/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="w-20 h-20 bg-cream text-petrol rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform relative z-10"><Upload size={40} className="opacity-40" /></div>
               <input type="file" accept=".svg" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
               <div className="text-center relative z-10">
                  <p className="text-xs font-black uppercase tracking-widest text-navy mb-1">Upload SVG Logo</p>
                  <p className="text-[9px] text-zinc-400 font-medium">SVG für 3D Extrusion</p>
               </div>
            </div>
            {svgElements && (
              <div className="grid grid-cols-1 gap-4">
                <ControlGroup label="Skalierung" value={config.logoScale} min={0.1} max={2.5} step={0.05} onChange={v => updateConfig('logoScale', v)} icon={<Maximize2 size={16}/>}/>
                <ControlGroup label="Dicke (3D)" value={config.logoDepth} min={0.5} max={10} step={0.5} onChange={v => updateConfig('logoDepth', v)} icon={<Layers size={16}/>}/>
              </div>
            )}
          </div>
        )}

        {active3dTab === 'style' && (
          <div className="space-y-4">
            <ControlGroup label="X Position" value={config.logoPosX} min={-30} max={30} onChange={v => updateConfig('logoPosX', v)} icon={<Move size={16}/>}/>
            <ControlGroup label="Y Position" value={config.logoPosY} min={-30} max={30} onChange={v => updateConfig('logoPosY', v)} icon={<Move size={16}/>}/>
            <ControlGroup label="Rotation" value={config.logoRotation} min={0} max={360} step={15} onChange={v => updateConfig('logoRotation', v)} icon={<RotateCw size={16}/>}/>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in slide-in-from-right duration-700 pb-12">
      <section className="bg-navy p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-action/20 blur-3xl group-hover:bg-action/30 transition-all" />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="p-2 bg-white/10 rounded-xl"><ShieldCheck size={18} className="text-action" /></div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">NFeC Ecosystem</span>
        </div>
        <div className="space-y-3 relative z-10">
          <p className="text-[12px] font-bold text-white leading-relaxed">Physischer 3D-Druck trifft Cloud-Profil.</p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3"><Plus size={14} className="text-petrol"/> Magic Buttons</label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'stamp_card', title: 'Treuekarte', content: '', settings: { slots: 10, validationType: 'qr_code', secretKey: 'NUDAIM-STAMP-123', rewardText: 'Ein Gratis-Kaffee!' } }])} className="p-6 bg-white border border-navy/5 rounded-3xl flex flex-col items-center gap-3 hover:border-petrol/20 hover:shadow-xl transition-all group active:scale-95 shadow-sm">
            <div className="w-12 h-12 bg-cream rounded-2xl flex items-center justify-center text-petrol group-hover:bg-petrol group-hover:text-white transition-all"><Award size={24} /></div>
            <span className="text-[9px] font-black uppercase tracking-tighter">Loyalty</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'whatsapp', title: 'Schreib mir', content: '+49', settings: { message: 'Hallo!' } }])} className="p-6 bg-white border border-navy/5 rounded-3xl flex flex-col items-center gap-3 hover:border-petrol/20 hover:shadow-xl transition-all group active:scale-95 shadow-sm">
            <div className="w-12 h-12 bg-cream rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all"><MessageCircle size={24} /></div>
            <span className="text-[9px] font-black uppercase tracking-tighter">WhatsApp</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'review', title: 'Google Rezension', content: 'https://search.google.com/local/writereview?placeid=' }])} className="p-6 bg-white border border-navy/5 rounded-3xl flex flex-col items-center gap-3 hover:border-petrol/20 hover:shadow-xl transition-all group active:scale-95 shadow-sm">
            <div className="w-12 h-12 bg-cream rounded-2xl flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-white transition-all"><Star size={24} /></div>
            <span className="text-[9px] font-black uppercase tracking-tighter">Review</span>
          </button>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Profil Inhalt</label>
          <div className="flex gap-2">
             <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'text', title: 'Neu', content: 'Hier Text einfügen...' }])} className="p-2 bg-white border border-navy/5 rounded-xl hover:text-petrol transition-colors"><Type size={14}/></button>
             <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'image', title: 'Foto', content: '', imageUrl: '' }])} className="p-2 bg-white border border-navy/5 rounded-xl hover:text-petrol transition-colors"><ImageIcon size={14}/></button>
          </div>
        </div>
        <div className="space-y-4">
          {config.nfcBlocks.map(block => (
            <NFCBlockEditor 
              key={block.id} block={block} 
              onUpdate={u => updateConfig('nfcBlocks', config.nfcBlocks.map(b => b.id === block.id ? {...b, ...u} : b))}
              onDelete={() => updateConfig('nfcBlocks', config.nfcBlocks.filter(b => b.id !== block.id))}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
