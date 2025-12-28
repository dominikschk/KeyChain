import React from 'react';
import { ModelConfig } from '../types';
import { Layers, Maximize2, Move, RotateCw, Box, ShieldCheck, ToggleLeft, ToggleRight, FlipHorizontal, Link as LinkIcon, Type } from 'lucide-react';

interface ControlsProps {
  config: ModelConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  hasLogo: boolean;
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
        {value}{unit}
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

export const Controls: React.FC<ControlsProps> = ({ config, setConfig, hasLogo }) => {
  const updateConfig = (key: keyof ModelConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8 pb-6">
      {/* Base Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.15em]">
          <Box size={14} className="text-blue-500" />
          <span>Basis & Add-ons</span>
        </div>
        <div className="space-y-5 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
          <div className="flex items-center justify-between mb-2">
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

          {/* Link / Text Addon Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
              <Type size={12} /> Link / Text auf Rückseite
            </label>
            <input 
              type="text"
              placeholder="z.B. @deinname oder URL"
              value={config.customLink}
              onChange={(e) => updateConfig('customLink', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase mt-2">
             <span>Abmessungen (fix)</span>
             <span className="text-zinc-400">45 x 45 mm</span>
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
          <span>Logo Individualisierung</span>
        </div>
        
        <div className="space-y-5 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
              <ShieldCheck size={12} /> Hohlkörper (Shell)
            </span>
            <button 
              onClick={() => updateConfig('isHollow', !config.isHollow)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {config.isHollow ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-zinc-600" />}
            </button>
          </div>

          <Slider 
            label="Wandstärke" 
            value={config.wallThickness} 
            min={0.8} max={5} step={0.2}
            disabled={!config.isHollow}
            onChange={(v) => updateConfig('wallThickness', v)} 
            icon={<Layers size={12} />}
          />

          <div className="border-t border-zinc-800/50 pt-4 mt-2" />

          <div className="mb-2">
            <button
              onClick={() => updateConfig('mirrorX', !config.mirrorX)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                config.mirrorX 
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              <FlipHorizontal size={14} />
              Horizontal spiegeln
            </button>
          </div>

          <Slider 
            label="Skalierung" 
            value={config.logoScale} 
            min={0.05} max={2.0} step={0.01} 
            unit="x"
            onChange={(v) => updateConfig('logoScale', v)} 
            icon={<Maximize2 size={12} />}
          />
          <Slider 
            label="Extrusion" 
            value={config.logoDepth} 
            min={0.1} max={10} step={0.1}
            onChange={(v) => updateConfig('logoDepth', v)} 
            icon={<Layers size={12} />}
          />
          <Slider 
            label="Rotation" 
            value={config.logoRotation} 
            min={0} max={360} 
            unit="°"
            onChange={(v) => updateConfig('logoRotation', v)} 
            icon={<RotateCw size={12} />}
          />
        </div>

        <div className="space-y-5 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 shadow-inner">
          <Slider 
            label="Position X" 
            value={config.logoPosX} 
            min={-30} max={30} 
            onChange={(v) => updateConfig('logoPosX', v)} 
            icon={<Move size={12} />}
          />
          <Slider 
            label="Position Y" 
            value={config.logoPosY} 
            min={-30} max={30} 
            onChange={(v) => updateConfig('logoPosY', v)} 
            icon={<Move size={12} />}
          />
        </div>
      </section>
    </div>
  );
};