import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Printer, ShoppingCart, HelpCircle, Palette, Box, Type, MousePointer2, Settings2, Sliders, X, ChevronUp, ArrowRight, WifiOff, Settings, ShieldAlert, Database, Link, Info, Activity, Key, ExternalLink, AlertTriangle, Search, FolderPlus, Lock, ShieldCheck, Check, Copy, Terminal } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, SUPABASE_READY, SUPABASE_ANON_KEY, getKeyStatus, getDetailedError, SUPABASE_URL } from './lib/supabase';

type TabType = 'upload' | 'adjust' | 'style';
type ProcessStep = 'idle' | 'screenshot' | 'upload_image' | 'save_db' | 'redirecting';

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [processStep, setProcessStep] = useState<ProcessStep>('idle');
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string} | null>(null);
  const [successInfo, setSuccessInfo] = useState<{url: string, db: boolean} | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  
  const viewerRef = useRef<{ getExportableGroup: () => THREE.Group | null, takeScreenshot: () => Promise<string> }>(null);

  const sqlCode = `create table previews (
  id bigint primary key generated always as identity,
  created_at timestamptz default now(),
  file_name text not null,
  image_url text not null,
  config jsonb not null
);

-- RLS aktivieren
alter table previews enable row level security;

-- Erlaubt das Einfügen für anonyme Besucher (Wichtig!)
create policy "Allow anonymous inserts" on previews for insert to anon with check (true);
create policy "Allow anonymous selects" on previews for select to anon using (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorInfo(null);
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
        setErrorInfo({ title: "Dateifehler", msg: "Die SVG konnte nicht verarbeitet werden.", code: "SVG_ERR" });
      }
    };
    reader.readAsText(file);
  };

  const handleAddToCart = async () => {
    if (!svgElements || processStep !== 'idle') return;
    
    setErrorInfo(null);
    setSuccessInfo(null);
    setProcessStep('screenshot');
    
    try {
      if (!supabase) throw new Error("Supabase ist nicht konfiguriert (URL/Key fehlt).");

      // 1. Screenshot
      const screenshot = await viewerRef.current?.takeScreenshot();
      if (!screenshot || screenshot.length < 100) {
        throw new Error("Vorschaubild konnte nicht erstellt werden. Bitte versuche es erneut.");
      }
      
      setProcessStep('upload_image');
      const base64Response = await fetch(screenshot);
      const blob = await base64Response.blob();
      const fileName = `order_${Date.now()}.png`;
      
      // Upload in den Bucket
      const { error: uploadError } = await supabase.storage
        .from('previews')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('previews').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 2. Datenbank
      setProcessStep('save_db');
      const { error: dbError } = await supabase
        .from('previews')
        .insert([{ 
          file_name: fileName, 
          image_url: publicUrl, 
          config: config 
        }]);

      if (dbError) throw dbError;
      
      setProcessStep('redirecting');
      setSuccessInfo({ url: publicUrl, db: true });
      
      setTimeout(() => {
        window.location.href = `https://nudaim3d.de/cart/add?id=56564338262361&properties[Vorschau]=${publicUrl}`;
      }, 2500);

    } catch (err: any) {
      console.error("Kritischer Fehler beim Speichern:", err);
      const detailed = getDetailedError(err);
      setErrorInfo({ 
        title: detailed.title, 
        msg: detailed.message, 
        code: detailed.code 
      });
      setProcessStep('idle');
    }
  };

  const isProcessing = processStep !== 'idle';

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden font-sans">
      <aside className="hidden md:flex w-[400px] flex-col bg-white border-r border-navy/5 z-50 shadow-2xl">
        <header className="p-10 border-b border-navy/5">
          <div className="flex items-center gap-4">
            <div className="bg-petrol p-2.5 rounded-button"><Printer size={24} className="text-white" /></div>
            <h1 className="serif-headline font-black text-2xl tracking-tight text-navy uppercase">NUDAIM3D</h1>
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
          <button 
            onClick={handleAddToCart} 
            disabled={!svgElements || isProcessing} 
            className={`group w-full h-16 rounded-button flex items-center justify-center gap-4 transition-all relative overflow-hidden font-black text-white ${isProcessing ? 'bg-zinc-400 cursor-wait' : 'bg-petrol hover:bg-action glow-action active:scale-95'}`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={20} />
                <span className="tracking-[0.2em] text-[10px]">
                  {processStep === 'screenshot' && 'ERSTELLE VORSCHAU...'}
                  {processStep === 'upload_image' && 'LADE BILD HOCH...'}
                  {processStep === 'save_db' && 'SCHREIBE DATEN...'}
                  {processStep === 'redirecting' && 'ÜBERTRAGE...'}
                </span>
              </div>
            ) : (
              <>
                <ShoppingCart size={20} />
                <span className="tracking-[0.2em] text-xs">WARENKORB</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} selectedId={selectedElementId} onSelect={setSelectedElementId} />
        
        {successInfo && (
          <div className="fixed inset-0 z-[400] bg-emerald-500/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300 text-white">
            <div className="bg-white rounded-[40px] shadow-2xl p-12 max-w-md w-full text-center space-y-8 text-navy">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check size={48} className="animate-bounce" />
              </div>
              <div className="space-y-2">
                <h2 className="serif-headline text-3xl font-black uppercase">Erfolgreich!</h2>
              </div>
              <p className="text-xs font-bold animate-pulse text-emerald-600 uppercase tracking-widest">Weiterleitung...</p>
            </div>
          </div>
        )}

        {errorInfo && (
          <div className="fixed inset-0 z-[300] bg-navy/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-white/20">
              <div className="bg-red-600 p-10 text-white flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="bg-white/20 p-4 rounded-3xl"><ShieldAlert size={32} /></div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest">{errorInfo.title}</h2>
                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Code: {errorInfo.code}</p>
                  </div>
                </div>
                <button onClick={() => { setErrorInfo(null); setProcessStep('idle'); }} className="hover:rotate-90 transition-all"><X size={24} /></button>
              </div>
              
              <div className="p-10 space-y-8 overflow-y-auto max-h-[75vh] custom-scrollbar bg-offwhite text-navy">
                <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
                   <p className="text-sm font-bold text-red-900 leading-relaxed">{errorInfo.msg}</p>
                </div>

                {errorInfo.code === 'TABLE_404' && (
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-navy/30 flex items-center gap-2 px-2">
                      <Terminal size={14} className="text-petrol" /> Datenbank-Fix:
                    </h3>
                    
                    <div className="bg-zinc-900 p-8 rounded-[32px] space-y-6 shadow-inner border border-white/5 relative group">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-mono text-zinc-500">SQL EDITOR COMMAND</p>
                        <button 
                          onClick={copySqlToClipboard}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${copiedSql ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}
                        >
                          {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                          {copiedSql ? 'KOPIERT' : 'CODE KOPIEREN'}
                        </button>
                      </div>
                      <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre pb-2 scrollbar-hide">
                        {sqlCode}
                      </pre>
                    </div>

                    <div className="p-6 bg-cream rounded-2xl border border-navy/5 flex items-center gap-6">
                      <Info className="text-petrol" />
                      <p className="text-[10px] font-bold text-navy/60 leading-relaxed uppercase tracking-widest">
                        Öffne den <b>SQL Editor</b> in Supabase, füge den Code ein und klicke auf <b>Run</b>. Danach lade diese Seite neu.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <a 
                    href="https://supabase.com/dashboard/project/ncxeyarhrftcfwkcoqpa/sql/new" 
                    target="_blank" 
                    className="flex-1 h-16 bg-petrol text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-action transition-all shadow-xl"
                  >
                    SQL Editor öffnen <ExternalLink size={14} />
                  </a>
                  <button onClick={() => { setErrorInfo(null); setProcessStep('idle'); }} className="px-10 h-16 bg-zinc-100 text-navy rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all">Schließen</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;