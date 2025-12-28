import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Download, Upload, Trash2, Box, ShoppingCart, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { supabase } from './lib/supabase';

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
      // 1. Eindeutige ID generieren
      const designId = `3D-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      let publicImageUrl = '';

      // 2. Automatischer Screenshot im Hintergrund
      const screenshotData = await viewerRef.current.takeScreenshot();
      
      if (screenshotData) {
        const base64Response = await fetch(screenshotData);
        const blob = await base64Response.blob();
        const fileName = `${designId}.png`;
        
        // Upload zum Supabase Storage
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

      // 3. Farben und Konfiguration bereinigen
      const sanitizedElements = svgElements.map(({ id, name, color, currentColor }) => ({
        id,
        name,
        originalColor: color,
        currentColor: currentColor
      }));

      // 4. In Supabase Datenbank speichern
      await supabase
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

      // 5. Weiterleitung zu Shopify mit allen Informationen
      const baseUrl = `https://${shopifyParams.shop}/cart/add`;
      const queryParams = new URLSearchParams();
      queryParams.append('id', shopifyParams.variantId);
      queryParams.append('quantity', '1');
      
      // Diese Properties werden in Shopify bei der Bestellung angezeigt
      queryParams.append('properties[_design_id]', designId);
      if (publicImageUrl) queryParams.append('properties[Vorschau-Bild]', publicImageUrl);
      if (config.customLink) queryParams.append('properties[Link-Text]', config.customLink);

      // Kurzes visuelles Feedback vor dem Redirect
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = `${baseUrl}?${queryParams.toString()}`;
      }, 800);

    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten.");
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
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-xs text-red-200">{error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="bg-emerald-900/20 border border-emerald-500/50 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              <p className="text-xs text-emerald-200">Design bereit! Warenkorb wird geladen...</p>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              <span>Logo Upload</span>
              {svgElements && (
                <button onClick={() => {setSvgElements(null); setOriginalSvgContent(null);}} className="text-zinc-600 hover:text-red-400 p-1 transition-colors"><Trash2 size={14} /></button>
              )}
            </div>

            {!svgElements ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-zinc-800/50 transition-all group">
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <Upload className="w-8 h-8 mb-2 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                  <p className="text-xs text-zinc-400 font-medium">SVG wählen</p>
                </div>
                <input type="file" accept=".svg" className="hidden" onChange={handleFileUpload} />
              </label>
            ) : (
              <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-3 text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                 <CheckCircle2 size={14} /> Logo erfolgreich geladen
              </div>
            )}
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

        <footer className="p-6 border-t border-zinc-800 bg-zinc-900/80 space-y-3">
          <button
            onClick={handleAddToCart}
            disabled={isSubmitting || !svgElements || isSuccess}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/10 ${
              isSubmitting || !svgElements || isSuccess ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Vorschau wird erstellt...
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                In den Warenkorb
              </>
            )}
          </button>
        </footer>
      </aside>

      <main className="flex-1 relative">
        <Viewer 
          config={config} 
          svgElements={svgElements} 
          selectedId={selectedElementId}
          onSelect={setSelectedElementId}
          ref={viewerRef} 
        />
      </main>
    </div>
  );
};

export default App;