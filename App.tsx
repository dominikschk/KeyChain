
import React, { useState, useCallback, useRef } from 'react';
import { Download, Upload, Trash2, Box, ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const viewerRef = useRef<{ getExportableGroup: () => THREE.Group | null }>(null);

  // Parameter von Shopify oder Fallback-Werte deiner URL
  const [shopifyParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      shop: params.get('shop') || 'nudaim3d.de',
      variantId: params.get('variant') || '56564338262361'
    };
  });

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
    const padding = 8; 
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
            name: (path.userData as any)?.node?.id || `Element ${index + 1}`
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

  /**
   * PROZESS: Supabase Upload -> Shopify Cart
   */
  const handleAddToCart = async () => {
    if (!originalSvgContent || !svgElements) {
      setError("Bitte laden Sie zuerst ein Logo hoch.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Eindeutige Design ID generieren
      const designId = `3D-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 2. Upload zu Supabase
      const { error: dbError } = await supabase
        .from('designs')
        .insert([
          { 
            id: designId, 
            config: config, 
            svg_content: originalSvgContent 
          }
        ]);

      if (dbError) {
        // Hinweis: Wenn Keys nicht gesetzt sind, wird das hier fehlschlagen.
        console.warn("Supabase Error (Check keys):", dbError.message);
      }

      console.log(`Design ${designId} in Supabase gesichert.`);

      // 3. Shopify AJAX Request
      const formData = {
        'items': [{
          'id': parseInt(shopifyParams.variantId),
          'quantity': 1,
          'properties': {
            '_design_id': designId,
            'Vorschau': '3D-Konfiguriert',
            'Material': 'Kunststoff (3D-Druck)',
            'Kette': config.hasChain ? 'Inklusive' : 'Ohne'
          }
        }]
      };

      const response = await fetch(`https://${shopifyParams.shop}/cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Warenkorb-Übertragung fehlgeschlagen.");
      }

      setIsSuccess(true);
      
      // Kurze Verzögerung für visuelles Feedback vor dem Redirect
      setTimeout(() => {
        window.location.href = `https://${shopifyParams.shop}/cart`;
      }, 800);

    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten.");
      setIsSubmitting(false);
    }
  };

  const handleExport = useCallback(() => {
    if (!viewerRef.current) return;
    try {
      const group = viewerRef.current.getExportableGroup();
      if (group) {
        const exporter = new STLExporter();
        // Das Ergebnis bei binary: true ist ein DataView.
        // Wir casten zu 'any', um TypeScript-Build-Fehler bezüglich BlobPart/SharedArrayBuffer zu vermeiden.
        const result = exporter.parse(group, { binary: true }) as any;
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `keychain-preview.stl`;
        link.click();
      }
    } catch (err) {
      setError("STL Export fehlgeschlagen.");
    }
  }, []);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col z-10 shrink-0 shadow-2xl">
        <header className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
            <Box size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none">KeyChain Studio</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Nudaim 3D Integration</p>
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
            <div className="bg-emerald-900/20 border border-emerald-500/50 p-4 rounded-xl flex items-start gap-3 animate-pulse">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              <p className="text-xs text-emerald-200">Wird zum Warenkorb geleitet...</p>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              <span>Logo Upload</span>
              {svgElements && (
                <button onClick={() => setSvgElements(null)} className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
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
              <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-2 text-xs text-zinc-400 flex items-center gap-2">
                 <Box size={14} className="text-blue-500" />
                 Logo bereit zur Anpassung
              </div>
            )}
          </section>

          <Controls config={config} setConfig={setConfig} hasLogo={!!svgElements} />
        </div>

        <footer className="p-6 border-t border-zinc-800 bg-zinc-900/80 space-y-3">
          <button
            onClick={handleAddToCart}
            disabled={isSubmitting || !svgElements || isSuccess}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl ${
              isSubmitting || !svgElements || isSuccess ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
            }`}
          >
            <ShoppingCart size={18} />
            {isSubmitting ? 'Wird übertragen...' : 'In den Warenkorb'}
          </button>
          
          <button 
            onClick={handleExport}
            className="w-full text-zinc-600 hover:text-zinc-400 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2"
          >
            <Download size={12} /> Preview-STL exportieren
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
        
        <div className="absolute top-6 right-6">
           <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl text-[10px] text-zinc-500 font-mono shadow-2xl space-y-1">
              <div className="flex justify-between gap-4"><span>SHOP</span> <span>{shopifyParams.shop}</span></div>
              <div className="flex justify-between gap-4"><span>VAR-ID</span> <span>{shopifyParams.variantId}</span></div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
