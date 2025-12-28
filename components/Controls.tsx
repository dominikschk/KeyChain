import React from 'react';
import { ModelConfig, SVGPathData } from '../types';
import { Layers, Maximize2, Move, RotateCw, Box, ShieldCheck, ToggleLeft, ToggleRight, FlipHorizontal, Link as LinkIcon, Type, MousePointer2, Palette } from 'lucide-react';

interface ControlsProps {
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  hasLogo: boolean;
  svgElements: SVGPathData[] | null;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateColor: (id: string, color: string) => void;
  logoDimensions: { width: number, height: number };
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  icon?: React.ReactNode;
  unit?: string;
  disabled?: boolean;
}> = ({ label, value, min, max, step = 1, onChange, icon, unit = 'mm', disabled }) => (
  <div className={`space-y-2.5 transition-opacity ${disabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
    <div className="flex justify-between items-center text-[10px] font-bold tracking-tight">
      <div className="flex items-center gap-2 text-zinc-500 uppercase">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-zinc-200 font-mono bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/50">
        {value.toFixed(1)}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
    />
  </div>
);

export const Controls: React.FC<ControlsProps> = ({ 
  config, 
  setConfig, 
  hasLogo, 
  svgElements, 
  selectedElementId, 
  onSelectElement, 
  onUpdateColor,
  logoDimensions 
}) => {
  const updateConfig = (key: keyof ModelConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Berechnung der maximalen Verschiebung, damit das Logo nicht über den Rand ragt
  // Platte ist 45x45mm, also von -22.5 bis 22.5
  const maxMoveX = Math.max(0, (45 - logoDimensions.width) / 2);
  const maxMoveY = Math.max(0, (45 - logoDimensions.height) / 2);

  return (
    <div className="space-y-8 pb-6">
      {/* SVG Elements List */}
      <section className={`space-y-4 transition-all ${!hasLogo ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.15em]">
          <Palette size={14} className="text-blue-500" />
          <span>Formen & Farben</span>
        </div>
        <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          {svgElements?.map(el => (
            <div 
              key={el.id}
              onClick={() => onSelectElement(el.id)}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                selectedElementId === el.id ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full border border-white/20" 
                  style={{ backgroundColor: el.currentColor }} 
                />
                <span className="text-[10px] font-bold text-zinc-300 truncate w-32">{el.name}</span>
              </div>
              {selectedElementId === el.id && (
                <input 
                  type="color" 
                  value={el.currentColor} 
                  onChange={(e) => onUpdateColor(el.id, e.target.value)}
                  className="w-6 h-6 bg-transparent border-none cursor-pointer p-0"
                />
              )}
              <MousePointer2 size={12} className={selectedElementId === el.id ? 'text-blue-500' : 'text-zinc-600'} />
            </div>
          ))}
        </div>
      </section>

      {/* Base Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.15em]">
          <Box size={14} className="text-blue-500" />
          <span>Basis & Add-ons</span>
        </div>
        <div className="space-y-5 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
              <LinkIcon size={12} /> Schlüsselkette
            </span>
            <button 
              onClick={() => updateConfig('hasChain', !config.hasChain)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {config.hasChain ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-zinc-600" />}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
              <Type size={12} /> Text-Addon (Rückseite)
            </label>
            <input 
              type="text"
              placeholder="@handle oder Link"
              value={config.customLink}
              onChange={(e) => updateConfig('customLink', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <Slider 
            label="Dicke Basis" 
            value={config.plateDepth} 
            min={2} max={8} step={0.5}
            onChange={(v) => updateConfig('plateDepth', v)} 
          />
        </div>
      </section>

      {/* Logo Transformation */}
      <section className={`space-y-4 transition-all duration-500 ${!hasLogo ? 'opacity-30 blur-[2px] pointer-events-none grayscale' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.15em]">
          <Layers size={14} className="text-blue-500" />
          <span>Logo Position & Skalierung</span>
        </div>
        
        <div className="space-y-5 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
          <Slider 
            label="Skalierung" 
            value={config.logoScale} 
            min={0.05} max={1.5} step={0.01} 
            unit="x"
            onChange={(v) => updateConfig('logoScale', v)} 
            icon={<Maximize2 size={12} />}
          />
          <Slider 
            label="Extrusion" 
            value={config.logoDepth} 
            min={0.1} max={8} step={0.1}
            onChange={(v) => updateConfig('logoDepth', v)} 
            icon={<Layers size={12} />}
          />
          
          <div className="grid grid-cols-2 gap-4">
             <Slider 
              label="Position X" 
              value={config.logoPosX} 
              min={-maxMoveX} max={maxMoveX} step={0.5}
              onChange={(v) => updateConfig('logoPosX', v)} 
              icon={<Move size={12} />}
            />
            <Slider 
              label="Position Y" 
              value={config.logoPosY} 
              min={-maxMoveY} max={maxMoveY} step={0.5}
              onChange={(v) => updateConfig('logoPosY', v)} 
              icon={<Move size={12} />}
            />
          </div>

          <Slider 
            label="Rotation" 
            value={config.logoRotation} 
            min={0} max={360} 
            unit="°"
            onChange={(v) => updateConfig('logoRotation', v)} 
            icon={<RotateCw size={12} />}
          />
        </div>

        <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                <FlipHorizontal size={12} /> Spiegeln
              </span>
              <button 
                onClick={() => updateConfig('mirrorX', !config.mirrorX)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {config.mirrorX ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-zinc-600" />}
              </button>
            </div>
        </div>
      </section>
    </div>
  );
};