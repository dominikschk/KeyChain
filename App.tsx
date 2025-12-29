
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Printer, ShoppingCart, HelpCircle, Palette, Box, Type, MousePointer2, Settings2, Sliders, X, ChevronUp, ArrowRight } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { ShopifyGuide } from './components/ShopifyGuide';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase } from './lib/supabase';

type TabType = 'upload' | 'adjust' | 'style';

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const viewerRef = useRef<{ getExportableGroup: () => THREE.Group | null, takeScreenshot: () => Promise<string> }>(null);

  const logoDimensions = useMemo(() => {
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
    return {
      width: size.x * config.logoScale,
      height: size.y * config.logoScale
    };
  }, [svgElements, config.logoScale]);

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
    try {
      const screenshot = await viewerRef.current?.takeScreenshot();
      const base64Data = screenshot?.split(',')[1];
      if (!base64Data) throw new Error();
      const fileName = `preview_${Date.now()}.png`;
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      await supabase.storage.from('previews').upload(fileName, bytes, { contentType: 'image/png' });
      const { data: { publicUrl } } = supabase.storage.from('previews').getPublicUrl(fileName);
      window.location.href = `https://nudaim3d.de/cart/add?id=56564338262361&properties[Vorschau]=${publicUrl}&properties[Text]=${config.customLink || ''}`;
    } catch (err) {
      setError("Verbindung zum Shop fehlgeschlagen.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden font-sans">
      {showGuide && <ShopifyGuide onClose={() => setShowGuide(false)} />}
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[400px] flex-col bg-white border-r border-navy/5 z-50 shadow-2xl overflow-hidden">
        <header className="p-10 border-b border-navy/5 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-petrol p-2.5 rounded-button shadow-lg shadow-petrol/20">
              <Printer size={24} className="text-white" />
            </div>
            <h1 className="serif-headline font-black text-2xl tracking-tight leading-none text-navy uppercase">FUKUMA</h1>
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
            <span className="tracking-[0.2em] text-xs">BESTELLEN</span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </aside>

      {/* Main Content (3D Viewer) */}
      <main className="flex-1 relative bg-cream overflow-hidden">
        {/* Background Layer with larger orientation circles, no lines */}
        <div className="absolute inset-0 technical-circles opacity-100 pointer-events-none" />
        
        <Viewer 
          ref={viewerRef}
          config={config} 
          svgElements={svgElements} 
          selectedId={selectedElementId}
          onSelect={setSelectedElementId}
        />

        {/* Mobile Navbar Dock */}
        <div className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 backdrop-blur-2xl p-2 rounded-full border border-navy/10 shadow-luxury z-[100] glow-action">
          <button 
            onClick={() => handleTabClick('upload')}
            className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'upload' && isDrawerOpen ? 'bg-petrol text-white shadow-lg' : 'text-navy/30'}`}
          >
            <Upload size={20} />
          </button>
          <div className="w-[1px] h-6 bg-navy/10 mx-1" />
          <button 
            onClick={() => handleTabClick('adjust')}
            className={`flex items-center gap-2.5 px-6 py-4 rounded-full transition-all duration-300 ${activeTab === 'adjust' && isDrawerOpen ? 'bg-petrol text-white shadow-lg' : 'text-navy/30'}`}
          >
            <Sliders size={18} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Form</span>
          </button>
          <button 
            onClick={() => handleTabClick('style')}
            className={`flex items-center gap-2.5 px-6 py-4 rounded-full transition-all duration-300 ${activeTab === 'style' && isDrawerOpen ? 'bg-petrol text-white shadow-lg' : 'text-navy/30'}`}
          >
            <Palette size={18} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Farbe</span>
          </button>
          <div className="w-[1px] h-6 bg-navy/10 mx-1" />
          <button 
            onClick={handleAddToCart}
            disabled={!svgElements || isAddingToCart}
            className="p-4 bg-navy rounded-full text-white shadow-xl active:scale-90 transition-all disabled:opacity-20"
          >
            {isAddingToCart ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
          </button>
        </div>

        {/* Mobile: Drawer (Der Reiter) */}
        <div className={`
          md:hidden fixed inset-x-0 bottom-0 z-[90] bg-white border-t border-navy/5 rounded-t-[32px] shadow-[0_-20px_50px_rgba(17,35,90,0.1)] transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)
          ${isDrawerOpen ? 'h-[75vh] translate-y-0' : 'h-0 translate-y-full'}
        `}>
          <div className="w-full h-12 flex items-center justify-center pt-2" onClick={() => setIsDrawerOpen(false)}>
             <div className="w-14 h-1.5 bg-softgrey rounded-full" />
          </div>
          
          <div className="px-10 pb-36 pt-4 h-full overflow-y-auto custom-scrollbar technical-grid-fine">
            <div className="flex justify-between items-center mb-10">
              <h2 className="serif-headline font-black text-2xl uppercase tracking-tight text-navy">
                {activeTab === 'upload' ? 'Logo laden' : activeTab === 'adjust' ? 'Logo-Editor' : 'Finishing'}
              </h2>
              <button onClick={() => setIsDrawerOpen(false)} className="bg-cream p-3 rounded-full text-navy/30 hover:text-navy border border-navy/5"><X size={20} /></button>
            </div>

            <Controls 
              activeTab={activeTab}
              config={config} 
              setConfig={setConfig} 
              svgElements={svgElements}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateColor={updateElementColor}
              logoDimensions={logoDimensions}
              onUpload={handleFileUpload}
            />
          </div>
        </div>

        {error && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-white border border-red-100 text-navy px-8 py-5 rounded-button shadow-2xl flex items-center gap-5 animate-in slide-in-from-top-10">
            <AlertCircle size={24} className="text-red-500" />
            <span className="text-sm font-bold tracking-wide">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 opacity-30 hover:opacity-100"><X size={20} /></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
