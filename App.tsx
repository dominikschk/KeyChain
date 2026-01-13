
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
  const t = config.nfcTemplate;
  
  return (
    <div className={`min-h-screen w-full flex flex-col items-center py-12 px-6 ${t === 'minimal' ? 'bg-white' : 'bg-cream'}`}>
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
        <header className="text-center space-y-6">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-navy/5">
             <Smartphone size={44} className="text-petrol" />
          </div>
          <h1 className="serif-headline text-4xl font-black text-navy uppercase tracking-tight">NUDAIM STUDIO</h1>
          <div className="h-1 w-12 bg-action mx-auto rounded-full" />
        </header>

        <main className="space-y-4">
          {blocks.map(block => (
            <div key={block.id} className="bg-white p-7 rounded-[2.5rem] shadow-[0_10px_40px_rgba(17,35,90,0.04)] border border-navy/5 group hover:scale-[1.02] transition-transform">
               <div className="flex items-center gap-4 mb-3">
                 <div className="p-3 bg-cream rounded-2xl text-petrol">
                    {block.type === 'magic_button' && block.buttonType === 'wifi' && <Wifi size={20}/>}
                    {block.type === 'magic_button' && block.buttonType === 'review' && <Star size={20}/>}
                    {block.type === 'magic_button' && block.buttonType === 'social_loop' && <Instagram size={20}/>}
                    {block.type === 'text' && <Smartphone size={20}/>}
                 </div>
                 <h2 className="font-black text-navy text-lg uppercase tracking-wide">{block.title || block.buttonType}</h2>
               </div>
               <p className="text-sm text-zinc-500 leading-relaxed font-medium">{block.content}</p>
               {block.type === 'image' && block.imageUrl && (
                 <img src={block.imageUrl} className="mt-4 w-full rounded-2xl shadow-sm" alt="Microsite Content" />
               )}
            </div>
          ))}
        </main>

        <footer className="text-center pt-12 opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-navy">Powered by NUDAIM3D Studio</p>
        </footer>
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
      if (!error && data) {
        setMicrositeData(data.config);
      }
    } catch (e) { console.error("Microsite load error", e); }
  };

  const handleSave = async () => {
    if (!supabase) {
      setErrorInfo({ title: "Datenbank", msg: "Supabase Verbindung nicht aktiv.", code: "NO_DB" });
      return;
    }
    
    setSavingStep('screenshot');
    setErrorInfo(null);

    try {
      let finalImageUrl = '';
      const screenshot = await viewerRef.current?.takeScreenshot();
      
      if (screenshot) {
        setSavingStep('upload');
        const blob = dataURLtoBlob(screenshot);
        if (blob) {
          const fileName = `nudaim_${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage.from('nudaim').upload(fileName, blob);
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('nudaim').getPublicUrl(fileName);
            finalImageUrl = urlData.publicUrl;
          }
        }
      }

      setSavingStep('db');
      const secretKey = Math.random().toString(36).substring(2, 10).toUpperCase();
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Speichern der gesamten Konfiguration in die Tabelle nfc_configs
      const { error: dbError } = await supabase.from('nfc_configs').insert([{ 
        short_id: shortId, 
        config, 
        image_url: finalImageUrl, 
        max_stamps: 10, 
        stamp_count: 0, 
        secret_claim_key: secretKey
      }]);

      if (dbError) throw dbError;
      
      setSuccessData({ id: shortId, secret: secretKey, imageUrl: finalImageUrl });
      setSavingStep('done');
      
    } catch (err: any) {
      console.error("Speicherfehler:", err);
      setErrorInfo(getDetailedError(err));
      setSavingStep('idle');
    }
  };

  if (!isLoaded) return null;
  if (micrositeId && micrositeData) return <MicrositeView config={micrositeData} shortId={micrositeId} />;

  const isSaving = savingStep !== 'idle' && savingStep !== 'done';
  const micrositeUrl = successData ? `${window.location.origin}${window.location.pathname}?id=${successData.id}` : '';

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden">
      <aside className="w-[450px] bg-white border-r border-navy/5 flex flex-col z-50 shadow-2xl relative">
        <header className="p-8 border-b border-navy/5 bg-white">
          <div className="flex items-center justify-between mb-8">
            <h1 className="serif-headline font-black text-2xl uppercase tracking-tight">NUDAIM3D</h1>
            <div className="flex bg-cream p-1 rounded-2xl border border-navy/5">
              <button onClick={() => setActiveDept('3d')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === '3d' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>3D Studio</button>
              <button onClick={() => setActiveDept('digital')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === 'digital' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>NFC Chip</button>
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

        <footer className="p-8 border-t border-navy/5 bg-white">
          <button 
            onClick={activeDept === '3d' ? () => setActiveDept('digital') : handleSave} 
            disabled={isSaving} 
            className={`w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl transition-all ${activeDept === '3d' ? 'bg-navy hover:bg-petrol text-white' : 'bg-petrol hover:bg-action text-white'} disabled:opacity-50`}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : (activeDept === '3d' ? "NFC KONFIGURIEREN" : "SPEICHERN & LIVE GEHEN")}
          </button>
        </footer>
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} showNFCPreview={activeDept === 'digital'} />
        
        {isSaving && (
          <div className="absolute inset-0 z-[199] bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
             <div className="relative">
                <div className="w-48 h-48 border-[12px] border-petrol/10 rounded-full animate-spin border-t-petrol shadow-[0_0_60px_rgba(0,102,153,0.1)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <Zap size={56} className="text-petrol animate-pulse" />
                </div>
             </div>
             <div className="mt-12 text-center space-y-3">
                <p className="text-2xl font-black uppercase tracking-[0.4em] text-navy animate-pulse">Supabase Sync</p>
                <div className="flex flex-col gap-1 items-center">
                  <p className="text-xs font-bold text-petrol uppercase tracking-widest">
                    {savingStep === 'screenshot' && "3D-Design wird gerfasst..."}
                    {savingStep === 'upload' && "Vorschau wird hochgeladen..."}
                    {savingStep === 'db' && "Profil wird permanent gespeichert..."}
                  </p>
                </div>
             </div>
          </div>
        )}

        {errorInfo && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] bg-white border border-red-500/20 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center max-w-sm animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={40} /></div>
            <h3 className="font-black text-navy uppercase tracking-widest text-lg mb-2">{errorInfo.title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed mb-8">{errorInfo.msg}</p>
            <button onClick={() => setErrorInfo(null)} className="w-full py-4 bg-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-colors">Wiederholen</button>
          </div>
        )}

        {successData && (
          <div className="absolute inset-0 z-[200] bg-navy/95 backdrop-blur-3xl flex items-center justify-center animate-in fade-in duration-700 p-8">
            <div className="bg-white p-12 rounded-[3.5rem] text-center space-y-12 shadow-[0_0_150px_rgba(0,0,0,0.5)] max-w-xl w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-petrol via-action to-petrol animate-pulse" />
              <div className="space-y-4">
                <div className="w-24 h-24 bg-petrol/5 text-petrol rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck size={56} className="animate-in zoom-in duration-500" /></div>
                <h3 className="serif-headline text-5xl font-black text-navy uppercase italic tracking-tight">STUDIO READY</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-[0.3em]">Deine Microsite wurde erfolgreich gespeichert.</p>
              </div>
              <div className="space-y-6 bg-offwhite p-10 rounded-[2.5rem] border border-navy/5 text-left shadow-inner relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3"><Globe size={18} className="text-petrol" /><span className="text-[11px] font-black uppercase tracking-widest text-navy italic">Deine Microsite URL</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(micrositeUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`px-6 py-3 rounded-full transition-all shadow-xl ${copied ? 'bg-emerald-500 text-white' : 'bg-navy text-white hover:bg-petrol'}`}><span className="text-[10px] font-black uppercase tracking-widest">{copied ? 'Kopiert!' : 'Kopieren'}</span></button>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-navy/10 font-mono text-xs text-action break-all shadow-inner leading-relaxed select-all">{micrositeUrl}</div>
              </div>
              <div className="pt-4 flex flex-col gap-6">
                <button onClick={() => window.location.href = `https://nudaim3d.de/cart/add?id=56564338262361&properties[3D_VORSCHAU]=${encodeURIComponent(successData.imageUrl)}&properties[MICROSITE_ID]=${successData.id}`} className="h-24 bg-navy hover:bg-petrol text-white rounded-[2rem] flex items-center justify-center shadow-xl transition-all group overflow-hidden">
                  <div className="flex items-center gap-6 font-black text-base uppercase tracking-[0.3em]"><ShoppingCart size={32} />ZUM CHECKOUT<ArrowRight size={28} /></div>
                </button>
                <button onClick={() => setSuccessData(null)} className="text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-navy transition-colors">Zurück zum Studio</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
