import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Printer, ShoppingCart, HelpCircle, Palette, Box, Type, MousePointer2, Settings2, Sliders, X, ChevronUp, ArrowRight, WifiOff, Settings, ShieldAlert, Database, Link, Info, Activity } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { ShopifyGuide } from './components/ShopifyGuide';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, SUPABASE_READY, SUPABASE_ANON_KEY, getKeyType, getErrorMessage, SUPABASE_URL } from './lib/supabase';

type TabType = 'upload' | 'adjust' | 'style';

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState<{title: string, msg: string, instructions?: string[]} | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const viewerRef = useRef<{ getExportableGroup: () => THREE.Group | null, takeScreenshot: () => Promise<string> }>(null);

  const keyStatus = useMemo(() => getKeyType(SUPABASE_ANON_KEY), [SUPABASE_ANON_KEY]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target?.result as string;
      const loader = new SVGLoader();
      try {
        const svgData = loader.parse(contents);
        const elements: SVGPathData[] = svgData.paths.map((path, index) => ({
          id: `path-${index}-${Math.random().toString(36).substr(2, 9)}`,
          shapes: SVGLoader.createShapes(path),
          color: path.color.getStyle(),
          currentColor: path.color.getStyle(),
          name: (path.userData as any)?.node?.id || `Teil ${index + 1}`
        }));
        setSvgElements(elements);
        const tempBox = new THREE.Box3();
        elements.forEach(el => el.shapes.forEach(s => {
          const g = new THREE.ShapeGeometry(s);
          g.computeBoundingBox();
          if (g.boundingBox) tempBox.union(g.boundingBox);
        }));
        const size = new THREE.Vector3();
        tempBox.getSize(size);
        const maxDim = Math.max(size.x, size.y);
        const targetDim = 38;
        const initialScale = targetDim / maxDim;
        setConfig(prev => ({ ...prev, logoScale: initialScale, logoPosX: 0, logoPosY: 0, logoRotation: 0 }));
        setActiveTab('adjust');
      } catch (err) {
        setError({ title: "SVG Fehler", msg: "Die Datei konnte nicht interpretiert werden." });
      }
    };
    reader.readAsText(file);
  };

  const handleAddToCart = async () => {
    if (!svgElements) return;
    setIsAddingToCart(true);
    setError(null);
    try {
      const screenshot = await viewerRef.current?.takeScreenshot();
      if (!screenshot) throw new Error("Vorschau-Bild konnte nicht generiert werden.");
      
      const base64Response = await fetch(screenshot);
      const blob = await base64Response.blob();
      const fileName = `order_${Date.now()}.png`;
      
      const { data, error: uploadError } = await supabase!.storage
        .from('previews')
        .upload(fileName, blob, { contentType: 'image/png', cacheControl: '3600' });
        
      if (uploadError) throw new Error(getErrorMessage(uploadError));
      
      const { data: urlData } = supabase!.storage.from('previews').getPublicUrl(fileName);
      window.location.href = `https://nudaim3d.de/cart/add?id=56564338262361&properties[Vorschau]=${urlData.publicUrl}`;
    } catch (err: any) {
      setError({
        title: "Verbindungs-Fehler",
        msg: err.message,
        instructions: [
          "Stelle sicher, dass in Supabase der Storage-Bucket 'previews' existiert.",
          "Prüfe, ob der Bucket auf 'Public' gestellt ist.",
          "Vergewissere dich, dass die RLS-Policies 'INSERT' für anonyme Nutzer erlauben."
        ]
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden font-sans">
      <aside className="hidden md:flex w-[400px] flex-col bg-white border-r border-navy/5 z-50 shadow-2xl">
        <header className="p-10 border-b border-navy/5 relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-petrol p-2.5 rounded-button"><Printer size={24} className="text-white" /></div>
            <h1 className="serif-headline font-black text-2xl tracking-tight text-navy uppercase">NUDAIM3D</h1>
          </div>
          <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-cream rounded-full border border-navy/5 w-fit">
            <Activity size={12} className={keyStatus === 'READY' ? 'text-emerald-500' : 'text-amber-500'} />
            <span className="text-[9px] font-black uppercase tracking-widest text-navy/40">
              API: {keyStatus === 'READY' ? 'Verbunden' : 'Konfiguration prüfen'}
            </span>
          </div>
        </header>

        <nav className="flex p-6 gap-2 bg-cream/50">
          {(['upload', 'adjust', 'style'] as TabType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3.5 rounded-button text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-petrol text-white shadow-lg' : 'text-zinc-400 hover:bg-navy/5'}`}>
              {tab === 'upload' ? 'Upload' : tab === 'adjust' ? 'Design' : 'Farben'}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8 technical-grid-fine">
          <Controls activeTab={activeTab} config={config} setConfig={setConfig} svgElements={svgElements} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} onUpdateColor={(id, c) => setSvgElements(prev => prev ? prev.map(el => el.id === id ? { ...el, currentColor: c } : el) : null)} logoDimensions={{width:0, height:0}} naturalLogoDimensions={{width:0, height:0}} onUpload={handleFileUpload} />
        </div>

        <div className="p-10 border-t border-navy/5">
          <button onClick={handleAddToCart} disabled={!svgElements || isAddingToCart} className="group w-full h-16 bg-petrol hover:bg-action disabled:bg-softgrey text-white font-black rounded-button flex items-center justify-center gap-4 transition-all glow-action">
            {isAddingToCart ? <Loader2 className="animate-spin" /> : <ShoppingCart size={20} />}
            <span className="tracking-[0.2em] text-xs">WARENKORB</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} selectedId={selectedElementId} onSelect={setSelectedElementId} />
        
        {error && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-white border border-red-100 p-0 rounded-[30px] shadow-2xl flex flex-col overflow-hidden max-w-lg w-full mx-4">
            <div className="bg-red-500 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <ShieldAlert size={24} />
                <h3 className="font-black uppercase tracking-widest text-xs">{error.title}</h3>
              </div>
              <button onClick={() => setError(null)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex gap-4">
                <Info size={20} className="text-red-500 shrink-0" />
                <p className="text-sm font-bold leading-relaxed">{error.msg}</p>
              </div>
              {error.instructions && (
                <ul className="space-y-2">
                  {error.instructions.map((step, i) => (
                    <li key={i} className="bg-cream p-4 rounded-xl text-xs font-medium flex gap-3 border border-navy/5">
                      <span className="w-5 h-5 bg-navy text-white text-[9px] rounded-full flex items-center justify-center shrink-0">{i+1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
