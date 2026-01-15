
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Wifi, Star, Globe, Link as LinkIcon, AlertTriangle, ShieldCheck, Award, Check, Gift, QrCode, X, MessageCircle, ShoppingCart, Info, User, Mail, Phone, Briefcase, MapPin, Instagram, Utensils, Shield, Camera, Dumbbell, Heart, Zap, Map as MapIcon, Clock, Calendar } from 'lucide-react';
import { ModelConfig, NFCBlock, ActionIcon } from '../types';
import jsQR from 'jsqr';

interface MicrositeProps {
  config: ModelConfig;
  error?: { title: string, msg: string } | null;
}

const getLucideIcon = (name?: ActionIcon, size = 20) => {
  switch (name) {
    case 'globe': return <Globe size={size} />;
    case 'shopping-cart': return <ShoppingCart size={size} />;
    case 'info': return <Info size={size} />;
    case 'briefcase': return <Briefcase size={size} />;
    case 'user': return <User size={size} />;
    case 'star': return <Star size={size} />;
    case 'mail': return <Mail size={size} />;
    case 'phone': return <Phone size={size} />;
    case 'instagram': return <Instagram size={size} />;
    case 'utensils': return <Utensils size={size} />;
    case 'shield': return <Shield size={size} />;
    case 'camera': return <Camera size={size} />;
    case 'dumbbell': return <Dumbbell size={size} />;
    case 'heart': return <Heart size={size} />;
    case 'zap': return <Zap size={size} />;
    case 'map': return <MapIcon size={size} />;
    case 'clock': return <Clock size={size} />;
    case 'calendar': return <Calendar size={size} />;
    default: return <LinkIcon size={size} />;
  }
};

const QRScanner: React.FC<{ onScan: (code: string) => void, onCancel: () => void }> = ({ onScan, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) { setError("Kamera-Zugriff verweigert."); }
    };
    const tick = () => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if(video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight; canvas.width = video.videoWidth;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
            if (code) { onScan(code.data); return; }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    startCamera();
    return () => { cancelAnimationFrame(animationFrameId); stream?.getTracks().forEach(t => t.stop()); };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-6 pointer-events-auto">
      <div className="relative w-full aspect-square max-w-sm rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <button onClick={onCancel} className="absolute bottom-12 w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20"><X size={28} /></button>
    </div>
  );
};

