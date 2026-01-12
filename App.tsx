
import React, { useState, useRef, useEffect } from 'react';
import { Printer, Loader2, Check, X, Smartphone, Globe, Star, Wifi, Instagram, Link as LinkIcon, ChevronRight, Sparkles, Award, Gift, Camera, RefreshCw, Copy, ExternalLink, ShoppingCart, Zap, Share2, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData } from './types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, getDetailedError } from './lib/supabase';

const dataURLtoBlob = (dataurl: string) => {
  try {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("Blob error:", e);
    return null;
  }
};

type Department = '3d' | 'digital';
type SavingStep = 'idle' | 'screenshot' | 'upload' | 'db' | 'done' | 'error';

const MicrositeView: React.FC<{ config: ModelConfig, shortId: string }> = ({ config, shortId }) => {
  const blocks = config.nfcBlocks || [];
  return (
    <div className="min-h-screen w-full flex flex-col items-center py-12 px-6 bg-cream">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
        <header className="text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-navy/5">
             <Smartphone size={32} className="text-petrol" />
          </div>
          <h1 className="serif-headline text-3xl font-black text-navy uppercase tracking-tight">NUDAIM STUDIO</h1>
        </header>
        {blocks.map(block => (
          <div key={block.id} className="bg-white p-6 rounded-3xl shadow-sm border border-navy/5">
             <h2 className="font-black text-navy text-base uppercase mb-1 tracking-wide">{block.title || block.buttonType}</h2>
             <p className="text-xs text-zinc-500 leading-relaxed">{block.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeDept, setActiveDept] = useState<Department>('3d');
  const [savingStep, setSavingStep] = useState<SavingStep>('idle');
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string} | null>(null);
  const [successData, setSuccessData] = useState<{id: string, secret: string, imageUrl: string} | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [micrositeId, setMicrositeId] = useState<string | null>(null);
  const [micrositeData, setMicrositeData] = useState<ModelConfig | null>(null);
  const [copied, setCopied] = useState(false);
  
  const viewerRef = useRef<{ takeScreenshot: () => Promise<string> }>(null);

  useEffect(() => {
    setIsLoaded(true);
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setMicrositeId(id);
      fetchMicrosite(id);
    }
  }, []);

  const fetchMicrosite = async (id: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('nfc_configs').select('*').eq('short_id', id).single();
      if (!error && data) setMicrositeData(data.config);
    } catch (e) { console.error("Fetch error", e); }
  };

  const handleSave = async () => {
    if (!supabase) {
      setErrorInfo({ title: "Verbindung", msg: "Datenbank nicht bereit.", code: "NO_DB" });
      return;
    }
    
    setSavingStep('screenshot');
    setErrorInfo(null);

    // Globaler Timeout Schutz gegen unendliches Laden
    const timeout = setTimeout(() => {
      if (savingStep !== 'done' && savingStep !== 'idle' && !successData) {
        setSavingStep('error');
        setErrorInfo({ title: "Timeout", msg: "Der Vorgang dauert zu lange. Bitte versuche es erneut.", code: "TIMEOUT" });
      }
    }, 25000);

    try {
      let finalImageUrl = '';
      const screenshot = await viewerRef.current?.takeScreenshot();
      
      if (screenshot) {
        setSavingStep('upload');
        const blob = dataURLtoBlob(screenshot);
        if (blob) {
          const fileName = `nudaim_${Date.now()}.png`;
          await supabase.storage.from('nudaim').upload(fileName, blob);
          const { data: urlData } = supabase.storage.from('nudaim').getPublicUrl(fileName);
          finalImageUrl = urlData.publicUrl;
        }
      }

      setSavingStep('db');
      const secretKey = Math.random().toString(36).substring(2, 10).toUpperCase();
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error: dbError } = await supabase.from('nfc_configs').insert([{ 
        short_id: shortId, config, image_url: finalImageUrl, max_stamps: 10, stamp_count: 0, secret_claim_key: secretKey
      }]);

      if (dbError) throw dbError;
      
      clearTimeout(timeout);
      setSuccessData({ id: shortId, secret: secretKey, imageUrl: finalImageUrl });
      setSavingStep('done');
      
    } catch (err: any) {
      clearTimeout(timeout);
      console.error("Save failed:", err);
      setErrorInfo(getDetailedError(err));
      setSavingStep('idle');
    }
  };

  if (!isLoaded) return <div className="h-screen w-screen flex items-center justify-center bg-cream"><Loader2 className="animate-spin text-petrol" size={40}/></div>;
  if (micrositeId && micrositeData) return <MicrositeView config={micrositeData} shortId={micrositeId} />;

  const isSaving = savingStep !== 'idle' && savingStep !== 'done' && savingStep !== 'error';
  const micrositeUrl = successData ? `${window.location.origin}${window.location.pathname}?id=${successData.id}` : '';

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden">
      <aside className="w-[450px] bg-white border-r border-navy/5 flex flex-col z-50 shadow-2xl relative">
        <header className="p-8 border-b border-navy/5">
          <div className="flex items-center justify-between mb-8">
            <h1 className="serif-headline font-black text-2xl uppercase tracking-tight">NUDAIM3D</h1>
            <div className="flex bg-cream p-1 rounded-2xl border border-navy/5">
              <button onClick={() => setActiveDept('3d')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === '3d' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>3D Design</button>
              <button onClick={() => setActiveDept('digital')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === 'digital' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>NFC Setup</button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar technical-grid-fine">
          <Controls activeDept={activeDept} config={config} setConfig={setConfig} svgElements={svgElements} onUpload={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const loader = new SVGLoader();
              const svgData = loader.parse(ev.target?.result as string);
              setSvgElements(svgData.paths.map((path, i) => ({
                id: `path-${i}`, shapes: SVGLoader.createShapes(path), color: path.color.getStyle(), currentColor: path.color.getStyle(), name: `Part ${i + 1}`
              })));
            };
            reader.readAsText(file);
          }} onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)} />
        </div>
        <footer className="p-8 border-t border-navy/5">
          <button 
            onClick={activeDept === '3d' ? () => setActiveDept('digital') : handleSave} 
            disabled={isSaving} 
            className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 bg-navy hover:bg-petrol text-white disabled:opacity-50 shadow-xl transition-all"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : (activeDept === '3d' ? "NFC KONFIGURIEREN" : "ABSCHLIESSEN")}
          </button>
        </footer>
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} showNFCPreview={activeDept === 'digital'} />
        
        {isSaving && (
          <div className="absolute inset-0 z-[199] bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
             <div className="w-48 h-48 border-[12px] border-petrol/10 rounded-full animate-spin border-t-petrol" />
             <div className="mt-12 text-center space-y-2">
                <p className="text-xl font-black uppercase tracking-[0.3em] text-navy">Synchronisierung...</p>
                <p className="text-[10px] font-bold text-petrol uppercase tracking-widest">
                  {savingStep === 'screenshot' && "Design wird erfasst"}
                  {savingStep === 'upload' && "Vorschau wird hochgeladen"}
                  {savingStep === 'db' && "Chip wird programmiert"}
                </p>
             </div>
          </div>
        )}

        {errorInfo && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center max-w-sm animate-in zoom-in">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
            <h3 className="font-black text-navy uppercase text-lg mb-2">{errorInfo.title}</h3>
            <p className="text-xs text-zinc-500 mb-8">{errorInfo.msg}</p>
            <button onClick={() => setErrorInfo(null)} className="w-full py-4 bg-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">OK</button>
          </div>
        )}

        {successData && (
          <div className="absolute inset-0 z-[200] bg-navy/95 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-white p-12 rounded-[3.5rem] text-center space-y-10 shadow-2xl max-w-lg w-full">
              <div className="w-24 h-24 bg-petrol/5 text-petrol rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck size={48} /></div>
              <h3 className="serif-headline text-4xl font-black text-navy uppercase italic">BEREIT!</h3>
              <div className="space-y-4 bg-offwhite p-8 rounded-[2rem] border border-navy/5 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-navy/40">Deine Microsite URL</p>
                <div className="bg-white p-6 rounded-2xl border border-navy/10 font-mono text-xs text-action break-all select-all leading-relaxed">
                  {micrositeUrl}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(micrositeUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="w-full py-3 bg-navy text-white rounded-xl text-[9px] font-black uppercase tracking-widest">
                  {copied ? "Kopiert!" : "URL Kopieren"}
                </button>
              </div>
              <button onClick={() => window.location.href = `https://nudaim3d.de/cart/add?id=56564338262361&properties[ID]=${successData.id}`} className="w-full h-20 bg-petrol hover:bg-action text-white rounded-[1.5rem] flex items-center justify-center gap-4 shadow-xl transition-all font-black uppercase tracking-[0.2em] text-sm">
                <ShoppingCart size={24} /> ZUM CHECKOUT
              </button>
              <button onClick={() => setSuccessData(null)} className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Editor</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
