
import React from 'react';
import { ModelConfig, SVGPathData } from '../types';
import { Maximize2, Move, RotateCw, Box, Type, Palette, Plus, Minus, Layers, Upload, Check, ChevronRight, ArrowRight } from 'lucide-react';

interface ControlsProps {
  activeTab: 'upload' | 'adjust' | 'style';
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  svgElements: SVGPathData[] | null;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateColor: (id: string, color: string) => void;
  logoDimensions: { width: number, height: number };
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ControlGroup: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  icon: React.ReactNode;
  unit?: string;
}> = ({ label, value, min, max, step = 1, onChange, icon, unit = 'mm' }) => {
  const update = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)));

  return (
    <div className="bg-white border border-navy/5 p-7 rounded-button soft-shadow space-y-6 transition-all duration-300 hover:border-action/20">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-cream rounded-lg text-petrol">{icon}</div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-navy/40">{label}</span>
        </div>
        <div className="px-3 py-1.5 bg-cream/50 rounded-full border border-navy/5 font-mono text-[10px] font-black text-petrol">
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </div>
      </div>
      
      <div className="flex items-center gap-5">
        <button 
          onClick={() => update(-step)}
          className="w-10 h-10 rounded-lg bg-white border border-navy/10 flex items-center justify-center active:scale-90 hover:bg-cream transition-all text-navy/40"
        >
          <Minus size={18} />
        </button>
        
        <div className="flex-1 relative h-1.5 bg-softgrey rounded-full overflow-hidden border border-white shadow-inner">
          <div 
            className="absolute h-full bg-petrol rounded-full" 
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <button 
          onClick={() => update(step)}
          className="w-10 h-10 rounded-lg bg-white border border-navy/10 flex items-center justify-center active:scale-90 hover:bg-cream transition-all text-navy/40"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ 
  activeTab,
  config, 
  setConfig, 
  svgElements, 
  selectedElementId, 
  onSelectElement, 
  onUpdateColor,
  onUpload
}) => {
  const updateConfig = (key: keyof ModelConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const trendColors = ['#FFFFFF', '#11235A', '#006699', '#12A9E0', '#46C1E9', '#FF3E3E', '#F59E0B', '#000000'];

  if (activeTab === 'upload') {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="relative group">
          <input type="file" accept=".svg" onChange={onUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="border-2 border-dashed border-navy/5 rounded-[20px] p-20 flex flex-col items-center gap-8 bg-white group-hover:border-action/30 transition-all duration-500 group-active:scale-98 soft-shadow">
            <div className="w-20 h-20 bg-cream text-petrol rounded-full flex items-center justify-center shadow-inner group-hover:scale-105 transition-all duration-500">
              <Upload size={36} className="opacity-40" />
            </div>
            <div className="text-center space-y-3">
              <p className="serif-headline text-xl text-navy">Design wählen</p>
              <p className="text-[9px] text-navy/20 font-black uppercase tracking-[0.4em]">SVG Vektor importieren</p>
            </div>
          </div>
        </div>

        {svgElements && (
          <div className="bg-mint/5 border border-mint/20 p-6 rounded-button flex items-center gap-4 text-mint animate-in zoom-in-95">
            <div className="bg-mint/20 p-2 rounded-full"><Check size={18} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Logo-Geometrie analysiert</span>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'adjust') {
    return (
      <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {!svgElements ? (
           <div className="bg-white border border-navy/5 p-16 rounded-button text-center text-navy/10 text-[9px] font-black uppercase tracking-[0.4em] soft-shadow">
             Warte auf Atelier-Material...
           </div>
        ) : (
          <>
            <ControlGroup label="Skalierung" value={config.logoScale} min={0.1} max={2.0} step={0.05} unit="x" onChange={(v) => updateConfig('logoScale', v)} icon={<Maximize2 size={18} />} />
            <ControlGroup label="Relief-Höhe" value={config.logoDepth} min={0.5} max={10} step={0.5} onChange={(v) => updateConfig('logoDepth', v)} icon={<Layers size={18} />} />
            <ControlGroup label="X-Position" value={config.logoPosX} min={-25} max={25} step={1} onChange={(v) => updateConfig('logoPosX', v)} icon={<Move size={18} />} />
            <ControlGroup label="Y-Position" value={config.logoPosY} min={-25} max={25} step={1} onChange={(v) => updateConfig('logoPosY', v)} icon={<Move size={18} />} />
            <ControlGroup label="Rotation" value={config.logoRotation} min={0} max={360} step={15} unit="°" onChange={(v) => updateConfig('logoRotation', v)} icon={<RotateCw size={18} />} />
          </>
        )}
      </div>
    );
  }

  if (activeTab === 'style') {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <section className="space-y-8">
          <div className="flex items-center gap-4 text-navy/20 font-black text-[10px] uppercase tracking-[0.4em] px-4">
            <Palette size={18} className="text-action" />
            <span>Kollektion</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {!svgElements ? (
               <div className="text-navy/10 text-center py-20 text-[9px] font-black uppercase tracking-[0.4em] border border-dashed border-navy/5 rounded-button">Standby</div>
            ) : svgElements.map(el => (
              <div key={el.id} className="space-y-4">
                <button 
                  onClick={() => onSelectElement(el.id)}
                  className={`w-full flex items-center justify-between p-6 rounded-button border transition-all duration-300 ${
                    selectedElementId === el.id ? 'bg-white border-petrol soft-shadow scale-[1.02]' : 'bg-white border-navy/5 hover:border-navy/20'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-lg border border-navy/5 shadow-inner" style={{ backgroundColor: el.currentColor }} />
                    <div className="flex flex-col text-left">
                      <span className="serif-headline text-lg tracking-tight text-navy">{el.name}</span>
                      <span className="text-[8px] font-mono text-navy/20 uppercase tracking-widest">{el.currentColor}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className={`transition-transform duration-300 ${selectedElementId === el.id ? 'rotate-90 text-petrol' : 'text-navy/10'}`} />
                </button>
                
                {selectedElementId === el.id && (
                  <div className="bg-cream/40 p-8 rounded-button border border-navy/5 grid grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
                    {trendColors.map(c => (
                      <button 
                        key={c}
                        onClick={() => onUpdateColor(el.id, c)}
                        className={`aspect-square rounded-lg border-2 transition-all duration-300 transform hover:scale-110 ${el.currentColor === c ? 'border-petrol scale-110 shadow-lg' : 'border-white'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="relative aspect-square rounded-lg bg-white border border-navy/5 flex items-center justify-center overflow-hidden hover:border-petrol transition-all shadow-sm">
                       <input 
                        type="color" 
                        value={el.currentColor} 
                        onChange={(e) => onUpdateColor(el.id, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-[6]"
                      />
                      <Palette size={20} className="text-navy/20" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4 text-navy/20 font-black text-[10px] uppercase tracking-[0.4em] px-4">
            <Type size={18} className="text-action" />
            <span>Gravur-Addon</span>
          </div>
          <div className="bg-white p-10 rounded-button border border-navy/5 space-y-10 soft-shadow">
            <div className="space-y-4">
              <label className="text-[9px] font-black text-navy/30 uppercase tracking-[0.3em] px-1">Beschriftung</label>
              <input 
                type="text"
                placeholder="Text eingeben..."
                value={config.customLink}
                onChange={(e) => updateConfig('customLink', e.target.value)}
                className="w-full h-14 bg-cream/50 border border-navy/5 rounded-lg px-6 text-sm font-medium focus:ring-1 focus:ring-action/20 outline-none transition-all placeholder:text-navy/10 text-navy"
              />
            </div>
            
            <ControlGroup label="Basis Dicke" value={config.plateDepth} min={2} max={10} step={1} onChange={(v) => updateConfig('plateDepth', v)} icon={<Box size={18} />} />
          </div>
        </section>
      </div>
    );
  }

  return null;
};
