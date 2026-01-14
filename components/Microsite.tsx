
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Wifi, Star, Instagram, Globe, Link as LinkIcon, AlertTriangle, ShieldCheck, Award, ArrowLeft, Check, Lock, Gift, Fingerprint, RefreshCcw, QrCode, Camera, X, Sparkles } from 'lucide-react';
import { ModelConfig, NFCBlock } from '../types';
import jsQR from 'jsqr';

interface MicrositeProps {
  config: ModelConfig;
  error?: { title: string, msg: string } | null;
}

const QRScanner: React.FC<{ onScan: (code: string) => void, onCancel: () => void }> = ({ onScan, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

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
          // Warten bis Video bereit ist
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            requestAnimationFrame(tick);
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Kamera-Zugriff verweigert oder wird von einer anderen App blockiert.");
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code) {
            onScan(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="relative w-full aspect-square max-w-sm rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-zinc-900">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute inset-0 border-[60px] border-black/60">
           <div className="w-full h-full border-2 border-white/50 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-petrol rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-petrol rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-petrol rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-petrol rounded-br-xl" />
              <div className="absolute inset-x-6 top-1/2 h-0.5 bg-petrol/50 shadow-[0_0_20px_rgba(18,169,224,0.9)] animate-pulse" />
           </div>
        </div>
      </div>

      <div className="mt-12 text-center space-y-4">
        <div className="flex justify-center mb-2"><Camera className="text-white/20" size={32} /></div>
        <p className="text-white font-black uppercase tracking-[0.3em] text-xs">QR-Code scannen</p>
        <p className="text-white/40 text-[10px] uppercase font-bold tracking-tight">Richte dein Handy auf den Code im Laden</p>
        {error && <p className="text-red-400 text-[10px] font-bold bg-red-400/10 p-4 rounded-xl max-w-xs">{error}</p>}
      </div>

      <button onClick={onCancel} className="absolute bottom-12 w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20 hover:scale-110 active:scale-95 transition-all">
        <X size={28} />
      </button>
    </div>
  );
};

const StampCard: React.FC<{ block: NFCBlock, configId: string }> = ({ block, configId }) => {
  const slots = block.settings?.slots || 10;
  const storageKey = `nfec_stamps_${configId}_${block.id}`;
  
  const [stamps, setStamps] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [lastAction, setLastAction] = useState<'success' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const count = parseInt(saved);
      setStamps(count);
      if (count >= slots) setIsFull(true);
    }
  }, [storageKey, slots]);

  const addStamp = () => {
    const newCount = stamps + 1;
    setStamps(newCount);
    setLastAction('success');
    localStorage.setItem(storageKey, newCount.toString());
    
    setTimeout(() => setLastAction(null), 2000);
    if (newCount >= slots) setIsFull(true);
    setShowScanner(false);
  };

  const handleQRScan = (scannedValue: string) => {
    const secret = block.settings?.secretKey || 'NUDAIM-STAMP-123';
    if (scannedValue === secret) {
      addStamp();
    } else {
      alert("Falscher QR-Code! Bitte scanne das Original im Laden.");
      setShowScanner(false);
    }
  };

  const resetCard = () => {
    if (confirm("Möchtest du deine volle Karte einlösen?")) {
      setStamps(0);
      setIsFull(false);
      localStorage.setItem(storageKey, '0');
    }
  };

  // Notfall-Option für Personal: Titel lange gedrückt halten
  const [holdTimer, setHoldTimer] = useState<any>(null);
  const handleAdminStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Verhindert das Öffnen der Kamera beim Admin-Longpress
    setHoldTimer(setTimeout(() => { if(confirm("Admin-Modus: Manuellen Stempel hinzufügen?")) addStamp(); }, 5000));
  };
  const handleAdminEnd = () => clearTimeout(holdTimer);

  return (
    <div 
      onClick={() => !isFull && setShowScanner(true)}
      className="bg-white p-8 rounded-[2.5rem] border border-navy/5 shadow-xl space-y-8 relative overflow-hidden transition-all duration-500 hover:shadow-2xl cursor-pointer active:scale-[0.98] group"
    >
      {isFull && (
        <div className="absolute inset-0 bg-petrol/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-white text-petrol rounded-full flex items-center justify-center mb-6 shadow-2xl animate-bounce">
              <Gift size={48} />
           </div>
           <h3 className="serif-headline text-3xl font-black text-white italic uppercase mb-2">Karte Voll!</h3>
           <p className="text-white/80 text-sm mb-8 leading-relaxed font-medium">{block.settings?.rewardText || 'Zeige diese Ansicht beim Personal vor, um dein Geschenk zu erhalten.'}</p>
           <button 
             onClick={(e) => { e.stopPropagation(); resetCard(); }} 
             className="w-full py-5 bg-white text-petrol rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-transform"
           >
             Belohnung Einlösen
           </button>
        </div>
      )}

      {/* Header Bereich */}
      <div className="flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-cream rounded-2xl flex items-center justify-center text-petrol shadow-inner relative group-hover:bg-petrol group-hover:text-white transition-all">
            <Award size={28} />
            {lastAction === 'success' && <Sparkles size={20} className="absolute -top-2 -right-2 text-action animate-bounce" />}
          </div>
          <div 
            onMouseDown={handleAdminStart} 
            onTouchStart={handleAdminStart} 
            onMouseUp={handleAdminEnd} 
            onTouchEnd={handleAdminEnd}
            className="pointer-events-auto"
          >
            <h3 className="font-black text-navy text-[12px] uppercase tracking-widest">{block.title || 'Treuekarte'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-tight">{stamps} von {slots} gesammelt</p>
              <div className="w-1 h-1 rounded-full bg-petrol/20" />
              <div className="text-[10px] text-petrol font-black animate-pulse">AKTIV</div>
            </div>
          </div>
        </div>
        <div className="text-zinc-200 group-hover:text-petrol transition-colors">
          <QrCode size={24} />
        </div>
      </div>

      {/* Grid Bereich */}
      <div className="grid grid-cols-5 gap-4 p-2 relative">
        <div className="absolute inset-0 bg-petrol/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-dashed border-petrol/10 -m-2" />
        
        {Array.from({ length: slots }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-700 relative ${
            i < stamps 
            ? 'bg-petrol border-petrol shadow-lg shadow-petrol/20 scale-100' 
            : 'bg-cream border-navy/5 scale-90 opacity-40 group-hover:opacity-100 group-hover:scale-100 group-hover:border-petrol/20'
          }`}>
            {i < stamps ? (
              <Check className="text-white animate-in zoom-in duration-500" size={18} strokeWidth={4} />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-navy/20 group-hover:bg-petrol/30" />
            )}
            
            {/* Puls-Effekt für den nächsten Slot */}
            {i === stamps && !isFull && (
              <div className="absolute inset-0 border-2 border-petrol/50 rounded-2xl animate-ping opacity-20" />
            )}
          </div>
        ))}
      </div>

      {/* Hilfe-Text / CTA */}
      <div className="text-center space-y-4 pt-2">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 group-hover:text-petrol/60 transition-colors">Tippe auf die Karte zum Scannen</p>
        <div className="w-full py-5 bg-navy text-white rounded-[2rem] flex items-center justify-center gap-4 group-hover:bg-petrol transition-all shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <QrCode size={20} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Punkte sammeln</span>
        </div>
      </div>

      {showScanner && <QRScanner onScan={handleQRScan} onCancel={() => setShowScanner(false)} />}
    </div>
  );
};

const BlockRenderer: React.FC<{ block: NFCBlock, configId: string }> = ({ block, configId }) => {
  if (block.type === 'text') {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-navy/5 shadow-sm space-y-2">
        {block.title && <h3 className="font-black text-navy text-[11px] uppercase tracking-widest">{block.title}</h3>}
        <p className="text-sm text-zinc-500 leading-relaxed font-medium">{block.content}</p>
      </div>
    );
  }

  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className="rounded-[2.5rem] overflow-hidden border border-navy/5 shadow-lg group">
        <img src={block.imageUrl} alt={block.title} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
        {block.title && <div className="p-4 bg-white text-center font-bold text-[10px] uppercase tracking-widest border-t">{block.title}</div>}
      </div>
    );
  }

  if (block.type === 'magic_button') {
    if (block.buttonType === 'stamp_card') {
      return <StampCard block={block} configId={configId} />;
    }

    const getIcon = () => {
      switch (block.buttonType) {
        case 'wifi': return <Wifi className="text-blue-500" />;
        case 'review': return <Star className="text-yellow-500" />;
        case 'social_loop': return <Instagram className="text-pink-500" />;
        default: return <LinkIcon className="text-zinc-400" />;
      }
    };

    const handleAction = () => {
      if (block.buttonType === 'wifi') {
        alert(`WLAN Login:\nSSID: ${block.content}\nPasswort: ${block.settings?.password || 'Siehe Vorort'}`);
      } else if (block.content.startsWith('http')) {
        window.open(block.content, '_blank');
      } else {
        alert(`${block.title}\nInfo: ${block.content}`);
      }
    };

    return (
      <button 
        onClick={handleAction}
        className="w-full bg-white p-6 rounded-[2rem] border border-navy/5 shadow-sm flex items-center gap-6 hover:scale-[1.02] active:scale-[0.98] transition-all group"
      >
        <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center group-hover:bg-navy/5 transition-colors border border-navy/5">
          {getIcon()}
        </div>
        <div className="text-left">
          <p className="font-black text-navy text-[12px] uppercase tracking-widest">{block.title || block.buttonType}</p>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-1 opacity-60">Antippen zum Öffnen</p>
        </div>
      </button>
    );
  }

  return null;
};

export const Microsite: React.FC<MicrositeProps> = ({ config, error }) => {
  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id') || 'preview';

  if (error) {
    return (
      <div className="h-screen w-screen bg-cream flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8 shadow-xl">
          <AlertTriangle size={48} />
        </div>
        <h2 className="serif-headline text-4xl font-black italic uppercase mb-4 text-navy">Ups!</h2>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed mb-10 font-medium">{error.msg}</p>
        <button 
          onClick={() => window.location.href = window.location.origin + window.location.pathname} 
          className="flex items-center gap-4 px-10 py-5 bg-navy text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-petrol transition-all shadow-2xl"
        >
          <ArrowLeft size={18} /> Zurück zum Studio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cream text-navy selection:bg-petrol selection:text-white animate-in fade-in duration-700 overflow-x-hidden pb-40">
      {/* Header Profile */}
      <header className="pt-24 pb-16 px-8 flex flex-col items-center text-center space-y-8">
        <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-navy/5 relative group overflow-hidden ring-8 ring-white/50">
           <div className="absolute inset-0 bg-petrol/5 rounded-[2.5rem] animate-pulse group-hover:opacity-0 transition-opacity" />
           <ShieldCheck size={48} className="text-petrol relative z-10" />
        </div>
        <div className="space-y-3">
          <h1 className="serif-headline text-5xl font-black italic uppercase tracking-tight leading-none">NUDAIM NFeC</h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-petrol/20" />
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-petrol/60">Authentic Digital ID</p>
            <div className="h-px w-8 bg-petrol/20" />
          </div>
        </div>
      </header>

      {/* Content Feed */}
      <main className="max-w-md mx-auto px-6 space-y-6">
        {config.nfcBlocks.length > 0 ? (
          config.nfcBlocks.map(block => (
            <BlockRenderer key={block.id} block={block} configId={currentId} />
          ))
        ) : (
          <div className="text-center py-24 opacity-20 italic font-black uppercase tracking-widest text-xs">Profil wird geladen...</div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-cream via-cream to-transparent pointer-events-none z-50">
        <div className="max-w-md mx-auto flex flex-col items-center pointer-events-auto">
          <button 
            onClick={() => window.location.href = window.location.origin + window.location.pathname}
            className="bg-navy text-white px-10 py-5 rounded-full shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform hover:bg-petrol ring-4 ring-white/20"
          >
            <Smartphone size={18} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Eigene NFeC erstellen</span>
          </button>
          <div className="mt-6 flex flex-col items-center gap-1 opacity-30">
             <p className="text-[9px] font-black uppercase tracking-[0.5em] text-navy">NUDAIM3D STUDIO</p>
             <div className="h-0.5 w-10 bg-petrol rounded-full" />
          </div>
        </div>
      </footer>
    </div>
  );
};
