
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Wifi, Star, Globe, Link as LinkIcon, AlertTriangle, Award, Check, Gift, QrCode, X, MessageCircle, ShoppingCart, Info, User, Mail, Phone, Briefcase, MapPin, Instagram, Utensils, Shield, Camera, Dumbbell, Heart, Zap, Map as MapIcon, Clock, Calendar, CreditCard, Youtube, Video, Music } from 'lucide-react';
import { ModelConfig, NFCBlock, ActionIcon } from '../types';
import jsQR from 'jsqr';
import { showError } from '../lib/utils';
import { isValidEmail } from '../lib/validation';

interface MicrositeProps {
  config: ModelConfig;
  error?: { title: string, msg: string } | null;
  /** Logo-URL von Google (Profilbild) – wird verwendet, wenn gesetzt. */
  googleLogoUrl?: string | null;
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
    case 'youtube': return <Youtube size={size} />;
    case 'video': return <Video size={size} />;
    case 'music': return <Music size={size} />;
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
    <div className="fixed inset-0 z-[400] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="relative w-full aspect-square max-w-sm rounded-[3rem] overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 z-10 border-2 border-action/30 rounded-[2.8rem] m-4">
           <div className="absolute top-0 left-0 right-0 h-[2px] bg-action shadow-[0_0_15px_#12A9E0] animate-scan" />
        </div>
      </div>
      <div className="mt-8 text-center space-y-2">
         <p className="text-white font-black text-xs uppercase tracking-[0.2em]">Scan QR-Code</p>
         <p className="text-white/40 text-[10px] uppercase font-bold">Bestätige deine Treue-Stempel</p>
      </div>
      <button onClick={onCancel} className="absolute bottom-12 w-20 h-20 bg-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all"><X size={32} /></button>
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
    <div onClick={() => !isFull && setShowScanner(true)} className="bg-white p-8 rounded-[2.5rem] border border-navy/5 shadow-xl space-y-8 relative overflow-hidden pointer-events-auto hover:shadow-2xl transition-all active:scale-[0.98] group">
      {isFull && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center text-white animate-in zoom-in duration-500" style={{ backgroundColor: `${accentColor}f2`, backdropFilter: 'blur(12px)' }}>
           <Gift size={48} className="mb-4 animate-bounce" />
           <h3 className="font-headline text-3xl font-extrabold uppercase tracking-tight mb-2">Karte Voll!</h3>
           <p className="text-[10px] font-bold uppercase tracking-widest mb-6 opacity-80">Glückwunsch zum Reward</p>
           <button onClick={(e) => { e.stopPropagation(); setStamps(0); setIsFull(false); localStorage.setItem(`stamps_${configId}_${block.id}`, '0'); }} className="px-8 py-3 bg-white text-navy rounded-xl font-black uppercase text-[10px] hover:shadow-lg transition-all">Neu starten</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cream rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ color: accentColor }}><Award size={24}/></div>
          <div>
             <h3 className="font-black text-navy text-[11px] uppercase tracking-widest">{block.title || 'Treuekarte'}</h3>
             <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">{stamps} von {slots} Stempeln</p>
          </div>
        </div>
        <QrCode size={20} className="text-zinc-200 group-hover:text-action transition-colors" />
      </div>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: slots }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${i < stamps ? 'border-transparent text-white shadow-lg scale-105' : 'bg-cream border-navy/5 text-zinc-200'}`} style={{ backgroundColor: i < stamps ? accentColor : undefined }}>
            {i < stamps ? <Check size={16} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />}
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
      <div className="py-6 text-center animate-in slide-in-from-bottom-4 duration-700">
        <h2 className={`font-headline text-4xl font-extrabold uppercase tracking-tight`} style={{ color: isDark ? '#fff' : accentColor }}>
          {block.content}
        </h2>
        {block.title && <p className="text-[10px] font-black uppercase text-zinc-400 mt-2 tracking-[0.3em]">{block.title}</p>}
      </div>
    );
  }

  if (block.type === 'spacer') {
    return <div style={{ height: `${block.settings?.height || 20}px` }} />;
  }

  if (block.type === 'map' && block.settings?.address) {
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-4 rounded-[2.5rem] border shadow-sm pointer-events-auto hover:shadow-xl transition-all animate-in fade-in duration-500`}>
        {block.title && <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest mb-4 px-2`}>{block.title}</h3>}
        <div className="w-full h-48 bg-zinc-50 rounded-2xl flex flex-col items-center justify-center text-zinc-300 gap-2 border border-navy/5 overflow-hidden relative group cursor-pointer" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(block.settings?.address || '')}`, '_blank')}>
           <MapIcon size={32} className="group-hover:scale-110 transition-transform" />
           <span className="text-[9px] font-black uppercase text-center px-6 leading-tight max-w-[200px]">{block.settings.address}</span>
           <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/5 transition-colors" />
        </div>
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-8 rounded-[2.5rem] border shadow-sm space-y-3 pointer-events-auto text-center animate-in fade-in duration-500`}>
        {block.title && <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest`}>{block.title}</h3>}
        <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} text-[13px] leading-relaxed font-medium whitespace-pre-line`}>{block.content}</p>
      </div>
    );
  }

  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className="rounded-[2.5rem] overflow-hidden border border-navy/5 shadow-lg pointer-events-auto relative group animate-in zoom-in duration-500">
        <img src={block.imageUrl} alt={block.title} className="w-full h-auto group-hover:scale-105 transition-transform duration-700" />
        {block.title && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-8"><p className="text-white text-[11px] font-black uppercase tracking-widest">{block.title}</p></div>}
      </div>
    );
  }

  if (block.type === 'magic_button') {
    if (block.buttonType === 'stamp_card') return <StampCard block={block} configId={configId} accentColor={accentColor} />;

    const handleAction = () => {
      const type = block.buttonType;
      const content = block.content;

      if (type === 'wifi') {
        if (block.settings?.password) {
          navigator.clipboard.writeText(block.settings.password);
          showError(`Verbinde dich mit: ${block.settings?.ssid ?? 'WLAN'}`, 'WiFi-Passwort kopiert');
        }
      } else if (type === 'whatsapp') {
        const cleanPhone = content.replace(/[^\d+]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
      } else if (type === 'instagram') {
        const url = content.startsWith('http') ? content : `https://instagram.com/${content.replace('@', '')}`;
        window.open(url, '_blank');
      } else if (type === 'tiktok') {
        const url = content.startsWith('http') ? content : `https://tiktok.com/@${content.replace('@', '')}`;
        window.open(url, '_blank');
      } else if (type === 'linkedin') {
        const url = content.startsWith('http') ? content : `https://linkedin.com/in/${content}`;
        window.open(url, '_blank');
      } else if (type === 'youtube') {
        const url = content.startsWith('http') ? content : `https://youtube.com/@${content}`;
        window.open(url, '_blank');
      } else if (type === 'booking' || type === 'review' || type === 'google_profile' || type === 'custom_link') {
        if (!content) {
          showError('Bitte gib einen Link ein.');
          return;
        }
        try {
          const url = content.startsWith('http') ? content : `https://${content}`;
          const urlObj = new URL(url);
          window.open(urlObj.toString(), '_blank');
        } catch {
          showError('Bitte prüfe die Eingabe.', 'Ungültiger Link');
        }
      } else if (type === 'email') {
        if (!content || !isValidEmail(content)) {
          showError('Bitte gib eine gültige E-Mail-Adresse ein.');
          return;
        }
        window.open(`mailto:${content}`, '_blank');
      } else if (type === 'phone') {
        if (!content) {
          showError('Bitte gib eine Telefonnummer ein.');
          return;
        }
        window.open(`tel:${content}`, '_blank');
      } else if (type === 'action_card') {
        showError(
          `Tel: ${block.settings?.phone ?? 'Keine'}\nMail: ${block.content ?? 'Keine'}\n\nPosition: ${block.settings?.description ?? 'N/A'}`,
          `Kontakt: ${block.settings?.name ?? 'Unbekannt'}`
        );
      }
    };

    const isSocial = ['instagram', 'tiktok', 'linkedin', 'youtube', 'whatsapp'].includes(block.buttonType || '');
    const isTool = ['wifi', 'booking', 'email', 'phone', 'action_card', 'review', 'google_profile'].includes(block.buttonType || '');

    const getColors = () => {
      switch(block.buttonType) {
        case 'instagram': return 'bg-pink-50 text-pink-500 border-pink-100';
        case 'tiktok': return 'bg-zinc-900 text-white border-zinc-800';
        case 'whatsapp': return 'bg-emerald-50 text-emerald-500 border-emerald-100';
        case 'linkedin': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'youtube': return 'bg-red-50 text-red-600 border-red-100';
        case 'wifi': return 'bg-sky-50 text-sky-500 border-sky-100';
        case 'review': return 'bg-yellow-50 text-yellow-500 border-yellow-100';
        case 'action_card': return 'bg-indigo-50 text-indigo-500 border-indigo-100';
        default: return isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5';
      }
    };

    return (
      <button 
        onClick={(e) => { e.stopPropagation(); handleAction(); }}
        className={`${getColors()} w-full p-6 rounded-[2.5rem] border shadow-sm flex items-center gap-6 hover:scale-[1.02] active:scale-[0.98] transition-all pointer-events-auto animate-in slide-in-from-right duration-500`}
      >
        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-sm`}>
           {block.buttonType === 'instagram' && <Instagram size={32} />}
           {block.buttonType === 'tiktok' && <Music size={32} />}
           {block.buttonType === 'whatsapp' && <MessageCircle size={32} />}
           {block.buttonType === 'linkedin' && <Briefcase size={32} />}
           {block.buttonType === 'youtube' && <Youtube size={32} />}
           {block.buttonType === 'wifi' && <Wifi size={32} />}
           {block.buttonType === 'review' && <Star size={32} fill="currentColor" />}
           {block.buttonType === 'google_profile' && <MapPin size={32} />}
           {block.buttonType === 'action_card' && <CreditCard size={32} />}
           {block.buttonType === 'phone' && <Phone size={32} />}
           {block.buttonType === 'email' && <Mail size={32} />}
           {block.buttonType === 'booking' && <Calendar size={32} />}
           {block.buttonType === 'custom_link' && getLucideIcon(block.settings?.icon, 28)}
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className={`${isDark && block.buttonType !== 'tiktok' ? 'text-white' : 'font-black'} text-[12px] uppercase tracking-widest truncate`}>
            {block.title || block.buttonType}
          </p>
          <p className="text-[9px] opacity-60 font-bold uppercase tracking-widest mt-1">
            {block.buttonType === 'wifi' ? `SSID: ${block.settings?.ssid || '...'}` : 'Antippen zum Öffnen'}
          </p>
        </div>
      </button>
    );
  }
  return null;
};

export const Microsite: React.FC<MicrositeProps> = ({ config, error, googleLogoUrl }) => {
  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id') || 'preview';
  const isDark = config.theme === 'dark';
  const template = config.nfcTemplate || 'modern';
  const fontClass = config.fontStyle === 'luxury' ? 'font-sans font-medium' : config.fontStyle === 'elegant' ? 'font-headline' : 'font-sans';

  if (error) {
    return (
      <div className="min-h-screen w-full bg-cream flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="bg-red-50 p-10 rounded-[3rem] border border-red-100 shadow-2xl space-y-6">
           <AlertTriangle size={64} className="text-red-500 mx-auto animate-bounce" />
           <div className="space-y-2">
              <h2 className="font-headline text-3xl font-extrabold uppercase tracking-tight">Profil inaktiv</h2>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">{error.msg}</p>
           </div>
           <button onClick={() => window.location.reload()} className="px-8 py-3 bg-navy text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Erneut versuchen</button>
        </div>
      </div>
    );
  }

  const isMinimal = template === 'minimal';

  return (
    <div className={`min-h-screen w-full ${isDark ? 'bg-zinc-950 text-white' : 'bg-cream text-navy'} selection:bg-petrol pb-40 flex flex-col items-center overflow-y-auto overflow-x-hidden ${fontClass}`}>
      <header className={`px-8 flex flex-col items-center text-center w-full relative transition-all duration-700 ${isMinimal ? 'pt-12 pb-8' : 'pt-24 pb-16'}`}>
        {config.headerImageUrl && (
          <div className="absolute top-0 left-0 w-full h-80 z-0 overflow-hidden">
             <img src={config.headerImageUrl} className="w-full h-full object-cover opacity-60 blur-2xl scale-125" alt="Header Blur" />
             <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent ${isDark ? 'to-zinc-950' : 'to-cream'}`} />
          </div>
        )}
        
        <div className={`bg-white shadow-xl flex items-center justify-center border border-navy/5 relative z-10 animate-in zoom-in duration-1000 overflow-hidden
          ${isMinimal ? 'w-20 h-20 rounded-2xl' : 'w-28 h-28 rounded-[2.8rem]'}`}>
           {(googleLogoUrl || config.profileLogoUrl) ? (
             <img src={googleLogoUrl || config.profileLogoUrl} alt="" className="w-full h-full object-cover object-center" />
           ) : (
             <div style={{ color: config.accentColor }}>
                {getLucideIcon(config.profileIcon, isMinimal ? 32 : 48)}
             </div>
           )}
        </div>
        
        <div className={`space-y-4 relative z-10 ${isMinimal ? 'mt-6' : 'mt-8'}`}>
           <h1 className={`font-headline font-extrabold uppercase tracking-tight leading-tight px-6 animate-in slide-in-from-top-4 duration-700 transition-all
             ${isMinimal ? 'text-3xl' : 'text-5xl'}`} style={{ color: isDark ? '#fff' : config.accentColor }}>
               {config.profileTitle}
           </h1>
           {!isMinimal && (
             <div className="flex items-center justify-center gap-2">
                <span className="w-8 h-[1px] bg-zinc-300" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40">NFeC Verified</span>
                <span className="w-8 h-[1px] bg-zinc-300" />
             </div>
           )}
        </div>
      </header>

      <main className="max-w-md w-full px-6 flex-1 relative z-10 space-y-6">
        {config.nfcBlocks.map(block => (
          <BlockRenderer key={block.id} block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
        ))}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 flex justify-center pointer-events-none z-[200]">
        <button 
          onClick={() => window.location.href = window.location.origin}
          className="px-10 py-5 rounded-full shadow-2xl flex items-center gap-4 hover:scale-105 transition-all pointer-events-auto font-black text-[11px] uppercase tracking-[0.2em] active:scale-95 group"
          style={{ backgroundColor: config.accentColor, color: '#fff' }}
        >
          <Smartphone size={18} />
          <span>Eigene NFeC erstellen</span>
        </button>
      </footer>
    </div>
  );
};