const StampCard: React.FC<{ block: NFCBlock, configId: string, accentColor: string }> = ({ block, configId, accentColor }) => {
  const slots = block.settings?.slots || 10;
  const [stamps, setStamps] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`stamps_${configId}_${block.id}`);
    if (saved) { setStamps(parseInt(saved)); if (parseInt(saved) >= slots) setIsFull(true); }
  }, []);

  const addStamp = () => {
    const n = stamps + 1; setStamps(n); localStorage.setItem(`stamps_${configId}_${block.id}`, n.toString());
    if (n >= slots) setIsFull(true); setShowScanner(false);
  };

  return (
    <div onClick={() => !isFull && setShowScanner(true)} className="bg-white p-8 rounded-[2.5rem] border border-navy/5 shadow-xl space-y-8 relative overflow-hidden pointer-events-auto">
      {isFull && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center text-white animate-in zoom-in duration-500" style={{ backgroundColor: `${accentColor}f2`, backdropFilter: 'blur(8px)' }}>
           <Gift size={48} className="mb-4 animate-bounce" />
           <h3 className="serif-headline text-3xl font-black italic uppercase mb-2">Karte Voll!</h3>
           <button onClick={(e) => { e.stopPropagation(); setStamps(0); setIsFull(false); localStorage.setItem(`stamps_${configId}_${block.id}`, '0'); }} className="px-8 py-3 bg-white text-navy rounded-xl font-bold uppercase text-[10px]">Neu starten</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cream rounded-xl flex items-center justify-center" style={{ color: accentColor }}><Award size={24}/></div>
          <div><h3 className="font-black text-navy text-xs uppercase tracking-widest">{block.title || 'Treuekarte'}</h3></div>
        </div>
        <QrCode size={20} className="text-zinc-200" />
      </div>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: slots }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${i < stamps ? 'border-transparent text-white shadow-lg' : 'bg-cream border-navy/5 text-zinc-200'}`} style={{ backgroundColor: i < stamps ? accentColor : undefined }}>
            {i < stamps ? <Check size={16} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
          </div>
        ))}
      </div>
      {showScanner && <QRScanner onScan={(v) => v === block.settings?.secretKey && addStamp()} onCancel={() => setShowScanner(false)} />}
    </div>
  );
};

export const BlockRenderer: React.FC<{ block: NFCBlock, configId: string, accentColor: string, theme: string }> = ({ block, configId, accentColor, theme }) => {
  const isDark = theme === 'dark';
  
  if (block.type === 'headline') {
    return (
      <div className="py-4 text-center">
        <h2 className={`serif-headline text-3xl font-black italic uppercase tracking-tight`} style={{ color: isDark ? '#fff' : accentColor }}>
          {block.content}
        </h2>
        {block.title && <p className="text-[10px] font-black uppercase text-zinc-400 mt-2 tracking-widest">{block.title}</p>}
      </div>
    );
  }

  if (block.type === 'spacer') {
    return <div style={{ height: `${block.settings?.height || 20}px` }} />;
  }

  if (block.type === 'map' && block.settings?.address) {
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(block.settings.address)}`;
    // Note: In real app, you'd need an API key. Using a placeholder or static image logic for now.
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-4 rounded-[2.5rem] border shadow-sm pointer-events-auto`}>
        {block.title && <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest mb-4 px-2`}>{block.title}</h3>}
        <div className="w-full h-48 bg-cream rounded-2xl flex flex-col items-center justify-center text-zinc-300 gap-2 border border-navy/5 overflow-hidden">
           <MapIcon size={32} />
           <span className="text-[9px] font-black uppercase text-center px-6 leading-tight">{block.settings.address}</span>
        </div>
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-7 rounded-[2rem] border shadow-sm space-y-2 pointer-events-auto text-center`}>
        {block.title && <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest`}>{block.title}</h3>}
        <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} text-sm leading-relaxed font-medium whitespace-pre-line`}>{block.content}</p>
      </div>
    );
  }

  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className="rounded-[2.5rem] overflow-hidden border border-navy/5 shadow-lg pointer-events-auto relative group">
        <img src={block.imageUrl} alt={block.title} className="w-full h-auto" />
        {block.title && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6"><p className="text-white text-xs font-black uppercase tracking-widest">{block.title}</p></div>}
      </div>
    );
  }

  if (block.type === 'magic_button') {
    if (block.buttonType === 'stamp_card') return <StampCard block={block} configId={configId} accentColor={accentColor} />;

    const handleAction = () => {
      if (block.buttonType === 'wifi') {
        if(block.settings?.password) {
          navigator.clipboard.writeText(block.settings.password);
          alert(`Passwort kopiert! Verbinde dich mit: ${block.settings.ssid}`);
        }
      } else if (block.buttonType === 'whatsapp') {
        const cleanPhone = block.content.replace(/[^\d+]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
      } else if (block.buttonType === 'instagram') {
        const content = block.content;
        const url = content.startsWith('http') ? content : `https://instagram.com/${content.replace('@', '')}`;
        window.open(url, '_blank');
      } else {
        const url = block.content;
        if(url && (url.startsWith('http') || url.startsWith('https'))) window.open(url, '_blank');
      }
    };

    const isReview = block.buttonType === 'review';
    const isGoogle = block.buttonType === 'google_profile';
    const isWhatsApp = block.buttonType === 'whatsapp';
    const isInstagram = block.buttonType === 'instagram';
    const isWiFi = block.buttonType === 'wifi';

    return (
      <button 
        onClick={(e) => { e.stopPropagation(); handleAction(); }}
        className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} w-full p-7 rounded-[2.5rem] border shadow-sm flex items-center gap-6 hover:scale-[1.02] transition-all pointer-events-auto 
          ${isReview ? 'border-yellow-100 shadow-yellow-500/5' : 
            isGoogle ? 'border-red-100' : 
            isWhatsApp ? 'border-emerald-100' :
            isInstagram ? 'border-pink-100' :
            isWiFi ? 'border-blue-100' : ''}`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors 
          ${isReview ? 'bg-yellow-50 text-yellow-500' : 
            isGoogle ? 'bg-red-50 text-red-500' : 
            isWhatsApp ? 'bg-emerald-50 text-emerald-500' :
            isInstagram ? 'bg-pink-50 text-pink-500' :
            isWiFi ? 'bg-blue-50 text-blue-500' : 'bg-cream'}`}
          style={(!isReview && !isGoogle && !isWhatsApp && !isInstagram && !isWiFi) ? { color: accentColor } : {}}>
           {isReview ? <Star size={32} fill="currentColor" /> : 
            isGoogle ? <MapPin size={32} /> : 
            isWhatsApp ? <MessageCircle size={32} /> :
            isInstagram ? <Instagram size={32} /> :
            isWiFi ? <Wifi size={32} /> :
            getLucideIcon(block.settings?.icon, 28)}
        </div>
        <div className="text-left flex-1">
          <p className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[12px] uppercase tracking-widest`}>
            {block.title || (isGoogle ? 'Google Profil' : isWhatsApp ? 'WhatsApp' : isInstagram ? 'Instagram' : isWiFi ? 'Wi-Fi Connect' : block.buttonType)}
          </p>
          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight mt-1 opacity-70">
            {isWiFi ? 'Passwort kopieren' : 'Antippen zum Öffnen'}
          </p>
        </div>
        {isReview && <div className="flex gap-0.5"><Star size={10} fill="#EAB308" className="text-yellow-500" /> <Star size={10} fill="#EAB308" className="text-yellow-500" /> <Star size={10} fill="#EAB308" className="text-yellow-500" /></div>}
      </button>
    );
  }
  return null;
};

export const Microsite: React.FC<MicrositeProps> = ({ config, error }) => {
  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id') || 'preview';
  const isDark = config.theme === 'dark';

  const fontClass = config.fontStyle === 'luxury' ? 'font-serif' : config.fontStyle === 'elegant' ? 'serif-headline' : 'font-sans';

  if (error) {
    return (
      <div className="min-h-screen w-full bg-cream flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="serif-headline text-3xl font-black italic uppercase mb-2">Profil nicht aktiv</h2>
        <p className="text-zinc-500 text-sm">{error.msg}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${isDark ? 'bg-zinc-950 text-white' : 'bg-cream text-navy'} selection:bg-petrol pb-40 flex flex-col items-center overflow-y-auto ${fontClass}`}>
      <header className="pt-20 pb-12 px-8 flex flex-col items-center text-center space-y-6 w-full relative">
        {config.headerImageUrl && (
          <div className="absolute top-0 left-0 w-full h-72 z-0">
             <img src={config.headerImageUrl} className="w-full h-full object-cover opacity-50 blur-md scale-110" alt="Header Blur" />
             <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${isDark ? 'to-zinc-950' : 'to-cream'}`} />
          </div>
        )}
        
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-navy/5 relative z-10 mt-12">
           <div style={{ color: config.accentColor }}>
              {getLucideIcon(config.profileIcon, 44)}
           </div>
        </div>
        <h1 className="serif-headline text-4xl font-black italic uppercase tracking-tight relative z-10 leading-tight px-6" style={{ color: isDark ? '#fff' : config.accentColor }}>
            {config.profileTitle}
        </h1>
      </header>

      <main className="max-w-md w-full px-6 space-y-6 flex-1 relative z-10">
        {config.nfcBlocks.map(block => (
          <BlockRenderer key={block.id} block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
        ))}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 flex justify-center pointer-events-none z-[100]">
        <button 
          onClick={() => window.location.href = window.location.origin + window.location.pathname}
          className="px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:bg-petrol transition-all pointer-events-auto font-black text-[10px] uppercase tracking-widest ring-4 ring-black/5"
          style={{ backgroundColor: config.accentColor, color: '#fff' }}
        >
          <Smartphone size={16} />
          <span>Eigene NFeC erstellen</span>
        </button>
      </footer>
    </div>
  );
};
