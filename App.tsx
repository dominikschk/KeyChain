
import React, { useState, useCallback, useRef } from 'react';
import { Download, Upload, Trash2, Box, MousePointer2, Maximize } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const viewerRef = useRef<{ getExportableGroup: () => THREE.Group | null }>(null);

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

    // Feste Zielgröße: 45mm x 45mm mit 4mm Sicherheitsabstand (Padding)
    const padding = 8; 
    const targetSize = 45 - padding;

    return Math.min(targetSize / size.x, targetSize / size.y);
  }, []);

  const handleAutoFit = useCallback(() => {
    if (!svgElements) return;
    const autoScale = calculateAutoFitScale(svgElements);
    setConfig(prev => ({
      ...prev,
      logoScale: autoScale,
      logoPosX: 0,
      logoPosY: 0,
      logoRotation: 0
    }));
  }, [svgElements, calculateAutoFitScale]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target?.result as string;
      const loader = new SVGLoader();
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
    };
    reader.readAsText(file);
  };

  const updateElementColor = (id: string, color: string) => {
    setSvgElements(prev => prev ? prev.map(el => el.id === id ? { ...el, currentColor: color } : el) : null);
  };

  const handleExport = useCallback(() => {
    if (!viewerRef.current) return;
    setIsExporting(true);
    
    setTimeout(() => {
      try {
        const group = viewerRef.current?.getExportableGroup();
        if (group) {
          const exporter = new STLExporter();
          const result = exporter.parse(group, { binary: true });
          const blob = new Blob([result], { type: 'application/octet-stream' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `keychain-45mm-${Date.now()}.stl`;
          link.click();
          URL.revokeObjectURL(link.href);
        }
      } catch (err) {
        console.error("Export failed", err);
        alert("Export fehlgeschlagen.");
      } finally {
        setIsExporting(false);
      }
    }, 100);
  }, [viewerRef]);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col z-10 shrink-0 shadow-2xl">
        <header className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
            <Box size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none">KeyChain Pro</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Industrial 3D Engine</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <section className="space-y-4">
            <div className="flex items-center justify-between text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Upload size={14} />
                <span>Logo Upload</span>
              </div>
              <div className="flex gap-2">
                {svgElements && (
                  <>
                    <button onClick={handleAutoFit} title="Zentrieren" className="text-zinc-500 hover:text-blue-400 p-1"><Maximize size={14} /></button>
                    <button onClick={() => setSvgElements(null)} title="Löschen" className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>

            {!svgElements ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-zinc-800/50 transition-all group">
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <Upload className="w-8 h-8 mb-2 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                  <p className="text-xs text-zinc-400 font-medium tracking-tight">Vektor-Datei (SVG) wählen</p>
                </div>
                <input type="file" accept=".svg" className="hidden" onChange={handleFileUpload} />
              </label>
            ) : (
              <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-1 space-y-1">
                <div className="max-h-40 overflow-y-auto custom-scrollbar px-1 pb-1">
                  {svgElements.map(el => (
                    <button
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[11px] flex items-center gap-3 transition-all ${
                        selectedElementId === el.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: el.currentColor }} />
                      <span className="truncate font-medium">{el.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {selectedElementId && svgElements && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                <MousePointer2 size={14} />
                <span>Farb-Preview</span>
              </div>
              <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 grid grid-cols-4 gap-2">
                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff', '#27272a', '#a855f7', '#ec4899'].map(c => (
                  <button
                    key={c}
                    onClick={() => updateElementColor(selectedElementId, c)}
                    className={`aspect-square rounded-lg border-2 transition-transform ${
                      svgElements.find(e => e.id === selectedElementId)?.currentColor === c 
                      ? 'border-white scale-110 shadow-lg' 
                      : 'border-transparent hover:border-zinc-600'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </section>
          )}

          <Controls config={config} setConfig={setConfig} hasLogo={!!svgElements} />
        </div>

        <footer className="p-6 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl ${
              isExporting ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
            }`}
          >
            <Download size={18} />
            {isExporting ? 'Verarbeite Geometrie...' : 'Download STL'}
          </button>
        </footer>
      </aside>

      {/* Main Viewer Area */}
      <main className="flex-1 relative">
        <Viewer 
          config={config} 
          svgElements={svgElements} 
          selectedId={selectedElementId}
          onSelect={setSelectedElementId}
          ref={viewerRef} 
        />
        
        {/* HUD Overlay */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 px-5 py-4 rounded-2xl shadow-2xl">
            <div className="text-zinc-500 text-[9px] uppercase font-bold tracking-[0.2em] mb-2">System Status</div>
            <div className="flex gap-5 items-center text-xs font-mono text-zinc-300">
              <span className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Chip-Dimension</span>
                45.00 x 45.00 mm
              </span>
              <span className="text-zinc-800 h-6 border-l border-zinc-800" />
              <span className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Z-Referenz</span>
                Surface @ {(config.plateDepth/2).toFixed(2)} mm
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
