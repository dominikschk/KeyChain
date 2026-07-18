/**
 * Leichte Handy-Vorschau ohne WebGL (Site-Phase).
 */
import React from 'react';
import type { ModelConfig } from '../types';
import { Microsite } from './Microsite';

export const SitePreview: React.FC<{
  config: ModelConfig;
  googleLogoUrl?: string | null;
  label?: string;
}> = ({ config, googleLogoUrl, label }) => {
  const isExternal = config.landingMode === 'external';
  const dest = (config.externalUrl || '').trim();

  return (
    <div className="w-full h-full relative bg-cream overflow-y-auto pt-10 pb-24 md:py-12 px-6 flex flex-col items-center">
      {label && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-white/95 border border-zinc-200 shadow-sm text-xs font-semibold text-navy">
          {label}
        </div>
      )}
      <div className="w-full max-w-[280px] md:max-w-[320px] aspect-[9/18.5] bg-zinc-950 rounded-[2.5rem] border-[8px] border-zinc-900 shadow-xl relative flex flex-col overflow-hidden ring-1 ring-white/10 shrink-0">
        <div className="h-6 flex items-center justify-center shrink-0 bg-zinc-900">
          <div className="w-14 h-3.5 bg-black rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white min-h-0">
          {isExternal ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-cream">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Kunden landen hier</p>
              <p className="text-sm font-bold text-navy break-all leading-snug">
                {dest || 'Noch keine Adresse'}
              </p>
              <p className="text-[10px] text-zinc-500 leading-snug">
                Website, Instagram, Google-Profil oder Shop – was du verlinkst.
              </p>
            </div>
          ) : (
            <div className="origin-top scale-[0.92] w-[108%] -ml-[4%]">
              <Microsite config={config} googleLogoUrl={googleLogoUrl} embedded />
            </div>
          )}
        </div>
        <div className="h-4 flex items-center justify-center shrink-0 bg-zinc-900">
          <div className="w-12 h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
};
