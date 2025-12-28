
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Printer, ShoppingCart, HelpCircle } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { ShopifyGuide } from './components/ShopifyGuide';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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

  const calculateAutoFitScale = useCallback((elements: SVGPathData[]) => {
    const totalBox = new THREE.Box3();
    elements.forEach(el => {
      el.shapes.forEach(shape => {
        const geo = new THREE.ShapeGeometry(shape);
        geo.computeBoundingBox();
        if (geo.boundingBox) totalBox.union(geo.boundingBox);
      });
    });
    const size = new THREE.Vector3();
    totalBox.getSize(size);
    if (size.x === 0 || size.y === 0) return 1;
    const padding = 12; 
    const targetSize = 45 - padding;
    return Math.min(targetSize / size.x, targetSize / size.y);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target?.result as string;
      const loader = new SVGLoader();
      try {
        const svgData = loader.parse(contents);
        const elements: SVGPathData[] = svgData.paths.map((path, index) => {
          const shapes = SVGLoader.createShapes(path);
          const color = path.color.getStyle();
          return {
            id: `path-${index}-${Math.random().toString(36).substr(2, 9)}`,
            shapes: shapes,
            color: color,
            currentColor: color,
            name: (path.userData as any)?.node?.id || `Form ${index + 1}`
          };
        });

        const autoScale = calculateAutoFitScale(elements);
        setSvgElements(elements);
        setSelectedElementId(null);
        setConfig(prev => ({
          ...prev,
          logoScale: autoScale,
          logoPosX: 0,
          logoPosY: 0,
          logoRotation: 0
        }));
      } catch (err) {
        setError("Die SVG konnte nicht verarbeitet werden.");
      }
    };
    reader.readAsText(file);
  };

  const handleExportSTL = async () => {
    if (!svgElements || !viewerRef.current) {
      setError("Bitte laden Sie zuerst ein Logo hoch.");
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const exportGroup = viewerRef.current.getExportableGroup();
      if (!exportGroup) throw new Error("Export-Geometrie konnte nicht generiert werden.");
      const exporter = new STLExporter();
      const stlResult = exporter.parse(exportGroup, { binary: true });
      
      const stlBuffer = (stlResult instanceof DataView) ? stlResult.buffer : stlResult;
      const blob = new Blob([stlBuffer as BlobPart], { type: 'application/octet-stream' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `3D_Logo_Plate_${Date.now()}.stl`;
      link.click();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "STL Export fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddToCart = async () => {
    if (!svgElements || !viewerRef.current) {
      setError("Bitte laden Sie zuerst ein Logo hoch.");
      return;
    }
    setIsAddingToCart(true);
    setError(null);
    try {
      const screenshot = await viewerRef.current.takeScreenshot();
      if (!screenshot) throw new Error("Screenshot konnte nicht erstellt werden.");
      
      const base64Data = screenshot.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const fileName = `preview_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('previews')
        .upload(fileName, bytes, {
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('previews').getPublicUrl(fileName);

      // Shopify URL nudaim3d.de
      const shopDomain = 'nudaim3d.de';
      const variantId = '56564338262361'; 
      
      const shopifyUrl = new URL(`https://${shopDomain}/cart/add`);
      shopifyUrl.searchParams.append('id', variantId);
      shopifyUrl.searchParams.append('quantity', '1');
      shopifyUrl.searchParams.append('properties[Vorschau]', publicUrl);
      shopifyUrl.searchParams.append('properties[Material]', 'PLA Custom');
      
      if (config.customLink && config.customLink.trim() !== '') {
        shopifyUrl.searchParams.append('properties[Text-Addon]', config.customLink);
      }

      window.location.href = shopifyUrl.toString();
    } catch (err: any) {
      setError("Fehler beim Warenkorb-Prozess: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {showGuide && <ShopifyGuide onClose={() => setShowGuide(false)} />}
      
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col z-10 shrink-0 shadow-2xl">
        <header className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
              <Printer size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">PrintStudio</h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Personalizer</p>
            </div>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="text-zinc-500 hover:text-white transition-colors p-1"
            title="Shopify Setup Guide"
          >
            <HelpCircle size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Fehler</p>
                <p className="text-[11px] text-red-200 leading-tight break-words">{error}</p>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="bg-emerald-900/20 border border-emerald-500/50 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Erfolg</p>
                <p className="text-[11px] text-emerald-200 leading-tight">STL erfolgreich exportiert!</p>
              </div>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.15em]">
              <Upload size={14} className="text-blue-500" />
              <span>Logo hochladen (SVG)</span>
            </div>
            <div className="relative group">
              <input
                type="file"
                accept=".svg"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center gap-3 ${svgElements ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 group-hover:border-blue-500/50 group-hover:bg-blue-500/5'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${svgElements ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400 group-hover:text-blue-400 group-hover:scale-110'}`}>
                  {svgElements ? <CheckCircle2 size={24} /> : <Upload size={20} />}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-300">{svgElements ? 'Logo geladen' : 'Datei wählen'}</p>
                </div>
              </div>
            </div>
          </section>

          <Controls 
            config={config} 
            setConfig={setConfig} 
            hasLogo={!!svgElements}
            svgElements={svgElements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateColor={updateElementColor}
            logoDimensions={logoDimensions}
          />
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md space-y-3">
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || !svgElements}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
          >
            {isAddingToCart ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
            <span>IN DEN WARENKORB</span>
          </button>
          
          <button
            onClick={handleExportSTL}
            disabled={isExporting || !svgElements}
            className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-xs"
          >
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            <span>STL DOWNLOAD</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative bg-[#09090b]">
        <Viewer 
          ref={viewerRef}
          config={config} 
          svgElements={svgElements} 
          selectedId={selectedElementId}
          onSelect={setSelectedElementId}
        />
      </main>
    </div>
  );
};

export default App;
