
import React from 'react';
import { Smartphone, Wifi, Star, Instagram, Globe, Link as LinkIcon, AlertTriangle, ShieldCheck, Award, ArrowLeft } from 'lucide-react';
import { ModelConfig, NFCBlock } from '../types';

interface MicrositeProps {
  config: ModelConfig;
  error?: { title: string, msg: string } | null;
}

const BlockRenderer: React.FC<{ block: NFCBlock }> = ({ block }) => {
  if (block.type === 'text') {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-navy/5 shadow-sm space-y-2">
        {block.title && <h3 className="font-black text-navy text-[11px] uppercase tracking-widest">{block.title}</h3>}
        <p className="text-sm text-zinc-500 leading-relaxed">{block.content}</p>
      </div>
    );
  }

  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className="rounded-[2.5rem] overflow-hidden border border-navy/5 shadow-lg">
        <img src={block.imageUrl} alt={block.title} className="w-full h-auto object-cover" />
        {block.title && <div className="p-4 bg-white text-center font-bold text-[10px] uppercase tracking-widest border-t">{block.title}</div>}
      </div>
    );
  }

  if (block.type === 'magic_button') {
    const getIcon = () => {
      switch (block.buttonType) {
        case 'wifi': return <Wifi className="text-blue-500" />;
        case 'review': return <Star className="text-yellow-500" />;
        case 'social_loop': return <Instagram className="text-pink-500" />;
        case 'stamp_card': return <Award className="text-petrol" />;
        default: return <LinkIcon className="text-zinc-400" />;
      }
    };

    const handleAction = () => {
      if (block.buttonType === 'wifi') {
        alert(`WLAN Login:\nSSID: ${block.content}\nPasswort: ${block.settings?.password || 'Siehe Vorort'}`);
      } else if (block.content.startsWith('http')) {
        window.open(block.content, '_blank');
      } else {
        alert(`${block.title}\nInfo: ${block.content}`);
      }
    };

    return (
      <button 
        onClick={handleAction}
        className="w-full bg-white p-6 rounded-[2rem] border border-navy/5 shadow-sm flex items-center gap-6 hover:scale-[1.02] active:scale-[0.98] transition-all group"
      >
        <div className="w-14 h-14 bg-cream rounded-2xl flex items-center justify-center group-hover:bg-navy/5 transition-colors">
          {getIcon()}
        </div>
        <div className="text-left">
          <p className="font-black text-navy text-[11px] uppercase tracking-widest">{block.title || block.buttonType}</p>
          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter mt-1">Antippen zum Öffnen</p>
        </div>
      </button>
    );
  }

  return null;
};

export const Microsite: React.FC<MicrositeProps> = ({ config, error }) => {
  if (error) {
    return (
      <div className="h-screen w-screen bg-cream flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8">
          <AlertTriangle size={40} />
        </div>
        <h2 className="serif-headline text-3xl font-black italic uppercase mb-4 text-navy">{error.title}</h2>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed mb-10">{error.msg}</p>
        <button 
          onClick={() => window.location.href = window.location.origin + window.location.pathname} 
          className="flex items-center gap-3 px-8 py-4 bg-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-petrol transition-all"
        >
          <ArrowLeft size={16} /> Zurück zum Studio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cream text-navy selection:bg-petrol selection:text-white animate-in fade-in duration-700">
      {/* Header Profile */}
      <header className="pt-20 pb-12 px-8 flex flex-col items-center text-center space-y-6">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-navy/5 relative group overflow-hidden">
           <div className="absolute inset-0 bg-petrol/5 rounded-[2.5rem] animate-pulse group-hover:opacity-0 transition-opacity" />
           <ShieldCheck size={40} className="text-petrol relative z-10" />
        </div>
        <div className="space-y-2">
          <h1 className="serif-headline text-4xl font-black italic uppercase tracking-tight">NUDAIM NFeC</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-6 bg-petrol/20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-petrol">Authentic Digital ID</p>
            <div className="h-px w-6 bg-petrol/20" />
          </div>
        </div>
      </header>

      {/* Content Feed */}
      <main className="max-w-md mx-auto px-6 pb-32 space-y-6">
        {config.nfcBlocks.length > 0 ? (
          config.nfcBlocks.map(block => (
            <BlockRenderer key={block.id} block={block} />
          ))
        ) : (
          <div className="text-center py-20 opacity-20 italic font-medium">Profil wird geladen...</div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-cream via-cream to-transparent pointer-events-none">
        <div className="max-w-md mx-auto flex flex-col items-center pointer-events-auto">
          <button 
            onClick={() => window.location.href = window.location.origin + window.location.pathname}
            className="bg-navy text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform hover:bg-petrol"
          >
            <Smartphone size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Eigene NFeC erstellen</span>
          </button>
          <p className="mt-4 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-300">Powered by NUDAIM3D STUDIO</p>
        </div>
      </footer>
    </div>
  );
};
