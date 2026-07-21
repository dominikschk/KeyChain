
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Wifi, Star, Globe, Link as LinkIcon, AlertTriangle, Award, Check, Gift, QrCode, X, MessageCircle, ShoppingCart, Info, User, Mail, Phone, Briefcase, MapPin, Instagram, Utensils, Shield, Camera, Dumbbell, Heart, Zap, Map as MapIcon, Clock, Calendar, CreditCard, Youtube, Video, Music } from 'lucide-react';
import { ModelConfig, NFCBlock, ActionIcon } from '../types';
import jsQR from 'jsqr';
import { showError } from '../lib/utils';
import { isValidEmail, toSafeHttpUrl } from '../lib/validation';
import { brandButtonStyle, resolveSurface } from '../lib/brandPalette';
import { fontClassFor, splitBlocksForLanding } from '../lib/siteLayouts';
import { parseFaqItems, parseGalleryUrls } from '../lib/contentBlocks';
import {
  alignClass,
  isProbablyOpenNow,
  normalizeAlign,
  parsePriceItems,
} from '../lib/sectionContent';
import { applyMicrositeShareMeta } from '../lib/shareMeta';
import { verifyStamp } from '../lib/configApi';
import { LegalFooter } from './LegalFooter';
import {
  buildSiteNavItems,
  filterBlocksForPage,
  navHrefForPage,
  resolveActivePage,
  type SitePageSlug,
} from '../lib/siteNav';

interface MicrositeProps {
  config: ModelConfig;
  error?: { title: string, msg: string } | null;
  /** Logo-URL von Google (Profilbild) – wird verwendet, wenn gesetzt. */
  googleLogoUrl?: string | null;
  /** In Phone-Vorschau: kein Fullscreen-Footer, kein min-h-screen */
  embedded?: boolean;
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
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`stamps_${configId}_${block.id}`);
    if (saved) { setStamps(parseInt(saved)); if (parseInt(saved) >= slots) setIsFull(true); }
  }, []);

  const addStamp = () => {
    const n = stamps + 1; setStamps(n); localStorage.setItem(`stamps_${configId}_${block.id}`, n.toString());
    if (n >= slots) setIsFull(true); setShowScanner(false);
  };

  const onScan = async (v: string) => {
    if (verifying) return;
    setVerifying(true);
    try {
      const ok = await verifyStamp(configId, block.id, v);
      if (ok) addStamp();
      else showError('Code ungültig');
    } finally {
      setVerifying(false);
      setShowScanner(false);
    }
  };

  return (
    <div onClick={() => !isFull && !verifying && setShowScanner(true)} className="bg-white p-8 rounded-[2.5rem] border border-navy/5 shadow-xl space-y-8 relative overflow-hidden pointer-events-auto hover:shadow-2xl transition-all active:scale-[0.98] group">
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
      {showScanner && <QRScanner onScan={(v) => { void onScan(v); }} onCancel={() => setShowScanner(false)} />}
    </div>
  );
};

