
import React, { useState, useRef, useEffect } from 'react';
import { Printer, Loader2, Check, X, Smartphone, Globe, Star, Wifi, Instagram, Link as LinkIcon, ChevronRight, Sparkles, Award, Gift, Camera, RefreshCw } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData, NFCBlock } from './types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, getDetailedError } from './lib/supabase';
import jsQR from 'jsqr';

type Department = '3d' | 'digital';

const QRScanner: React.FC<{ onScan: (code: string) => void, onClose: () => void, isTest?: boolean }> = ({ onScan, onClose, isTest }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    const startCamera = async () => {
      try {
        const constraints = { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Scanner Error:", err);
        setError("Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.");
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            if (code && code.data) {
              onScan(code.data);
              return; 
            }
          }
        }
      }
      animationId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationId);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      {isTest && (
        <div className="absolute top-10 bg-action/20 border border-action text-action px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse z-50">
          Studio Test-Modus
        </div>
      )}
      
      <div className="w-full max-w-sm aspect-square relative rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-[0_0_100px_rgba(18,169,224,0.3)] bg-zinc-900">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="scanner-line z-10" />
        <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none z-10" />
        
        {/* Corner Markers */}
        <div className="absolute top-10 left-10 w-10 h-10 border-t-4 border-l-4 border-action rounded-tl-xl z-20" />
        <div className="absolute top-10 right-10 w-10 h-10 border-t-4 border-r-4 border-action rounded-tr-xl z-20" />
        <div className="absolute bottom-10 left-10 w-10 h-10 border-b-4 border-l-4 border-action rounded-bl-xl z-20" />
        <div className="absolute bottom-10 right-10 w-10 h-10 border-b-4 border-r-4 border-action rounded-br-xl z-20" />

        {error && (
          <div className="absolute inset-0 bg-red-500/95 flex flex-col items-center justify-center p-8 text-center text-white z-30">
            <X size={48} className="mb-4" />
            <p className="font-bold text-sm leading-relaxed">{error}</p>
            <button onClick={onClose} className="mt-8 bg-white text-red-500 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest">Schließen</button>
          </div>
        )}
      </div>
      
      <div className="mt-12 space-y-2 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 text-action mb-2">
          <Loader2 className="animate-spin" size={16} />
          <p className="text-white text-xs font-black uppercase tracking-[0.3em]">Scanner Aktiv</p>
        </div>
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest max-w-[260px] leading-loose">
          Richte die Kamera auf den Händler-Code.<br/>
          {isTest ? "Jeder QR-Code wird im Testmodus erkannt." : "Nur der Sicherheits-Code ist gültig."}
        </p>
      </div>

      <button 
        onClick={onClose}
        className="mt-16 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10 hover:scale-110 active:scale-95"
      >
        <X size={24} />
      </button>
    </div>
  );
};

