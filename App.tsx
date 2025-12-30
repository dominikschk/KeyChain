
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Printer, ShoppingCart, HelpCircle, Palette, Box, Type, MousePointer2, Settings2, Sliders, X, ChevronUp, ArrowRight, WifiOff, Settings } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { ShopifyGuide } from './components/ShopifyGuide';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, SUPABASE_READY } from './lib/supabase';

type TabType = 'upload' | 'adjust' | 'style';

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSetupInfo, setShowSetupInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const viewerRef = useRef<{ getExportableGroup: () => THREE.Group | null, takeScreenshot: () => Promise<string> }>(null);

  const naturalLogoDimensions = useMemo(() => {
    if (!svgElements) return { width: 0, height: 0 };
    const totalBox = new THREE.Box3();
    svgElements.forEach(el => {
      el.shapes.forEach(shape => {
        const geo = new THREE.ShapeGeometry(shape);
        geo.computeBoundingBox();
        if (geo.boundingBox) totalBox.union(geo.boundingBox);
      });
    });
    const size = new THREE.Vector3();
    totalBox.getSize(size);
    return { width: size.x, height: size.y };
  }, [svgElements]);

  const logoDimensions = useMemo(() => ({
    width: naturalLogoDimensions.width * config.logoScale,
    height: naturalLogoDimensions.height * config.logoScale
  }), [naturalLogoDimensions, config.logoScale]);

  const updateElementColor = (id: string, color: string) => {
    setSvgElements(prev => prev ? prev.map(el => el.id === id ? { ...el, currentColor: color } : el) : null);
  };

  const handleTabClick = (tab: TabType) => {
    if (activeTab === tab && isDrawerOpen) {
      setIsDrawerOpen(false);
    } else {
      setActiveTab(tab);
      setIsDrawerOpen(true);
    }
  };

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

        setConfig(prev => ({
          ...prev,
          logoScale: initialScale,
          logoPosX: 0,
          logoPosY: 0,
          logoRotation: 0
        }));

        setActiveTab('adjust');
        setIsDrawerOpen(true);
      } catch (err) {
        setError("Die Datei konnte nicht verarbeitet werden.");
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

      let publicUrl = "https://nudaim3d.de/preview-placeholder.png";

      if (SUPABASE_READY) {
        try {
          const base64Response = await fetch(screenshot);
          const blob = await base64Response.blob();
          const fileName = `order_${Date.now()}.png`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('previews')
            .upload(fileName, blob, { 
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false 
            });

          if (uploadError) {
            console.error("Supabase Fehler:", uploadError);
            if (uploadError.message.includes("401") || uploadError.message.includes("authorized")) {
              throw new Error("Fehler: Der API Key ist ungültig (Shopify Key statt Supabase Key verwendet?).");
            }
            throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage.from('previews').getPublicUrl(fileName);
          publicUrl = urlData.publicUrl;
        } catch (storageErr: any) {
          console.error("Storage Error:", storageErr);
          throw storageErr;
        }
      } else {
        throw new Error("Bitte konfiguriere einen gültigen Supabase API-Key (beginnt mit 'eyJ').");
      }

      const shopifyUrl = new URL('https://nudaim3d.de/cart/add');
      shopifyUrl.searchParams.append('id', '56564338262361');
      shopifyUrl.searchParams.append('properties[Vorschau]', publicUrl);
      if (config.customLink) {
        shopifyUrl.searchParams.append('properties[Gravur]', config.customLink);
      }
      
      window.location.href = shopifyUrl.toString();
      
    } catch (err: any) {
      console.error("Checkout Fehler:", err);
      setError(err.message);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden font-sans">
      {showGuide && <ShopifyGuide onClose={() => setShowGuide(false)} />}
      
      <aside className="hidden md:flex w-[400px] flex-col bg-white border-r border-navy/5 z-50 shadow-2xl overflow-hidden">
        <header className="p-10 border-b border-navy/5 bg-white/80 backdrop-blur-md relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-petrol p-2.5 rounded-button shadow-lg shadow-petrol/20">
              <Printer size={24} className="text-white" />
            </div>
            <h1 className="serif-headline font-black text-2xl tracking-tight leading-none text-navy uppercase">NUDAIM3D</h1>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-action ml-14">Personalization Studio</p>
        </header>

        <nav className="flex p-6 gap-2 bg-cream/50">
          {(['upload', 'adjust', 'style'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 rounded-button text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                activeTab === tab ? 'bg-petrol text-white shadow-lg' : 'text-zinc-400 hover:text-navy hover:bg-navy/5'
              }`}
            >
              {tab === 'upload' ? 'Upload' : tab === 'adjust' ? 'Design' : 'Farben'}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8 technical-grid-fine">
          <Controls 
            activeTab={activeTab}
            config={config} 
            setConfig={setConfig} 
            svgElements={svgElements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateColor={updateElementColor}
            logoDimensions={logoDimensions}
            naturalLogoDimensions={naturalLogoDimensions}
            onUpload={handleFileUpload}
          />
        </div>

        <div className="p-10 border-t border-navy/5 bg-white">
          <button
            onClick={handleAddToCart}
            disabled={!svgElements || isAddingToCart}
            className="group w-full h-16 bg-petrol hover:bg-action disabled:bg-softgrey disabled:text-navy/20 text-white font-black rounded-button flex items-center justify-center gap-4 transition-all duration-500 hover:scale-[1.02] active:scale-95 glow-action"
          >
            {isAddingToCart ? <Loader2 className="animate-spin" /> : <ShoppingCart size={20} />}
            <span className="tracking-[0.2em] text-xs">WARENKORB</span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </aside>

      <main className="flex-1 relative bg-cream overflow-hidden">
        <div className="absolute inset-0 technical-circles opacity-100 pointer-events-none" />
        
        <Viewer 
          ref={viewerRef}
          config={config} 
          svgElements={svgElements} 
          selectedId={selectedElementId}
          onSelect={setSelectedElementId}
        />

        {error && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-white border border-red-100 text-navy px-8 py-6 rounded-3xl shadow-2xl flex items-start gap-5 animate-in slide-in-from-top-10 max-w-md">
            <AlertCircle size={28} className="text-red-500 shrink-0 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase text-red-500 opacity-50 tracking-widest">Fehler beim Speichern</span>
              <span className="text-sm font-bold tracking-tight leading-snug">{error}</span>
              <p className="text-[10px] text-navy/40 mt-2">Hinweis: Der Key 'sb_publishable_...' ist für Shopify. Für das Speichern von Bildern benötigst du den Supabase 'anon' Key.</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4 opacity-30 hover:opacity-100"><X size={20} /></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