export const BlockRenderer: React.FC<{ block: NFCBlock, configId: string, accentColor: string, theme: string }> = ({ block, configId, accentColor, theme }) => {
  const isDark = theme === 'dark';
  const align = normalizeAlign(block.settings?.align);
  const padY = Math.max(0, Math.min(80, Number(block.settings?.padY) || 0));
  const wrapStyle = padY ? { paddingTop: padY, paddingBottom: padY } : undefined;
  const alignCls = alignClass(align);
  const titleAlign =
    align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';

  if (block.type === 'headline') {
    if (!block.title && !block.content) return null;
    return (
      <div className={`py-2 ${alignCls} animate-in slide-in-from-bottom-2 duration-500`} style={wrapStyle}>
        {(block.title || block.content) && (
          <p className={`text-lg sm:text-xl font-medium leading-snug px-2 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            {block.title || block.content}
          </p>
        )}
        {block.title && block.content && block.content !== block.title && (
          <p className={`text-sm mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{block.content}</p>
        )}
      </div>
    );
  }

  if (block.type === 'spacer') {
    return <div style={{ height: `${block.settings?.height || 20}px` }} />;
  }

  if (block.type === 'map' && block.settings?.address) {
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-4 rounded-[2.5rem] border shadow-sm pointer-events-auto hover:shadow-xl transition-all animate-in fade-in duration-500`} style={wrapStyle}>
        {block.title && <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest mb-4 px-2 ${titleAlign}`}>{block.title}</h3>}
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
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-8 rounded-[2.5rem] border shadow-sm space-y-3 pointer-events-auto ${alignCls} animate-in fade-in duration-500`} style={wrapStyle}>
        {block.title && <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest`}>{block.title}</h3>}
        <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} text-[13px] leading-relaxed font-medium whitespace-pre-line`}>{block.content}</p>
      </div>
    );
  }

  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className="rounded-[2.5rem] overflow-hidden border border-navy/5 shadow-lg pointer-events-auto relative group animate-in zoom-in duration-500" style={wrapStyle}>
        <img src={block.imageUrl} alt={block.title || ''} className="w-full h-auto group-hover:scale-105 transition-transform duration-700" />
        {block.title && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-8"><p className="text-white text-[11px] font-black uppercase tracking-widest">{block.title}</p></div>}
      </div>
    );
  }

  if (block.type === 'faq') {
    const items = parseFaqItems(block.content || block.settings?.faqJson);
    if (!items.length) return null;
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-6 rounded-[2.5rem] border shadow-sm space-y-3 pointer-events-auto`} style={wrapStyle}>
        <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest px-1 ${titleAlign}`}>
          {block.title || 'FAQ'}
        </h3>
        <div className="space-y-2">
          {items.map((item, i) => (
            <details key={i} className={`${isDark ? 'bg-zinc-950/60' : 'bg-cream/80'} rounded-2xl px-4 py-3`}>
              <summary className={`${isDark ? 'text-zinc-100' : 'text-navy'} text-sm font-bold cursor-pointer list-none`}>
                {item.q || 'Frage'}
              </summary>
              <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-sm mt-2 leading-relaxed whitespace-pre-line`}>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === 'hours') {
    const text = (block.settings?.hoursText || block.content || '').trim();
    if (!text) return null;
    const openNow = isProbablyOpenNow(text);
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-6 rounded-[2.5rem] border shadow-sm space-y-3 pointer-events-auto ${alignCls}`} style={wrapStyle}>
        <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest`}>
          {block.title || 'Öffnungszeiten'}
        </h3>
        {openNow && (
          <span className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Jetzt geöffnet
          </span>
        )}
        <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-sm leading-relaxed whitespace-pre-line`}>
          {text}
        </p>
      </div>
    );
  }

  if (block.type === 'gallery') {
    const urls = parseGalleryUrls(block.settings?.galleryUrls || block.content);
    if (!urls.length) return null;
    return (
      <div className="space-y-3 pointer-events-auto" style={wrapStyle}>
        {block.title && (
          <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest ${titleAlign}`}>
            {block.title}
          </h3>
        )}
        <div className="grid grid-cols-2 gap-2">
          {urls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl overflow-hidden border border-navy/5 aspect-square bg-zinc-100"
            >
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === 'prices') {
    const items = parsePriceItems(block.content);
    if (!items.length) return null;
    return (
      <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-navy/5'} p-6 rounded-[2.5rem] border shadow-sm space-y-4 pointer-events-auto`} style={wrapStyle}>
        <h3 className={`${isDark ? 'text-white' : 'text-navy'} font-black text-[11px] uppercase tracking-widest ${titleAlign}`}>
          {block.title || 'Preise'}
        </h3>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 border-b border-navy/5 pb-2 last:border-0">
              <div className="min-w-0 text-left">
                <p className={`${isDark ? 'text-zinc-100' : 'text-navy'} text-sm font-bold truncate`}>{item.name}</p>
                {item.note && (
                  <p className={`${isDark ? 'text-zinc-500' : 'text-zinc-500'} text-xs mt-0.5`}>{item.note}</p>
                )}
              </div>
              <p className="text-sm font-black shrink-0" style={{ color: accentColor }}>
                {item.price}
              </p>
            </li>
          ))}
        </ul>
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
        const raw = content.startsWith('http') ? content : `https://instagram.com/${content.replace('@', '')}`;
        const url = toSafeHttpUrl(raw);
        if (!url) { showError('Ungültiger Link'); return; }
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (type === 'tiktok') {
        const raw = content.startsWith('http') ? content : `https://tiktok.com/@${content.replace('@', '')}`;
        const url = toSafeHttpUrl(raw);
        if (!url) { showError('Ungültiger Link'); return; }
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (type === 'linkedin') {
        const raw = content.startsWith('http') ? content : `https://linkedin.com/in/${content}`;
        const url = toSafeHttpUrl(raw);
        if (!url) { showError('Ungültiger Link'); return; }
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (type === 'youtube') {
        const raw = content.startsWith('http') ? content : `https://youtube.com/@${content}`;
        const url = toSafeHttpUrl(raw);
        if (!url) { showError('Ungültiger Link'); return; }
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (type === 'booking' || type === 'review' || type === 'google_profile' || type === 'custom_link') {
        if (!content) {
          showError('Bitte gib einen Link ein.');
          return;
        }
        const url = toSafeHttpUrl(content);
        if (!url) {
          showError('Bitte prüfe die Eingabe.', 'Ungültiger Link');
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
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
    const brand = brandButtonStyle(accentColor, isDark);

    return (
      <button 
        onClick={(e) => { e.stopPropagation(); handleAction(); }}
        className="w-full p-5 rounded-2xl border flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition-all pointer-events-auto animate-in slide-in-from-bottom-2 duration-400 shadow-sm"
        style={{ backgroundColor: brand.bg, borderColor: brand.border, color: brand.fg }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff', color: accentColor }}
        >
           {block.buttonType === 'instagram' && <Instagram size={24} />}
           {block.buttonType === 'tiktok' && <Music size={24} />}
           {block.buttonType === 'whatsapp' && <MessageCircle size={24} />}
           {block.buttonType === 'linkedin' && <Briefcase size={24} />}
           {block.buttonType === 'youtube' && <Youtube size={24} />}
           {block.buttonType === 'wifi' && <Wifi size={24} />}
           {block.buttonType === 'review' && <Star size={24} fill="currentColor" />}
           {block.buttonType === 'google_profile' && <MapPin size={24} />}
           {block.buttonType === 'action_card' && <CreditCard size={24} />}
           {block.buttonType === 'phone' && <Phone size={24} />}
           {block.buttonType === 'email' && <Mail size={24} />}
           {block.buttonType === 'booking' && <Calendar size={24} />}
           {block.buttonType === 'custom_link' && getLucideIcon(block.settings?.icon, 22)}
           {!block.buttonType && <LinkIcon size={22} />}
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="font-bold text-[15px] tracking-tight truncate" style={{ color: isDark ? '#fff' : '#1a1a1a' }}>
            {block.title || block.buttonType}
          </p>
          <p className="text-[12px] mt-0.5 font-medium" style={{ color: brand.muted }}>
            {block.buttonType === 'wifi' ? `WLAN: ${block.settings?.ssid || '…'}` : isSocial ? 'Öffnen' : 'Antippen'}
          </p>
        </div>
      </button>
    );
  }
  return null;
};

export const Microsite: React.FC<MicrositeProps> = ({ config, error, googleLogoUrl, embedded }) => {
  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id') || 'preview';
  const isDark = config.theme === 'dark';
  const surface = resolveSurface(config.theme, config.accentColor, config.surfaceColor);
  const textColor = config.textColor || (isDark ? '#F5F5F4' : '#1C1917');
  const fontClass = fontClassFor(config.fontStyle);
  const layoutMode = config.layoutMode || 'landing';
  const [activePage, setActivePage] = useState<SitePageSlug>(() =>
    resolveActivePage(window.location.search, window.location.hash)
  );

  useEffect(() => {
    const sync = () => setActivePage(resolveActivePage(window.location.search, window.location.hash));
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const pageBlocks = filterBlocksForPage(config.nfcBlocks || [], activePage);
  const { heroLine, stories, actions, extras } = splitBlocksForLanding(pageBlocks);
  const navItems = buildSiteNavItems(config);
  const showNav = !embedded && navItems.length > 1 && config.navEnabled !== false;

  const goNav = (item: { href: string; isPage?: boolean; id: string }) => {
    if (item.isPage || item.id === 'kontakt') {
      const next = navHrefForPage('kontakt', window.location.search);
      window.history.pushState({}, '', next);
      setActivePage('kontakt');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (activePage !== 'home') {
      const home = navHrefForPage('home', window.location.search);
      window.history.pushState({}, '', home.split('#')[0] + (item.href.startsWith('#') ? item.href : '#top'));
      setActivePage('home');
      requestAnimationFrame(() => {
        const el = document.querySelector(item.href);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    if (item.href === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (embedded) return;
    const story = stories[0]?.content || stories[0]?.title || '';
    applyMicrositeShareMeta({
      title: config.profileTitle || 'NUDAIM',
      description: story || 'NFC-Seite',
      imageUrl: config.profileLogoUrl || config.headerImageUrl || null,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      faviconUrl: config.faviconUrl || null,
    });
  }, [
    embedded,
    config.profileTitle,
    config.profileLogoUrl,
    config.headerImageUrl,
    config.faviconUrl,
    stories,
  ]);

  const navBar = showNav ? (
    <nav
      className="sticky top-0 z-30 w-full backdrop-blur-md border-b"
      style={{
        backgroundColor: isDark ? 'rgba(12,10,9,0.88)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}
      aria-label="Seitenmenü"
    >
      <div className="max-w-lg mx-auto px-3 py-2.5 flex gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            (item.isPage && activePage === 'kontakt') ||
            (!item.isPage && activePage === 'home' && item.id === 'top');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goNav(item)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-colors"
              style={{
                backgroundColor: isActive ? config.accentColor : 'transparent',
                color: isActive ? '#fff' : textColor,
                opacity: isActive ? 1 : 0.7,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  ) : null;

  if (error) {
    return (
      <div className="min-h-screen w-full bg-cream flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="bg-red-50 p-10 rounded-[3rem] border border-red-100 shadow-2xl space-y-6">
           <AlertTriangle size={64} className="text-red-500 mx-auto animate-bounce" />
           <div className="space-y-2">
              <h2 className="font-headline text-3xl font-extrabold uppercase tracking-tight">Seite nicht verfügbar</h2>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">{error.msg}</p>
           </div>
           <button onClick={() => window.location.reload()} className="px-8 py-3 bg-navy text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Erneut versuchen</button>
        </div>
      </div>
    );
  }

  if (layoutMode === 'stack') {
    return (
      <div
        id="top"
        className={`${embedded ? 'min-h-0 pb-6' : 'min-h-screen pb-40'} w-full selection:bg-petrol flex flex-col items-center overflow-y-auto overflow-x-hidden ${fontClass}`}
        style={{ backgroundColor: surface, color: textColor }}
      >
        {navBar}
        <header className="px-6 flex flex-col items-center text-center w-full relative pt-14 pb-8">
          <div className="w-24 h-24 rounded-3xl bg-white shadow-lg flex items-center justify-center border border-black/5 overflow-hidden relative z-10">
            {(googleLogoUrl || config.profileLogoUrl) ? (
              <img src={googleLogoUrl || config.profileLogoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div style={{ color: config.accentColor }}>{getLucideIcon(config.profileIcon, 40)}</div>
            )}
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight px-4" style={{ color: isDark ? '#fff' : config.accentColor }}>
            {config.profileTitle}
          </h1>
          {activePage === 'kontakt' && (
            <p className="mt-2 text-sm opacity-70">Kontakt</p>
          )}
        </header>
        <main className="max-w-md w-full px-5 flex-1 relative z-10 space-y-4 pb-8">
          {pageBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
          ))}
          {pageBlocks.length === 0 && (
            <p className="text-center text-sm opacity-50 py-8">Hier ist noch kein Kontakt hinterlegt.</p>
          )}
        </main>
      </div>
    );
  }

  // Landing = Mini-Website mit Hero + Sections
  return (
    <div
      id="top"
      className={`${embedded ? 'min-h-0 pb-8' : 'min-h-screen pb-36'} w-full selection:bg-petrol overflow-y-auto overflow-x-hidden ${fontClass}`}
      style={{ backgroundColor: surface, color: textColor }}
    >
      {navBar}
      {/* Hero */}
      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: config.headerImageUrl
              ? undefined
              : `linear-gradient(165deg, ${config.accentColor}22 0%, ${surface} 55%, ${surface} 100%)`,
          }}
        />
        {config.headerImageUrl && (
          <>
            <img src={config.headerImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 20%, ${surface})` }} />
          </>
        )}
        <div className="relative z-10 max-w-lg mx-auto px-6 pt-16 pb-10 flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-[1.75rem] bg-white shadow-xl flex items-center justify-center overflow-hidden border border-black/5 ring-4 ring-white/40">
            {(googleLogoUrl || config.profileLogoUrl) ? (
              <img src={googleLogoUrl || config.profileLogoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div style={{ color: config.accentColor }}>{getLucideIcon(config.profileIcon, 44)}</div>
            )}
          </div>
          <h1
            className="mt-7 text-4xl sm:text-[2.75rem] font-bold tracking-tight leading-[1.1] px-2"
            style={{ color: isDark ? '#fff' : config.accentColor }}
          >
            {config.profileTitle}
          </h1>
          {activePage === 'kontakt' ? (
            <p className="mt-4 text-lg sm:text-xl leading-snug max-w-sm opacity-90" style={{ color: textColor }}>
              So erreichst du uns
            </p>
          ) : (
            (heroLine?.title || heroLine?.content) && (
              <p className="mt-4 text-lg sm:text-xl leading-snug max-w-sm opacity-90" style={{ color: textColor }}>
                {heroLine.title || heroLine.content}
              </p>
            )
          )}
        </div>
      </section>

      <div className="max-w-lg mx-auto px-5 space-y-6 pb-10 relative z-10 -mt-2">
        {activePage === 'kontakt' ? (
          <section className="space-y-3" id="kontakt">
            {pageBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
            ))}
            {pageBlocks.length === 0 && (
              <p className="text-center text-sm opacity-50 py-8">Hier ist noch kein Kontakt hinterlegt.</p>
            )}
          </section>
        ) : (
          <>
            {/* Story / Text sections */}
            {stories.length > 0 && (
              <section
                id="section-stories"
                className="rounded-3xl px-5 py-6 space-y-5 shadow-sm border scroll-mt-16"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}
              >
                {stories.map((block) => (
                  <BlockRenderer key={block.id} block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
                ))}
              </section>
            )}

            {/* Actions grid */}
            {actions.length > 0 && (
              <section
                id="section-actions"
                className="rounded-3xl px-4 py-5 shadow-sm border scroll-mt-16"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-50 px-2 mb-3">Schnell zu</p>
                <div className={`grid gap-3 ${actions.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {actions.map((block) => (
                    <BlockRenderer key={block.id} block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
                  ))}
                </div>
              </section>
            )}

            {/* Map / extras */}
            {extras.length > 0 && (
              <section id="section-extras" className="space-y-3 scroll-mt-16">
                {extras.map((block) => (
                  <BlockRenderer key={block.id} block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
                ))}
              </section>
            )}

            {/* Fallback if empty */}
            {!heroLine && stories.length === 0 && actions.length === 0 && extras.length === 0 && (
              <p className="text-center text-sm opacity-50 py-8">
                {embedded ? 'Noch leer – links Inhalte hinzufügen.' : 'Bald findest du hier mehr Infos.'}
              </p>
            )}
          </>
        )}
      </div>

      {!embedded && (
        <footer className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 flex flex-col items-center gap-2 pointer-events-none z-[200] pb-safe">
          <button
            type="button"
            onClick={() => { window.location.href = window.location.origin; }}
            className="px-7 py-3.5 rounded-full shadow-xl flex items-center gap-3 hover:scale-105 transition-all pointer-events-auto font-semibold text-sm active:scale-95"
            style={{ backgroundColor: config.accentColor, color: '#fff' }}
          >
            <Smartphone size={18} />
            <span>Eigenen Anhänger gestalten</span>
          </button>
          <div className="pointer-events-auto rounded-full bg-white/90 backdrop-blur px-3 py-1.5 shadow-sm">
            <LegalFooter compact />
          </div>
        </footer>
      )}
    </div>
  );
};
