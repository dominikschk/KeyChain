
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Download, Upload, Trash2, Box, ShoppingCart, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase } from './lib/supabase';

// Main Application Component
const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [originalSvgContent, setOriginalSvgContent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const viewerRef = useRef<{ getExportableGroup: () => THREE.Group | null, takeScreenshot: () => Promise<string> }>(null);

  const [shopifyParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      shop: params.get('shop') || 'nudaim3d.de',
      variantId: params.get('variant') || '56564338262361'
    };
  });

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
      setOriginalSvgContent(contents);
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

  const handleAddToCart = async () => {
    if (!originalSvgContent || !svgElements || !viewerRef.current) {
      setError("Bitte laden Sie zuerst ein Logo hoch.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const designId = `3D-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      let publicImageUrl = '';

      const screenshotData = await viewerRef.current.takeScreenshot();
      
      if (screenshotData) {
        const base64Response = await fetch(screenshotData);
        const blob = await base64Response.blob();
        const fileName = `${designId}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('previews')
          .upload(fileName, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('previews')
            .getPublicUrl(fileName);
          publicImageUrl = urlData.publicUrl;
        }
      }

      const sanitizedElements = svgElements.map(({ id, name, color, currentColor }) => ({
        id,
        name,
        originalColor: color,
        currentColor: currentColor
      }));

      const { error: dbError } = await supabase
        .from('designs')
        .insert([
          { 
            id: designId, 
            config: { 
              ...config, 
              customizedElements: sanitizedElements 
            }, 
            svg_content: originalSvgContent,
            preview_url: publicImageUrl
          }
        ]);

      if (dbError) {
        throw new Error(`Datenbank-Fehler: ${dbError.message}`);
      }

      const baseUrl = `https://${shopifyParams.shop}/cart/add`;
      const queryParams = new URLSearchParams();
      queryParams.append('id', shopifyParams.variantId);
      queryParams.append('quantity', '1');
      queryParams.append('properties[_design_id]', designId);
      if (publicImageUrl) queryParams.append('properties[Vorschau-Bild]', publicImageUrl);
      if (config.customLink) queryParams.append('properties[Link-Text]', config.customLink);

      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = `${baseUrl}?${queryParams.toString()}`;
      }, 1200);

    } catch (err: any) {
      setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col z-10 shrink-0 shadow-2xl">
        <header className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
            <Box size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none">KeyChain Studio</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Smart Geometry Integration</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Hinweis</p>
                <p className="text-[11px] text-red-200 leading-tight break-words">{error}</p>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="bg-emerald-900/20 border border-emerald-500/50 p-4 rounded-xl flex items-start gap-3 animate-pulse">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Erfolg</p>
                <p className="text-[11px] text-emerald-200 leading-tight">Design gespeichert! Weiterleitung zum Warenkorb...</p>
              </div>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.15em]">
              <Upload size={14} className="text-blue-500" />
              <span>SVG Upload</span>
            </div>
            <div className="relative group">
              <input
                type="file"
                accept=".svg"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-zinc-800 group-hover:border-blue-500/50 group-hover:bg-blue-500/5 rounded-2xl p-8 transition-all flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 group-hover:scale-110 transition-all">
                  <Upload size={20} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-300">Logo hochladen</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Nur .SVG Dateien</p>
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

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
          <button
            onClick={handleAddToCart}
            disabled={isSubmitting || !svgElements}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <ShoppingCart size={20} />
            )}
            <span>IN DEN WARENKORB</span>
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-medium">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Sichere 3D-Konfiguration</span>
          </div>
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
        
        <div className="absolute top-6 left-6 pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Preview Enabled</span>
          </div>
        </div>

        {svgElements && (
          <button 
            onClick={() => {
              setSvgElements(null);
              setOriginalSvgContent(null);
              setSelectedElementId(null);
            }}
            className="absolute bottom-6 right-6 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-500 p-3 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
          >
            <Trash2 size={14} />
            <span>Reset Logo</span>
          </button>
        )}
      </main>
    </div>
  );
};

export default App;
