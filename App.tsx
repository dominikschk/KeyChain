
import React, { useState, useRef, useEffect } from 'react';
import { Printer, Loader2, Check, X, Smartphone, Globe, Star, Wifi, Instagram, Link as LinkIcon, ChevronRight, Sparkles, Award, Gift, Camera, RefreshCw, Copy, ExternalLink, ShoppingCart, Zap, Share2, ShieldCheck, ArrowRight, AlertTriangle, Search, Database, Layers, Info, History, ShieldEllipsis, Terminal, Clock, Code2 } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG, SHOPIFY_BASE_URL } from './constants';
import { ModelConfig, SVGPathData, Department, SavingStep } from './types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, getDetailedError, SUPABASE_URL } from './lib/supabase';

const withTimeout = <T,>(promise: Promise<T> | PromiseLike<T>, ms: number, timeoutError = 'TIMEOUT'): Promise<T> => {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutError)), ms))
  ]);
};

const dataURLtoBlob = (dataurl: string) => {
  try {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return null;
  }
};

const MicrositeView: React.FC<{ config: ModelConfig, shortId: string }> = ({ config, shortId }) => {
  const blocks = config.nfcBlocks || [];
  const t = config.nfcTemplate;
  return (
    <div className={`min-h-screen w-full flex flex-col items-center py-12 px-6 ${t === 'minimal' ? 'bg-white' : 'bg-cream'}`}>
      <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
        <header className="text-center space-y-6">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-navy/5">
             <Smartphone size={44} className="text-petrol" />
          </div>
          <h1 className="serif-headline text-4xl font-black text-navy uppercase tracking-tight italic">NUDAIM PROFILE</h1>
          <div className="h-1 w-12 bg-action mx-auto rounded-full" />
        </header>
        <main className="space-y-4">
          {blocks.map(block => (
            <div key={block.id} className="bg-white p-7 rounded-[2.5rem] shadow-[0_10px_40px_rgba(17,35,90,0.04)] border border-navy/5">
               <div className="flex items-center gap-4 mb-3">
                 <div className="p-3 bg-cream rounded-2xl text-petrol">
                    {block.type === 'magic_button' && block.buttonType === 'wifi' && <Wifi size={20}/>}
                    {block.type === 'magic_button' && block.buttonType === 'review' && <Star size={20}/>}
                    {block.type === 'magic_button' && block.buttonType === 'social_loop' && <Instagram size={20}/>}
                    {block.type === 'magic_button' && block.buttonType === 'stamp_card' && <Award size={20}/>}
                    {block.type === 'text' && <Smartphone size={20}/>}
                 </div>
                 <h2 className="font-black text-navy text-lg uppercase tracking-wide">{block.title || block.buttonType}</h2>
               </div>
               <p className="text-sm text-zinc-500 leading-relaxed font-medium">{block.content}</p>
               {block.type === 'image' && block.imageUrl && <img src={block.imageUrl} className="mt-4 w-full rounded-2xl shadow-sm" alt="Content" />}
            </div>
          ))}
        </main>
        <footer className="text-center pt-12 opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-navy">Powered by NUDAIM3D.DE</p>
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
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string, source?: string} | null>(null);
  const [successData, setSuccessData] = useState<{id: string, imageUrl: string, micrositeUrl: string} | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showForceEnter, setShowForceEnter] = useState(false);
  const [micrositeId, setMicrositeId] = useState<string | null>(null);
  const [micrositeData, setMicrositeData] = useState<ModelConfig | null>(null);
  const [micrositeError, setMicrositeError] = useState<string | null>(null);
  
  const viewerRef = useRef<{ takeScreenshot: () => Promise<string> }>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const timer = setTimeout(() => setShowForceEnter(true), 1500);
    if (id) {
      setMicrositeId(id);
      fetchMicrosite(id);
    } else {
      setIsInitialLoading(false);
    }
    return () => clearTimeout(timer);
  }, []);

  const fetchMicrosite = async (id: string) => {
    if (!supabase) { setIsInitialLoading(false); return; }
    try {
      const { data, error } = (await withTimeout(
        supabase.from('nfc_configs').select('*').eq('short_id', id).single(),
        8000
      )) as any;
      if (error) throw error;
      if (data) setMicrositeData(data.config);
      else setMicrositeError("Not Found");
    } catch (e: any) {
      setMicrositeError("Fetch Error");
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleSave = async () => {
    if (!supabase) {
      setErrorInfo({ title: "Setup Error", msg: "Keine Verbindung zum Cloud-Server.", code: "SUPA_MISSING" });
      return;
    }
    
    setSavingStep('screenshot');
    setErrorInfo(null);
    setSuccessData(null);

    let finalImageUrl = '';
    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const micrositeUrl = `${window.location.origin}${window.location.pathname}?id=${shortId}`;

    try {
      // 1. Snapshot
      console.log("NFeC Sync: Capturing 3D model screenshot...");
      const screenshot = await withTimeout<string>(
        viewerRef.current?.takeScreenshot() || Promise.resolve(''),
        10000
      ).catch(() => '');
      
      // 2. Media Upload (Fehlertolerant bei 403)
      if (screenshot) {
        setSavingStep('upload');
        console.log("NFeC Sync: Uploading design to storage...");
        try {
          const blob = dataURLtoBlob(screenshot);
          if (blob) {
            const fileName = `nudaim_${shortId}.png`;
            const { error: uploadError } = (await withTimeout(
              supabase.storage.from('nudaim').upload(fileName, blob, {
                cacheControl: '3600',
                upsert: true
              }),
              15000
            )) as any;
            
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('nudaim').getPublicUrl(fileName);
              finalImageUrl = urlData.publicUrl;
            } else {
              console.error("NFeC Storage Error (Soft-Fail):", uploadError);
              // WIR GEHEN TROTZDEM WEITER! (Soft-Fail für 403)
            }
          }
        } catch (e) {
          console.warn("NFeC Media sync timed out, but proceeding with database link.");
        }
      }

      // 3. Database Link (Wichtigster Schritt)
      setSavingStep('db');
      console.log("NFeC Sync: Finalizing database registration...");
      const { error: dbError } = (await withTimeout(
        supabase.from('nfc_configs').insert([{ 
          short_id: shortId, 
          config: config,
          image_url: finalImageUrl
        }]),
        15000
      )) as any;

      if (dbError) throw dbError;
      
      setSuccessData({ id: shortId, imageUrl: finalImageUrl, micrositeUrl });
      setSavingStep('done');

      // REDIRECT ZU NUDAIM3D.DE MIT PARAMETERN
      const shopifyRedirect = new URL(SHOPIFY_BASE_URL);
      shopifyRedirect.searchParams.append('config_id', shortId);
      shopifyRedirect.searchParams.append('microsite', micrositeUrl);
      if (finalImageUrl) {
        shopifyRedirect.searchParams.append('preview', finalImageUrl);
      }
      
      // Delay für die Erfolgsmeldung
      setTimeout(() => {
        window.location.href = shopifyRedirect.toString();
      }, 3500);
      
    } catch (err: any) {
      console.error("NFeC Fatal Failure:", err);
      const detailed = getDetailedError(err);
      setErrorInfo({ 
        ...detailed, 
        source: `Process: ${savingStep} | ID: ${shortId} | Error: ${err.message || 'Check Console'}` 
      });
      setSavingStep('idle');
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen w-screen bg-navy flex flex-col items-center justify-center text-white p-12 text-center">
        <div className="w-16 h-16 border-4 border-white/5 border-t-action rounded-full soft-spin mb-8 shadow-2xl" />
        <h2 className="serif-headline text-3xl font-black uppercase tracking-widest mb-4 italic animate-pulse">NUDAIM STUDIO</h2>
        {showForceEnter && (
          <button onClick={() => setIsInitialLoading(false)} className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all">Studio betreten →</button>
        )}
      </div>
    );
  }

  if (micrositeId && (micrositeError || micrositeData)) {
    if (micrositeError) return (
      <div className="h-screen w-screen bg-cream flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={24} /></div>
        <h2 className="serif-headline text-2xl font-black text-navy uppercase mb-4 italic">Profil inaktiv</h2>
        <button onClick={() => window.location.href = window.location.pathname} className="px-8 py-3 bg-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Zum Studio</button>
      </div>
    );
    return <MicrositeView config={micrositeData!} shortId={micrositeId} />;
  }

  const isSaving = savingStep !== 'idle' && savingStep !== 'done';

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden">
      <aside className="w-[450px] bg-white border-r border-navy/5 flex flex-col z-50 shadow-2xl relative">
        <header className="p-8 border-b border-navy/5 bg-white">
          <div className="flex items-center justify-between mb-8">
            <h1 className="serif-headline font-black text-2xl uppercase tracking-tight italic">NUDAIM3D</h1>
            <div className="flex bg-cream p-1 rounded-2xl border border-navy/5">
              <button onClick={() => setActiveDept('3d')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === '3d' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>3D Design</button>
              <button onClick={() => setActiveDept('digital')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === 'digital' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>NFeC Profil</button>
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
          <button onClick={activeDept === '3d' ? () => setActiveDept('digital') : handleSave} disabled={isSaving} className={`w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl transition-all ${activeDept === '3d' ? 'bg-navy hover:bg-petrol text-white' : 'bg-petrol hover:bg-action text-white'} disabled:opacity-50`}>
            {isSaving ? <Loader2 className="animate-spin" /> : (activeDept === '3d' ? "NFeC PROFIL PERSONALISIEREN" : "JETZT BESTELLEN")}
          </button>
        </footer>
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} showNFCPreview={activeDept === 'digital'} />
        
        {isSaving && (
          <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
             <div className="w-20 h-20 border-[6px] border-petrol/10 rounded-full soft-spin border-t-petrol shadow-2xl mb-8" />
             <div className="text-center space-y-4 max-w-xs w-full">
               <p className="text-xl font-black uppercase tracking-[0.3em] text-navy italic">NFeC SYNC</p>
               <div className="h-1.5 w-full bg-cream rounded-full overflow-hidden border border-navy/5">
                  <div className={`h-full bg-petrol transition-all duration-1000 ${savingStep === 'screenshot' ? 'w-1/3' : savingStep === 'upload' ? 'w-2/3' : 'w-full'}`} />
               </div>
               <div className="flex flex-col items-center gap-2 pt-4">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    {savingStep === 'screenshot' && "Design Snapshot..."}
                    {savingStep === 'upload' && "Cloud Storage Sync..."}
                    {savingStep === 'db' && "Konfiguration sichern..."}
                  </p>
                  <p className="text-[8px] text-zinc-300 font-mono uppercase tracking-widest"><Clock size={10} className="inline mr-1"/> Fast fertig!</p>
               </div>
             </div>
          </div>
        )}

        {successData && (
          <div className="absolute inset-0 z-[500] bg-navy/98 backdrop-blur-3xl flex items-center justify-center p-8 animate-in zoom-in duration-500 overflow-y-auto">
             <div className="text-center space-y-8 max-w-lg w-full py-12">
                <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(16,185,129,0.5)] border-4 border-white/20"><ShieldCheck size={48} /></div>
                <div className="space-y-2">
                  <h3 className="serif-headline text-5xl font-black text-white uppercase italic tracking-tight">SICHER!</h3>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Redirect zu nudaim3d.de...</p>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 text-left">
                   <div className="flex items-center justify-between border-b border-white/10 pb-2">
                     <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">NFeC Cloud ID</span>
                     <span className="text-[11px] font-mono text-emerald-400">#{successData.id}</span>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Schnittstelle</p>
                      <p className="text-[10px] font-medium text-white/60">Deine Daten wurden erfolgreich an nudaim3d.de übertragen.</p>
                   </div>
                </div>

                <div className="pt-4">
                  <button onClick={() => window.location.href = SHOPIFY_BASE_URL} className="w-full h-20 bg-white text-navy rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">CHECKOUT ÖFFNEN <ArrowRight size={20} /></button>
                </div>
             </div>
          </div>
        )}

        {errorInfo && (
          <div className="absolute inset-0 z-[300] bg-navy/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center max-w-md w-full">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
              <h3 className="font-black text-navy uppercase tracking-widest mb-2 italic text-lg">{errorInfo.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-6">{errorInfo.msg}</p>
              
              <div className="w-full bg-cream p-5 rounded-2xl text-left mb-8 border border-navy/5">
                <p className="text-[9px] font-black uppercase text-zinc-400 mb-2 flex items-center gap-2 font-mono"><Code2 size={14} /> System-Log:</p>
                <code className="text-[10px] font-mono text-red-500 break-all leading-tight block bg-white p-3 rounded-lg border border-red-100">
                  {errorInfo.source}
                </code>
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <button onClick={() => { setErrorInfo(null); setSavingStep('idle'); }} className="w-full py-4 bg-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-petrol transition-colors">Zurück & Korrigieren</button>
                <button onClick={() => window.location.reload()} className="w-full py-4 bg-cream text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors">Studio neu laden</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
