
import React, { useState, useRef, useEffect } from 'react';
import { Printer, Loader2, Check, X, Smartphone, Palette, Box, Type, Settings, ChevronRight } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, getDetailedError } from './lib/supabase';

type Department = '3d' | 'digital';

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeDept, setActiveDept] = useState<Department>('3d');
  const [isSaving, setIsSaving] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string} | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const viewerRef = useRef<{ takeScreenshot: () => Promise<string> }>(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loader = new SVGLoader();
        const svgData = loader.parse(e.target?.result as string);
        const elements = svgData.paths.map((path, i) => ({
          id: `path-${i}-${Math.random()}`,
          shapes: SVGLoader.createShapes(path),
          color: path.color.getStyle(),
          currentColor: path.color.getStyle(),
          name: (path.userData as any)?.node?.id || `Logo Part ${i + 1}`
        }));
        setSvgElements(elements);
      } catch (err) {
        setErrorInfo({ title: "SVG Fehler", msg: "Ungültige Datei.", code: "SVG_ERR" });
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!supabase) {
      setErrorInfo({ title: "Verbindung", msg: "Supabase Konfiguration fehlt oder ist ungültig.", code: "NO_DB" });
      return;
    }
    
    setIsSaving(true);
    try {
      const screenshot = await viewerRef.current?.takeScreenshot();
      let finalImageUrl = '';
      
      // 1. Screenshot in Storage hochladen
      if (screenshot) {
        const fileName = `nudaim_${Date.now()}.png`;
        const blob = await (await fetch(screenshot)).blob();
        const { error: uploadError } = await supabase.storage.from('nudaim').upload(fileName, blob);
        
        if (!uploadError) {
          const { data } = supabase.storage.from('nudaim').getPublicUrl(fileName);
          finalImageUrl = data.publicUrl;
        }
      }

      // 2. Den aktuellen Link dieser Seite in die Config packen
      const studioUrl = window.location.href;
      const finalConfig = { 
        ...config, 
        _internal: {
          studio_url: studioUrl,
          timestamp: new Date().toISOString()
        }
      };

      // 3. In Tabelle 'nfc_configs' speichern
      const { data, error } = await supabase
        .from('nfc_configs')
        .insert([{ config: finalConfig, image_url: finalImageUrl }])
        .select()
        .single();

      if (error) throw error;
      
      const shortId = data.short_id;
      setSuccessId(shortId);
      
      // 4. Redirect zu Shopify mit allen Infos
      setTimeout(() => {
        const shopifyId = "56564338262361";
        const redirectUrl = `https://nudaim3d.de/cart/add?id=${shopifyId}&properties[3D_VORSCHAU]=${encodeURIComponent(finalImageUrl)}&properties[NFC_SETUP_ID]=${shortId}&properties[STUDIO_LINK]=${encodeURIComponent(studioUrl)}`;
        window.location.href = redirectUrl;
      }, 2000);
      
    } catch (err: any) {
      setErrorInfo(getDetailedError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden">
      <aside className="w-[450px] bg-white border-r border-navy/5 flex flex-col z-50 shadow-2xl relative">
        <header className="p-8 border-b border-navy/5 bg-white">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-petrol p-2.5 rounded-xl text-white shadow-lg"><Printer size={22} /></div>
              <h1 className="serif-headline font-black text-2xl tracking-tight uppercase">NUDAIM3D</h1>
            </div>
            
            <div className="flex bg-cream p-1 rounded-2xl border border-navy/5">
              <button onClick={() => setActiveDept('3d')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === '3d' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>3D Design</button>
              <button onClick={() => setActiveDept('digital')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === 'digital' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>NFC Setup</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 technical-grid-fine space-y-6">
          <Controls 
            activeDept={activeDept} config={config} setConfig={setConfig}
            svgElements={svgElements} onUpload={handleFileUpload}
            onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)}
          />
        </div>

        <footer className="p-8 border-t border-navy/5 bg-white space-y-4">
          <button 
            onClick={activeDept === '3d' ? () => setActiveDept('digital') : handleSave}
            disabled={isSaving}
            className={`w-full h-16 rounded-button font-black text-xs tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl disabled:opacity-50 ${activeDept === '3d' ? 'bg-navy hover:bg-petrol text-white' : 'bg-petrol hover:bg-action text-white'}`}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : (activeDept === '3d' ? <>NFC KONFIGURIEREN <ChevronRight size={14}/></> : "KONFIGURATION ABSCHLIESSEN")}
          </button>
          <p className="text-[8px] text-zinc-400 text-center uppercase tracking-widest font-bold">Produktion & Versand innerhalb von 48h</p>
        </footer>

        {errorInfo && (
          <div className="absolute bottom-36 left-8 right-8 animate-in slide-in-from-bottom-4 z-[100]">
             <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-4 text-red-600 shadow-2xl">
                <X size={20} className="shrink-0 cursor-pointer" onClick={() => setErrorInfo(null)} />
                <div className="flex-1">
                   <p className="text-[10px] font-black uppercase tracking-wider">{errorInfo.title}</p>
                   <p className="text-[9px] opacity-80">{errorInfo.msg}</p>
                </div>
             </div>
          </div>
        )}
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer 
          ref={viewerRef} config={config}
          svgElements={svgElements} showNFCPreview={activeDept === 'digital'}
        />
        
        {successId && (
          <div className="absolute inset-0 z-[100] bg-emerald-500/90 backdrop-blur-2xl flex items-center justify-center animate-in zoom-in duration-500 p-8">
            <div className="bg-white p-12 md:p-16 rounded-[40px] text-center space-y-8 shadow-2xl max-w-sm w-full">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Check size={40} /></div>
              <div className="space-y-2">
                <h3 className="serif-headline text-3xl font-black text-navy uppercase">Studio Save</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Wird an den Warenkorb übertragen...</p>
              </div>
              <div className="bg-cream px-6 py-4 rounded-2xl font-mono text-xs text-emerald-600 border border-emerald-100">ID: {successId}</div>
              <Loader2 className="animate-spin mx-auto text-emerald-500" />
            </div>
          </div>
        )}

        {/* Branding Overlay */}
        <div className="absolute bottom-8 right-8 pointer-events-none opacity-20">
           <p className="font-black text-3xl serif-headline text-navy tracking-tighter uppercase">Nudaim3D Studio</p>
        </div>
      </main>
    </div>
  );
};

export default App;
