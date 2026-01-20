
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, QrCode as QrIcon, X, ArrowRight, RefreshCw, Edit3, Smartphone, Box, ShoppingCart } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { Microsite } from './components/Microsite';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData, Department, SavingStep, NFCBlock } from './types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import * as THREE from 'three';
import { supabase } from './lib/supabase';

const ConfirmationModal: React.FC<{ 
  config: ModelConfig, 
  onConfirm: () => void, 
  onCancel: () => void,
  screenshot: string | null
}> = ({ onConfirm, onCancel, screenshot, config }) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-navy/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[85dvh] shadow-2xl animate-in zoom-in duration-300">
        <header className="p-4 md:p-5 border-b border-navy/5 flex items-center justify-between shrink-0">
          <h2 className="serif-headline text-lg md:text-xl font-black italic uppercase text-navy">Konfiguration bestätigen</h2>
          <button onClick={onCancel} className="p-2 text-zinc-300 hover:text-navy transition-colors"><X size={24} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-container min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="aspect-square bg-cream rounded-2xl flex items-center justify-center p-4 border border-navy/5">
              {screenshot ? <img src={screenshot} className="w-full h-full object-contain" alt="Hardware Preview" /> : <Loader2 className="animate-spin opacity-10" />}
            </div>
            <div className="aspect-square bg-navy rounded-2xl flex flex-col items-center justify-center p-8 text-white text-center">
               <QrIcon size={32} className="opacity-20 mb-4" />
               <p className="text-[12px] font-black uppercase tracking-[0.2em]">{config.profileTitle}</p>
               <p className="text-[8px] uppercase tracking-widest mt-2 opacity-50">Digitales Profil aktiv</p>
            </div>
          </div>
          <div className="bg-cream p-4 rounded-2xl border border-navy/5">
            <p className="text-[10px] text-zinc-500 leading-relaxed text-center italic">
              Hinweis: Dein Unikat wird nun mit dem gewählten Branding produziert. Das digitale Profil kannst du auch nach der Bestellung jederzeit im Studio anpassen.
            </p>
          </div>
        </div>
        <footer className="p-4 md:p-5 border-t border-navy/5 bg-zinc-50 shrink-0">
          <button onClick={onConfirm} className="w-full h-12 md:h-14 bg-navy text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg shadow-navy/20">
            <span>JETZT BESTELLEN</span>
            <ArrowRight size={18} />
          </button>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [viewMode] = useState<'editor' | 'microsite'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') ? 'microsite' : 'editor';
  });

  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeDept, setActiveDept] = useState<Department>('3d');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [savingStep, setSavingStep] = useState('idle');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  
  const viewerRef = useRef<{ takeScreenshot: () => Promise<string> }>(null);
  const [previewType, setPreviewType] = useState<'3d' | 'digital'>('3d');

  useEffect(() => {
    // Sync preview type with tab selection
    if (activeDept === '3d') setPreviewType('3d');
    else setPreviewType('digital');
  }, [activeDept]);

  const initiateSave = async () => {
    const screenshot = await viewerRef.current?.takeScreenshot();
    setCurrentScreenshot(screenshot || null);
    setShowConfirmation(true);
  };

  const executeSave = async () => {
    if (!supabase) return;
    setShowConfirmation(false);
    setSavingStep('screenshot');
    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    try {
      let finalImageUrl = '';
      if (currentScreenshot) {
        setSavingStep('upload');
        const res = await fetch(currentScreenshot);
        const blob = await res.blob();
        await supabase.storage.from('nudaim').upload(`nudaim_${shortId}.png`, blob);
        const { data } = supabase.storage.from('nudaim').getPublicUrl(`nudaim_${shortId}.png`);
        finalImageUrl = data.publicUrl;
      }

      setSavingStep('db');
      const { data: configRow, error: dbError } = await supabase.from('nfc_configs').insert([{ 
        short_id: shortId, 
        preview_image: finalImageUrl,
        profile_title: config.profileTitle,
        header_image_url: config.headerImageUrl,
        profile_logo_url: config.profileLogoUrl,
        accent_color: config.accentColor,
        theme: config.theme,
        font_style: config.fontStyle,
        plate_data: {
          baseType: config.baseType,
          plateWidth: config.plateWidth,
          plateHeight: config.plateHeight,
          plateDepth: config.plateDepth,
          logoScale: config.logoScale,
          logoColor: config.logoColor,
          logoDepth: config.logoDepth,
          logoPosX: config.logoPosX,
          logoPosY: config.logoPosY,
          logoRotation: config.logoRotation
        }
      }]).select().single();

      if (dbError) throw dbError;

      // Handle Blocks
      const { error: blockError } = await supabase.from('nfc_blocks').insert(config.nfcBlocks.map((b, i) => ({
        config_id: configRow.id,
        type: b.type,
        title: b.title,
        content: b.content,
        button_type: b.buttonType,
        image_url: b.imageUrl,
        settings: b.settings,
        sort_order: i
      })));

      if (blockError) throw blockError;

      // Shopify Redirect
      window.location.href = `https://nudaim3d.de/cart/add?id=56564338262361&quantity=1&properties[Config-ID]=${shortId}&properties[Preview]=${finalImageUrl}`;
    } catch (err) {
      console.error("Save error:", err);
      setSavingStep('idle');
      alert("Fehler beim Speichern. Bitte versuche es erneut.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const loader = new SVGLoader();
      const svgData = loader.parse(ev.target?.result as string);
      
      const elements = svgData.paths.map((path, i) => ({
        id: `path-${i}`, 
        shapes: SVGLoader.createShapes(path), 
        color: path.color.getStyle(), 
        currentColor: path.color.getStyle(), 
        name: `Teil ${i + 1}`
      }));

      // Calculate Bounding Box for Auto-Scaling
      const box = new THREE.Box3();
      elements.forEach(el => {
        el.shapes.forEach(shape => {
          const points = shape.getPoints();
          points.forEach(p => box.expandByPoint(new THREE.Vector3(p.x, -p.y, 0)));
        });
      });

      const size = new THREE.Vector3();
      box.getSize(size);
      
      // Aim for ~38mm on a 40mm plate (Maximized with small safety margin)
      const targetSize = 38;
      const autoScale = targetSize / Math.max(size.x, size.y);

      setSvgElements(elements);
      setConfig(prev => ({ 
        ...prev, 
        logoScale: parseFloat(autoScale.toFixed(3)),
        logoPosX: 0,
        logoPosY: 0
      }));
    };
    reader.readAsText(file);
  };

  if (viewMode === 'microsite') {
    return <Microsite config={config} />;
  }

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-cream text-navy overflow-hidden">
      {showConfirmation && (
        <ConfirmationModal config={config} onConfirm={executeSave} onCancel={() => setShowConfirmation(false)} screenshot={currentScreenshot} />
      )}

      {/* SIDEBAR / EDITOR */}
      <aside className={`flex flex-col bg-white border-r border-navy/5 shadow-2xl transition-all duration-300 w-full md:w-[420px] shrink-0 z-20 min-h-0 ${mobileTab === 'editor' ? 'flex-1' : 'hidden md:flex'}`}>
        <header className="p-4 md:p-6 border-b border-navy/5 bg-zinc-50/30 shrink-0">
          <div className="flex items-center justify-between mb-4">
             <h1 className="serif-headline font-black text-xl uppercase italic text-navy leading-none tracking-tight">NUDAIM3D</h1>
             <div className="bg-action/10 text-action px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest">STUDIO</div>
          </div>
          <div className="flex bg-cream p-1 rounded-xl border border-navy/5 shadow-inner">
            <button onClick={() => setActiveDept('3d')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeDept === '3d' ? 'bg-white shadow-sm text-petrol' : 'text-zinc-400'}`}>3D Branding</button>
            <button onClick={() => setActiveDept('digital')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeDept === 'digital' ? 'bg-white shadow-sm text-petrol' : 'text-zinc-400'}`}>Microsite</button>
          </div>
        </header>

        <div className="flex-1 scroll-container technical-grid-fine">
          <div className="p-4 md:p-6 pb-4 md:pb-12">
            <Controls activeDept={activeDept} config={config} setConfig={setConfig} svgElements={svgElements} onUpload={handleFileUpload} onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)} />
          </div>
        </div>

        {/* MOBILE EDITOR ACTIONS */}
        <div className="md:hidden p-4 bg-white border-t border-navy/5 shrink-0">
           <button 
             onClick={() => setMobileTab('preview')}
             className="w-full h-12 bg-petrol text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
           >
             <span>Vorschau ansehen</span>
             <ArrowRight size={14} />
           </button>
        </div>

        {/* DESKTOP FOOTER */}
        <footer className="p-5 border-t border-navy/5 bg-zinc-50/50 shrink-0 hidden md:block">
          <button onClick={initiateSave} className="w-full h-12 bg-navy text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform">
             <span>KONFIGURATION ABSCHLIESSEN</span>
             <ArrowRight size={16} />
          </button>
        </footer>
      </aside>

      {/* PREVIEW AREA */}
      <main className={`flex-1 relative bg-cream z-10 min-h-0 ${mobileTab === 'preview' ? 'flex flex-col' : 'hidden md:flex'}`}>
        <div className="flex-1 relative overflow-hidden">
          <Viewer ref={viewerRef} config={config} svgElements={svgElements} showNFCPreview={previewType === 'digital'} />
          
          {/* VIEW TYPE TOGGLE - Floating UI */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] flex p-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-navy/10 shadow-2xl transition-all">
             <button 
               onClick={() => setPreviewType('3d')}
               className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all ${previewType === '3d' ? 'bg-navy text-white shadow-lg' : 'text-zinc-400'}`}
             >
               <Box size={14} />
               <span>Hardware</span>
             </button>
             <button 
               onClick={() => setPreviewType('digital')}
               className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all ${previewType === 'digital' ? 'bg-navy text-white shadow-lg' : 'text-zinc-400'}`}
             >
               <Smartphone size={14} />
               <span>Digital</span>
             </button>
          </div>
        </div>

        {/* MOBILE PREVIEW ACTIONS */}
        <div className="md:hidden p-4 bg-white border-t border-navy/5 shrink-0">
          <button onClick={initiateSave} className="w-full h-12 bg-navy text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform">
             <ShoppingCart size={16} />
             <span>JETZT BESTELLEN</span>
             <ArrowRight size={16} />
          </button>
        </div>

        {savingStep !== 'idle' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-[600] flex flex-col items-center justify-center text-center px-6">
            <RefreshCw className="text-petrol animate-spin mb-4" size={48} />
            <p className="font-black uppercase tracking-widest italic text-navy">Konfiguration wird gesichert...</p>
            <p className="text-[10px] font-bold uppercase text-zinc-400 mt-2">Gleich geht's zum Warenkorb</p>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden flex h-[65px] bg-white border-t border-navy/5 z-[600] shrink-0 relative shadow-[0_-5px_30px_rgba(0,0,0,0.05)] pb-safe">
        <button onClick={() => setMobileTab('editor')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${mobileTab === 'editor' ? 'text-petrol' : 'text-zinc-300'}`}>
          <Edit3 size={18} />
          <span className="text-[7px] font-black uppercase tracking-[0.15em]">Editor</span>
        </button>
        <button onClick={() => setMobileTab('preview')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${mobileTab === 'preview' ? 'text-petrol' : 'text-zinc-300'}`}>
          <Smartphone size={18} />
          <span className="text-[7px] font-black uppercase tracking-[0.15em]">Preview</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
