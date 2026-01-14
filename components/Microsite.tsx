
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
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            requestAnimationFrame(tick);
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Kamera-Zugriff verweigert oder blockiert.");
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
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-300 pointer-events-auto">
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
        <p className="text-white font-black uppercase tracking-[0.3em] text-xs text-center">QR-Code scannen</p>
        {error && <p className="text-red-400 text-[10px] font-bold bg-red-400/10 p-4 rounded-xl max-w-xs">{error}</p>}
      </div>

      <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="absolute bottom-12 w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20 hover:scale-110 active:scale-95 transition-all">
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
      alert("Falscher QR-Code!");
      setShowScanner(false);
    }
  };

  const resetCard = () => {
    if (confirm("Einlösen?")) {
      setStamps(0);
      setIsFull(false);
      localStorage.setItem(storageKey, '0');
    }
  };

  const [holdTimer, setHoldTimer] = useState<any>(null);
  const handleAdminStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setHoldTimer(setTimeout(() => { if(confirm("Stempel hinzufügen?")) addStamp(); }, 5000));
  };
  const handleAdminEnd = () => clearTimeout(holdTimer);

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); if(!isFull) setShowScanner(true); }}
      className="bg-white p-8 rounded-[2.5rem] border border-navy/5 shadow-xl space-y-8 relative overflow-hidden transition-all duration-500 hover:shadow-2xl cursor-pointer active:scale-[0.98] group pointer-events-auto"
    >
      {isFull && (
        <div className="absolute inset-0 bg-petrol/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
           <Gift size={48} className="text-white mb-6 animate-bounce" />
           <h3 className="serif-headline text-3xl font-black text-white italic uppercase mb-2">Karte Voll!</h3>
           <button 
             onClick={(e) => { e.stopPropagation(); resetCard(); }} 
             className="w-full py-5 bg-white text-petrol rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-transform"
           >
             Einlösen
           </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-cream rounded-2xl flex items-center justify-center text-petrol shadow-inner relative group-hover:bg-petrol group-hover:text-white transition-all">
            <Award size={28} />
            {lastAction === 'success' && <Sparkles size={20} className="absolute -top-2 -right-2 text-action animate-bounce" />}
          </div>
          <div onMouseDown={handleAdminStart} onTouchStart={handleAdminStart} onMouseUp={handleAdminEnd} onTouchEnd={handleAdminEnd}>
            <h3 className="font-black text-navy text-[12px] uppercase tracking-widest">{block.title || 'Treuekarte'}</h3>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-tight">{stamps} / {slots} gesammelt</p>
          </div>
        </div>
        <QrCode size={24} className="text-zinc-200 group-hover:text-petrol transition-colors" />
      </div>

      <div className="grid grid-cols-5 gap-4 p-2">
        {Array.from({ length: slots }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${
            i < stamps 
            ? 'bg-petrol border-petrol shadow-lg scale-100' 
            : 'bg-cream border-navy/5 scale-90 opacity-40 group-hover:opacity-100'
          }`}>
            {i < stamps ? <Check className="text-white" size={18} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-navy/20" />}
          </div>
        ))}
      </div>

      <div className="text-center space-y-4 pt-2">
        <div className="w-full py-5 bg-navy text-white rounded-[2rem] flex items-center justify-center gap-4 group-hover:bg-petrol transition-all shadow-xl">
          <QrCode size={20} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Punkte scannen</span>
        </div>
      </div>

      {showScanner && <QRScanner onScan={handleQRScan} onCancel={() => setShowScanner(false)} />}
    </div>
  );
};

export const BlockRenderer: React.FC<{ block: NFCBlock, configId: string }> = ({ block, configId }) => {
  if (block.type === 'text') {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-navy/5 shadow-sm space-y-2 pointer-events-auto">
        {block.title && <h3 className="font-black text-navy text-[11px] uppercase tracking-widest">{block.title}</h3>}
        <p className="text-sm text-zinc-500 leading-relaxed font-medium">{block.content}</p>
      </div>
    );
  }

  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className="rounded-[2.5rem] overflow-hidden border border-navy/5 shadow-lg group pointer-events-auto">
        <img src={block.imageUrl} alt={block.title} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
      </div>
    );
  }

  if (block.type === 'magic_button') {
    if (block.buttonType === 'stamp_card') {
      return <StampCard block={block} configId={configId} />;
    }

    const handleAction = () => {
      if (block.buttonType === 'wifi') alert("WLAN Info...");
      else if (block.content.startsWith('http')) window.open(block.content, '_blank');
    };

    return (
      <button 
        onClick={(e) => { e.stopPropagation(); handleAction(); }}
        className="w-full bg-white p-6 rounded-[2rem] border border-navy/5 shadow-sm flex items-center gap-6 hover:scale-[1.02] active:scale-[0.98] transition-all group pointer-events-auto"
      >
        <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center group-hover:bg-navy/5 transition-colors border border-navy/5">
           <LinkIcon className="text-zinc-400" />
        </div>
        <div className="text-left">
          <p className="font-black text-navy text-[12px] uppercase tracking-widest">{block.title || block.buttonType}</p>
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
      <div className="min-h-screen w-screen bg-cream flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <AlertTriangle size={48} className="text-red-500 mb-8" />
        <h2 className="serif-headline text-4xl font-black italic uppercase mb-4 text-navy">Ups!</h2>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed mb-10 font-medium">{error.msg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cream text-navy selection:bg-petrol selection:text-white animate-in fade-in duration-700 overflow-y-auto overflow-x-hidden pb-40 flex flex-col items-center">
      <header className="pt-24 pb-16 px-8 flex flex-col items-center text-center space-y-8 w-full">
        <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-navy/5">
           <ShieldCheck size={48} className="text-petrol" />
        </div>
        <h1 className="serif-headline text-5xl font-black italic uppercase tracking-tight leading-none">NUDAIM NFeC</h1>
      </header>

      <main className="max-w-md w-full px-6 space-y-6 flex-1">
        {config.nfcBlocks.map(block => (
          <BlockRenderer key={block.id} block={block} configId={currentId} />
        ))}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-cream via-cream to-transparent pointer-events-none z-50">
        <div className="max-w-md mx-auto flex flex-col items-center pointer-events-auto">
          <button 
            onClick={() => window.location.href = window.location.origin + window.location.pathname}
            className="bg-navy text-white px-10 py-5 rounded-full shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform hover:bg-petrol"
          >
            <Smartphone size={18} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Eigene NFeC erstellen</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
