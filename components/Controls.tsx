
import React, { useState } from 'react';
// Fixed: Imported Department type from central types.ts
import { ModelConfig, SVGPathData, BaseType, NFCBlock, MagicButtonType, Department } from '../types';
import { Maximize2, Move, RotateCw, Box, Type, Layers, Plus, Minus, Upload, Trash2, Smartphone, Wifi, Star, GripVertical, ChevronDown, Link as LinkIcon, Image as ImageIcon, Briefcase, Zap, Loader2, Sparkles, Sliders, Instagram, Linkedin, MapPin, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ControlsProps {
  // Uses imported Department type
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

  const updateSettings = (s: any) => onUpdate({ settings: { ...block.settings, ...s } });

  const getIcon = () => {
    if (block.type === 'text') return <Type size={18}/>;
    if (block.type === 'image') return <ImageIcon size={18}/>;
    switch (block.buttonType) {
      case 'stamp_card': return <Award size={18} className="text-petrol" />;
      case 'review': return <Star size={18} className="text-yellow-500" />;
      case 'wifi': return <Wifi size={18} className="text-blue-500" />;
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
            <span className="text-[10px] font-black uppercase tracking-widest text-navy">{block.buttonType || block.type}</span>
            <span className="text-[9px] text-zinc-400 truncate max-w-[150px]">{block.title || block.content || 'Inhalt bearbeiten'}</span>
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
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Titel</label>
            <input type="text" value={block.title || ''} onChange={e => onUpdate({ title: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs bg-white" placeholder="Überschrift..." />
          </div>
          
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Beschreibung</label>
            <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })} className="w-full p-4 rounded-xl border border-navy/5 text-xs h-20 bg-white resize-none" placeholder="Details..." />
          </div>

          {block.type === 'image' && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Bild</label>
              <div className="relative h-32 rounded-2xl border-2 border-dashed border-navy/5 bg-white flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-petrol/30 transition-all overflow-hidden">
                {block.imageUrl ? (
                  <img src={block.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                ) : (
                  isUploading ? <Loader2 size={24} className="animate-spin text-petrol" /> : <Upload size={24} className="text-zinc-200" />
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 z-10">{block.imageUrl ? 'Bild ändern' : 'Datei wählen'}</span>
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
            { id: 'shape', label: 'Form', icon: <Box size={14}/> },
            { id: 'logo', label: 'Logo', icon: <Type size={14}/> },
            { id: 'style', label: 'Tweak', icon: <Sliders size={14}/> }
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
            <div className="col-span-2 bg-white p-6 rounded-3xl border border-navy/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-navy/40">Schlüsselanhänger Loch</span>
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
                  <p className="text-xs font-black uppercase tracking-widest text-navy mb-1">Eigene SVG Datei</p>
                  <p className="text-[9px] text-zinc-400 font-medium">Vektorformat für 3D Extrusion</p>
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
            <ControlGroup label="X Achse" value={config.logoPosX} min={-30} max={30} onChange={v => updateConfig('logoPosX', v)} icon={<Move size={16}/>}/>
            <ControlGroup label="Y Achse" value={config.logoPosY} min={-30} max={30} onChange={v => updateConfig('logoPosY', v)} icon={<Move size={16}/>}/>
            <ControlGroup label="Drehung" value={config.logoRotation} min={0} max={360} step={15} onChange={v => updateConfig('logoRotation', v)} icon={<RotateCw size={16}/>}/>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in slide-in-from-right duration-700 pb-12">
      <section className="space-y-5">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-3"><Sparkles size={14}/> Design Template</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'modern', icon: <Zap size={16}/> },
            { id: 'minimal', icon: <Box size={16}/> },
            { id: 'professional', icon: <Briefcase size={16}/> }
          ].map((t: any) => (
            <button key={t.id} onClick={() => updateConfig('nfcTemplate', t.id)} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${config.nfcTemplate === t.id ? 'bg-petrol text-white border-petrol shadow-xl scale-105' : 'bg-white border-navy/5 text-zinc-300 hover:text-navy'}`}>
              {t.icon} <span className="text-[9px] font-black uppercase tracking-widest">{t.id}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-3"><Plus size={14}/> Magic Buttons hinzufügen</label>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'stamp_card', title: 'Loyalty Rewards', content: 'Sammle Stempel bei jedem Einkauf!' }])} className="p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 hover:border-petrol/20 hover:shadow-lg transition-all group">
            <Award size={20} className="text-petrol group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Treuekarte</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'review', title: 'Google Review', content: 'Lass uns eine Bewertung da!' }])} className="p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 hover:border-petrol/20 hover:shadow-lg transition-all group">
            <Star size={20} className="text-yellow-500 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Review</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'social_loop', title: 'Folge uns', content: 'Bleib auf dem Laufenden.' }])} className="p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 hover:border-petrol/20 hover:shadow-lg transition-all group">
            <Instagram size={20} className="text-pink-500 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Social</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'magic_button', buttonType: 'wifi', title: 'Gast WiFi', content: 'Kostenloser Internetzugang.' }])} className="p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 hover:border-petrol/20 hover:shadow-lg transition-all group">
            <Wifi size={20} className="text-action group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-tighter">WiFi</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'text', title: 'Infotext', content: 'Schreibe hier etwas wichtiges...' }])} className="p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 hover:border-petrol/20 hover:shadow-lg transition-all">
            <Type size={20} className="text-navy" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Text</span>
          </button>
          <button onClick={() => updateConfig('nfcBlocks', [...config.nfcBlocks, { id: Date.now().toString(), type: 'image', title: 'Galerie', content: 'Ein schönes Bild.' }])} className="p-4 bg-white border border-navy/5 rounded-2xl flex flex-col items-center gap-2 hover:border-petrol/20 hover:shadow-lg transition-all">
            <ImageIcon size={20} className="text-zinc-400" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Bild</span>
          </button>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Seiten-Struktur</label>
          <span className="bg-cream px-3 py-1 rounded-full text-[9px] font-mono font-bold text-petrol">{config.nfcBlocks.length} Blöcke</span>
        </div>
        <div className="space-y-4">
          {config.nfcBlocks.length === 0 && (
            <div className="p-12 border-2 border-dashed border-navy/5 rounded-[40px] bg-white text-center opacity-40">
              <Smartphone size={32} className="mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Wähle Blöcke aus</p>
            </div>
          )}
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