const StampCardUI: React.FC<{ count: number, max: number, onOpenScanner: () => void, isClaiming?: boolean }> = ({ count, max, onOpenScanner, isClaiming }) => {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(17,35,90,0.08)] border border-navy/5 space-y-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
        <Award size={180} className="text-navy" />
      </div>
      
      <div className="flex justify-between items-end relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-action animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-petrol">Treue-Karte</p>
          </div>
          <h2 className="serif-headline text-3xl font-black text-navy">Premium Rewards</h2>
        </div>
        <div className="text-right">
          <span className="text-4xl font-black text-navy tabular-nums">{count}</span>
          <span className="text-xl text-zinc-300 font-bold"> / {max}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 relative z-10">
        {Array.from({ length: max }).map((_, i) => (
          <div 
            key={i} 
            className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${
              i < count 
                ? 'bg-petrol border-petrol text-white shadow-lg shadow-petrol/20 scale-100' 
                : 'bg-cream border-navy/5 text-navy/5 scale-95'
            }`}
          >
            {i < count ? (
              <div className="animate-in zoom-in spin-in-12 duration-500">
                <Check size={20} strokeWidth={4} />
              </div>
            ) : (
              <div className="w-1.5 h-1.5 bg-current rounded-full" />
            )}
          </div>
        ))}
      </div>

      <div className="pt-4 relative z-10 space-y-6">
        {count >= max ? (
          <div className="bg-emerald-500 text-white p-6 rounded-3xl text-center animate-in fade-in zoom-in duration-500 shadow-xl flex items-center justify-center gap-4">
             <Gift size={24} className="animate-bounce" />
             <div className="text-left">
               <p className="text-[10px] font-black uppercase tracking-widest">Belohnung bereit!</p>
               <p className="text-xs font-bold">An der Kasse vorzeigen.</p>
             </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-widest px-1">
              <span>{max - count} Stempel bis zum Ziel</span>
              <div className="h-1 flex-1 mx-4 bg-zinc-100 rounded-full overflow-hidden">
                 <div className="h-full bg-petrol transition-all duration-1000" style={{ width: `${(count/max)*100}%` }} />
              </div>
            </div>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenScanner(); }}
              disabled={isClaiming}
              className="w-full h-16 bg-navy text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-petrol transition-all shadow-xl active:scale-95 disabled:opacity-50 pointer-events-auto"
            >
              {isClaiming ? <RefreshCw className="animate-spin" size={18} /> : <><Camera size={18} /> STEMPEL SAMMELN</>}
            </button>
          </>
        )}
      </div>
      
      {isClaiming && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader2 className="animate-spin text-petrol" size={32} />
        </div>
      )}
    </div>
  );
};

const MicrositeView: React.FC<{ config: ModelConfig, shortId: string }> = ({ config, shortId }) => {
  const [currentCount, setCurrentCount] = useState(config.stampCount || 0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showScanner, setShowScanner] = useState(false);

  const blocks = config.nfcBlocks || [];
  const t = config.nfcTemplate;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const claimKey = params.get('claim');
    if (claimKey) {
      handleClaim(claimKey);
    }
  }, []);

  const handleClaim = async (key: string) => {
    if (!supabase || isClaiming) return;
    setIsClaiming(true);
    setShowScanner(false);
    try {
      const { data, error } = await supabase.rpc('increment_stamp_secure', {
        target_short_id: shortId,
        provided_key: key.trim()
      });

      if (error) throw error;

      if (data === true) {
        setClaimStatus('success');
        setCurrentCount(prev => prev + 1);
        window.history.replaceState({}, '', window.location.pathname + `?id=${shortId}`);
      } else {
        alert("Ungültiger Code oder bereits maximale Stempel erreicht.");
      }
    } catch (e) {
      alert("Ein Fehler ist aufgetreten beim Einlösen.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center py-12 px-6 ${
      t === 'minimal' ? 'bg-white' : t === 'professional' ? 'bg-slate-50' : 'bg-gradient-to-br from-offwhite to-cream'
    }`}>
      {showScanner && <QRScanner onScan={handleClaim} onClose={() => setShowScanner(false)} />}

      {claimStatus === 'success' && (
        <div className="fixed inset-0 z-[700] bg-navy/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-700 text-white text-center">
          <div className="w-32 h-32 bg-action/20 rounded-full flex items-center justify-center mb-10 animate-bounce shadow-[0_0_80px_rgba(18,169,224,0.4)]">
            <Sparkles size={64} className="text-action" />
          </div>
          <h2 className="serif-headline text-6xl font-black mb-6 tracking-tight italic">BOOM!</h2>
          <p className="text-xl font-bold uppercase tracking-[0.3em] opacity-80 mb-12">Dein Stempel ist da.</p>
          <button 
            onClick={() => setClaimStatus('idle')} 
            className="bg-white text-navy px-16 py-6 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all"
          >
            Zurück zur Karte
          </button>
        </div>
      )}

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <header className="text-center space-y-6">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-navy/5 relative group">
             <div className="absolute inset-0 bg-petrol/5 rounded-[2.5rem] scale-90 blur-xl group-hover:scale-110 transition-transform duration-700" />
             <Smartphone size={44} className="text-petrol relative z-10" />
          </div>
          <div className="space-y-2">
            <h1 className="serif-headline text-4xl font-black text-navy uppercase tracking-tighter">NUDAIM STUDIO</h1>
            <div className="h-1 w-12 bg-action mx-auto rounded-full" />
          </div>
        </header>

        {blocks.map(block => {
          if (block.type === 'magic_button' && block.buttonType === 'stamp_card') {
            return <StampCardUI key={block.id} count={currentCount} max={config.maxStamps || 10} onOpenScanner={() => setShowScanner(true)} isClaiming={isClaiming} />;
          }
          return (
            <div key={block.id} className="bg-white p-7 rounded-[2.5rem] shadow-[0_10px_40px_rgba(17,35,90,0.04)] border border-navy/5 transition-all hover:translate-y-[-2px]">
               <div className="flex items-center gap-5 mb-4">
                 <div className="p-4 bg-cream rounded-2xl text-petrol"><Globe size={24} /></div>
                 <h2 className="font-black text-navy text-lg uppercase tracking-wide">{block.title || block.buttonType}</h2>
               </div>
               <p className="text-sm text-zinc-500 leading-relaxed font-medium pl-2">{block.content}</p>
            </div>
          );
        })}

        <footer className="text-center pt-20 pb-10">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-navy opacity-20">Germany • NUDAIM STUDIO • 2024</p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeDept, setActiveDept] = useState<Department>('3d');
  const [isSaving, setIsSaving] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string} | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [micrositeId, setMicrositeId] = useState<string | null>(null);
  const [micrositeData, setMicrositeData] = useState<ModelConfig | null>(null);
  const [showStudioScanner, setShowStudioScanner] = useState(false);
  const [studioTestSuccess, setStudioTestSuccess] = useState(false);
  
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
      const { data, error } = await supabase
        .from('nfc_configs')
        .select('*')
        .eq('short_id', id)
        .single();

      if (!error && data) {
        setMicrositeData({
          ...data.config,
          stampCount: data.stamp_count,
          maxStamps: data.max_stamps
        });
      }
    } catch (e) {
      console.error("Microsite fetch error", e);
    }
  };

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
      setErrorInfo({ title: "Verbindung", msg: "Supabase Konfiguration fehlt.", code: "NO_DB" });
      return;
    }
    
    setIsSaving(true);
    try {
      const screenshot = await viewerRef.current?.takeScreenshot();
      let finalImageUrl = '';
      
      if (screenshot) {
        const fileName = `nudaim_${Date.now()}.png`;
        const blob = await (await fetch(screenshot)).blob();
        await supabase.storage.from('nudaim').upload(fileName, blob);
        const { data } = supabase.storage.from('nudaim').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }

      const secretKey = Math.random().toString(36).substring(2, 10).toUpperCase();
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

      const finalConfig = { ...config };

      const { error } = await supabase
        .from('nfc_configs')
        .insert([{ 
          short_id: shortId,
          config: finalConfig, 
          image_url: finalImageUrl,
          max_stamps: 10,
          stamp_count: 0,
          secret_claim_key: secretKey
        }]);

      if (error) throw error;
      
      setSuccessId(shortId);
      
      setTimeout(() => {
        const shopifyId = "56564338262361";
        const redirectUrl = `https://nudaim3d.de/cart/add?id=${shopifyId}&properties[3D_VORSCHAU]=${encodeURIComponent(finalImageUrl)}&properties[NFC_SETUP_ID]=${shortId}&properties[STAMP_SECRET_CODE]=${secretKey}`;
        window.location.href = redirectUrl;
      }, 2000);
      
    } catch (err: any) {
      setErrorInfo(getDetailedError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return null;

  if (micrositeId && micrositeData) {
    return <MicrositeView config={micrositeData} shortId={micrositeId} />;
  }

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden">
      {showStudioScanner && (
        <QRScanner 
          isTest
          onScan={(code) => { 
            setStudioTestSuccess(true);
            setShowStudioScanner(false);
            setTimeout(() => setStudioTestSuccess(false), 3000);
          }} 
          onClose={() => setShowStudioScanner(false)} 
        />
      )}

      {studioTestSuccess && (
        <div className="fixed inset-0 z-[1000] bg-petrol/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 shadow-2xl">
             <Sparkles size={48} className="text-white animate-pulse" />
           </div>
           <h2 className="serif-headline text-4xl font-black mb-4">TEST ERFOLGREICH!</h2>
           <p className="text-sm font-bold uppercase tracking-widest opacity-80">Der Scanner hat den Code erkannt.</p>
           <p className="mt-8 text-[10px] uppercase tracking-widest bg-white/10 px-6 py-3 rounded-full">Automatischer Close in 3s</p>
        </div>
      )}

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
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer 
          ref={viewerRef} config={config}
          svgElements={svgElements} showNFCPreview={activeDept === 'digital'}
          onOpenScanner={() => setShowStudioScanner(true)}
        />
        {successId && (
          <div className="absolute inset-0 z-[100] bg-emerald-500/90 backdrop-blur-2xl flex items-center justify-center animate-in zoom-in duration-500 p-8">
            <div className="bg-white p-16 rounded-[40px] text-center space-y-8 shadow-2xl max-w-sm w-full">
              <Check size={60} className="mx-auto text-emerald-500" />
              <h3 className="serif-headline text-3xl font-black text-navy uppercase">Daten gespeichert</h3>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Wird an Shopify übertragen...</p>
              <div className="bg-cream px-6 py-4 rounded-2xl font-mono text-xs text-emerald-600 border border-emerald-100">ID: {successId}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
