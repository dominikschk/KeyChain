
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Download, QrCode as QrIcon, X, ArrowRight, Sparkles, RefreshCw, Shield, Eye, Edit3, Smartphone } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { Microsite } from './components/Microsite';
import { DEFAULT_CONFIG } from './constants';
import { ModelConfig, SVGPathData, Department, SavingStep, NFCBlock } from './types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase } from './lib/supabase';
import QRCode from 'qrcode';

const ConfirmationModal: React.FC<{ 
  config: ModelConfig, 
  onConfirm: () => void, 
  onCancel: () => void,
  screenshot: string | null
}> = ({ config, onConfirm, onCancel, screenshot }) => {
  const [qrCodes, setQrCodes] = useState<{label: string, secret: string, dataUrl: string}[]>([]);
  
  const stampBlocks = config.nfcBlocks.filter(b => b.buttonType === 'stamp_card');

  useEffect(() => {
    const generateCodes = async () => {
      const codes = await Promise.all(stampBlocks.map(async (block) => {
        const secret = block.settings?.secretKey || 'SECRET';
        const url = await QRCode.toDataURL(secret, { width: 1024, margin: 2, color: { dark: '#11235A' } });
        return { label: block.title || 'Stempelkarte', secret: secret, dataUrl: url };
      }));
      setQrCodes(codes);
    };
    generateCodes();
  }, [config.nfcBlocks]);

  return (
    <div className="fixed inset-0 z-[400] bg-navy/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-8 duration-500">
        <header className="p-5 md:p-6 border-b border-navy/5 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-petrol p-2.5 rounded-2xl text-white shadow-lg shadow-petrol/20">
              <Sparkles size={20} />
            </div>
            <div>
               <h2 className="serif-headline text-xl md:text-2xl font-black italic uppercase text-navy leading-tight">Review & Order</h2>
               <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mt-0.5">Hardware + Digital Profile</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-cream rounded-full transition-all group text-zinc-300 hover:text-navy">
             <X size={24} className="group-hover:rotate-90 transition-transform" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 md:space-y-10 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">
                 <Shield size={12} className="text-petrol" /> Hardware Design
               </div>
               <div className="aspect-square bg-cream rounded-[2rem] border border-navy/5 overflow-hidden shadow-inner flex items-center justify-center p-4">
                  {screenshot ? (
                    <img src={screenshot} className="w-full h-full object-contain drop-shadow-2xl" alt="Design Preview" />
                  ) : (
                    <div className="text-center opacity-20">
                      <Sparkles size={48} className="mx-auto mb-2" />
                      <p className="text-[8px] font-black uppercase tracking-widest">Snapshot missing</p>
                    </div>
                  )}
               </div>
               <div className="flex items-center justify-between px-4">
                  <span className="text-[10px] font-bold text-navy uppercase">Color</span>
                  <div className="w-4 h-4 rounded-full border border-navy/10" style={{ backgroundColor: config.logoColor }} />
               </div>
            </div>

            <div className="space-y-3">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">
                 <QrIcon size={12} className="text-action" /> Digital Profile
               </div>
               <div className="aspect-square bg-navy rounded-[2rem] border border-white/5 flex flex-col items-center justify-center p-8 text-center text-white space-y-3 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-petrol/20 to-transparent opacity-50" />
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md relative z-10 border border-white/10 group-hover:scale-110 transition-transform">
                    <QrIcon size={32} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="serif-headline text-lg italic font-black uppercase truncate w-32 md:w-40">{config.profileTitle}</h4>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Profile Live in Cloud</p>
                  </div>
               </div>
               <div className="flex items-center justify-between px-4">
                  <span className="text-[10px] font-bold text-navy uppercase">Modality</span>
                  <span className="text-[10px] font-black text-zinc-400 uppercase">NFC + QR Sync</span>
               </div>
            </div>
          </div>

          {qrCodes.length > 0 && (
            <div className="bg-cream rounded-[2rem] p-5 border border-navy/5 space-y-4 shadow-inner">
               <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-xl text-petrol shadow-sm"><QrIcon size={18} /></div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-navy">Loyalty Security Keys</h3>
               </div>
               <div className="flex flex-wrap gap-4">
                 {qrCodes.map((qr, i) => (
                   <div key={i} className="flex-1 min-w-[120px] bg-white p-4 rounded-2xl border border-navy/5 flex flex-col items-center gap-3 animate-in zoom-in duration-500">
                     <img src={qr.dataUrl} className="w-20 h-20" alt="QR" />
                     <p className="text-[8px] font-black text-navy uppercase">{qr.label}</p>
                     <p className="text-[6px] text-zinc-300 font-mono break-all leading-tight text-center">{qr.secret}</p>
                   </div>
                 ))}
               </div>
            </div>
          )}

          <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-start gap-4">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <p className="text-[10px] text-amber-900 font-bold leading-relaxed italic opacity-80">
              Achtung: Die Hardware wird nach diesem Design gefertigt. Das digitale Profil kannst du auch nach Erhalt jederzeit online anpassen.
            </p>
          </div>
        </div>

        <footer className="p-5 md:p-6 bg-zinc-50 border-t border-navy/5 flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full h-14 md:h-16 bg-navy text-white rounded-[1.2rem] font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-petrol transition-all shadow-xl active:scale-[0.98] group"
          >
            <span>BESTÄTIGEN & KAUFEN</span>
            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-2 text-[9px] font-black uppercase text-zinc-400 hover:text-navy transition-colors tracking-widest"
          >
            Zurück zur Bearbeitung
          </button>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [viewMode] = useState<'editor' | 'microsite'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') ? 'microsite' : 'editor';
  });

  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeDept, setActiveDept] = useState<Department>('digital');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [savingStep, setSavingStep] = useState<SavingStep>('idle');
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string} | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(viewMode === 'microsite');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  
  const viewerRef = useRef<{ takeScreenshot: () => Promise<string> }>(null);

  useEffect(() => {
    if (viewMode !== 'microsite') return;
    const loadMicrositeData = async () => {
      const params = new URLSearchParams(window.location.search);
      const shortId = params.get('id');
      if (!shortId || !supabase) {
        setErrorInfo({ title: "System Fehler", msg: "Cloud-Verbindung konnte nicht initialisiert werden.", code: "INIT_ERR" });
        setIsInitialLoading(false);
        return;
      }
      try {
        const { data: configData, error: cfgErr } = await supabase.from('nfc_configs').select('*').eq('short_id', shortId).single();
        if (cfgErr) throw cfgErr;
        const { data: blocksData } = await supabase.from('nfc_microsite_blocks').select('*').eq('config_id', configData.id).order('sort_order', { ascending: true });
        const { data: buttonsData } = await supabase.from('nfc_magic_buttons').select('*').eq('config_id', configData.id).order('sort_order', { ascending: true });
        const mergedBlocks: NFCBlock[] = [
          ...(blocksData || []).map(b => ({ id: b.id, type: b.type as any, title: b.title, content: b.content, imageUrl: b.image_url })),
          ...(buttonsData || []).map(b => ({ id: b.id, type: 'magic_button' as any, buttonType: b.button_type as any, title: b.label, content: b.target_value, settings: b.extra_metadata }))
        ];
        setConfig({ ...DEFAULT_CONFIG, ...configData.plate_data, nfcBlocks: mergedBlocks });
      } catch (err: any) {
        setErrorInfo({ title: "Profil nicht gefunden", msg: "Dieses NFeC Profil existiert nicht.", code: "404" });
      } finally { setIsInitialLoading(false); }
    };
    loadMicrositeData();
  }, [viewMode]);

  const initiateSave = async () => {
    const screenshot = await viewerRef.current?.takeScreenshot();
    setCurrentScreenshot(screenshot || null);
    setShowConfirmation(true);
  };

  const executeSave = async () => {
    if (!supabase) return;
    setShowConfirmation(false);
    setSavingStep('screenshot');
    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    try {
      let finalImageUrl = '';
      if (currentScreenshot) {
        setSavingStep('upload');
        const res = await fetch(currentScreenshot);
        const blob = await res.blob();
        const fileName = `nudaim_${shortId}.png`;
        await supabase.storage.from('nudaim').upload(fileName, blob);
        const { data } = supabase.storage.from('nudaim').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }

      setSavingStep('db');
      const { data: configRow, error: dbError } = await supabase.from('nfc_configs').insert([{ 
        short_id: shortId, 
        preview_image: finalImageUrl,
        plate_data: {
          baseType: config.baseType,
          plateWidth: config.plateWidth,
          plateHeight: config.plateHeight,
          plateDepth: config.plateDepth,
          logoScale: config.logoScale,
          logoColor: config.logoColor
        }
      }]).select().single();

      if (dbError) throw dbError;

      const contentBlocks = config.nfcBlocks.filter(b => b.type !== 'magic_button');
      if (contentBlocks.length > 0) {
        await supabase.from('nfc_microsite_blocks').insert(contentBlocks.map((b, i) => ({
          config_id: configRow.id,
          type: b.type,
          title: b.title,
          content: b.content,
          image_url: b.imageUrl,
          sort_order: i
        })));
      }

      const magicButtons = config.nfcBlocks.filter(b => b.type === 'magic_button');
      if (magicButtons.length > 0) {
        await supabase.from('nfc_magic_buttons').insert(magicButtons.map((b, i) => ({
          config_id: configRow.id,
          button_type: b.buttonType,
          label: b.title || b.buttonType,
          target_value: b.content,
          extra_metadata: b.settings || {},
          sort_order: i
        })));
      }

      const cartUrl = `https://nudaim3d.de/cart/add?id=56564338262361&quantity=1&properties[Config-ID]=${shortId}&properties[NFeC-Profil]=${window.location.origin}${window.location.pathname}?id=${shortId}&return_to=/cart`;
      window.location.href = cartUrl;
    } catch (err) {
      setErrorInfo({ title: "Speicherfehler", msg: "Die Cloud konnte nicht erreicht werden.", code: "DB_ERR" });
      setSavingStep('idle');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const loader = new SVGLoader();
      const svgData = loader.parse(ev.target?.result as string);
      setSvgElements(svgData.paths.map((path, i) => ({
        id: `path-${i}`, shapes: SVGLoader.createShapes(path), color: path.color.getStyle(), currentColor: path.color.getStyle(), name: `Teil ${i + 1}`
      })));
    };
    reader.readAsText(file);
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen w-screen bg-navy flex flex-col items-center justify-center text-white">
        <div className="relative mb-8">
           <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-white/10 border-t-action rounded-full animate-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="text-action animate-pulse" size={24} />
           </div>
        </div>
        <p className="serif-headline text-xl md:text-2xl italic tracking-widest animate-pulse-slow">NUDAIM3D STUDIO</p>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-4">Connecting Realities...</p>
      </div>
    );
  }

  if (viewMode === 'microsite') {
    return <Microsite config={config} error={errorInfo} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-cream text-navy overflow-hidden">
      {showConfirmation && (
        <ConfirmationModal 
          config={config} 
          onConfirm={executeSave} 
          onCancel={() => setShowConfirmation(false)}
          screenshot={currentScreenshot}
        />
      )}

      {/* Editor Sidebar */}
      <aside className={`w-full md:w-[450px] bg-white border-r border-navy/5 flex flex-col z-50 shadow-2xl relative transition-all duration-300 ${mobileTab === 'editor' ? 'flex-1 translate-x-0' : 'hidden md:flex -translate-x-full md:translate-x-0'}`}>
        <header className="p-6 md:p-8 border-b border-navy/5 bg-zinc-50/30">
          <div className="flex items-center justify-between mb-6 md:mb-8">
             <h1 className="serif-headline font-black text-xl md:text-2xl uppercase italic text-navy tracking-tight">NUDAIM3D</h1>
             <div className="bg-action/10 text-action px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-action/20">Studio v1.0</div>
          </div>
          <div className="flex bg-cream p-1 rounded-2xl border border-navy/5 shadow-inner">
            <button onClick={() => setActiveDept('3d')} className={`flex-1 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeDept === '3d' ? 'bg-white shadow-lg text-petrol scale-[1.02]' : 'text-zinc-400 hover:text-navy'}`}>Hardware</button>
            <button onClick={() => setActiveDept('digital')} className={`flex-1 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeDept === 'digital' ? 'bg-white shadow-lg text-petrol scale-[1.02]' : 'text-zinc-400 hover:text-navy'}`}>Content</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar technical-grid-fine">
          <Controls activeDept={activeDept} config={config} setConfig={setConfig} svgElements={svgElements} 
            onUpload={handleFileUpload} 
            onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)} 
          />
        </div>

        <footer className="p-6 md:p-8 border-t border-navy/5 bg-zinc-50/50 space-y-4">
          <button onClick={initiateSave} disabled={savingStep !== 'idle'} className="w-full h-14 md:h-18 bg-navy text-white rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-petrol transition-all shadow-xl active:scale-[0.98] disabled:opacity-50">
            {savingStep !== 'idle' ? <Loader2 className="animate-spin" size={24} /> : (
               <>
                 <span>DESIGN SPEICHERN</span>
                 <ArrowRight size={18} />
               </>
            )}
          </button>
          
          <div className="hidden md:flex items-center justify-center gap-6 text-[8px] font-black uppercase text-zinc-400 tracking-widest pt-2">
            <a href="#" className="hover:text-navy transition-colors">Impressum</a>
            <span className="w-1 h-1 rounded-full bg-zinc-300" />
            <a href="#" className="hover:text-navy transition-colors">Datenschutz</a>
          </div>
        </footer>
      </aside>

      {/* Main Viewer Area */}
      <main className={`flex-1 relative bg-cream transition-all duration-300 ${mobileTab === 'preview' ? 'flex-1' : 'hidden md:block'}`}>
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} showNFCPreview={activeDept === 'digital'} />
        
        {/* Sync Overlay */}
        {savingStep !== 'idle' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-2xl z-[500] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="relative mb-8">
               <div className="w-24 h-24 border-[6px] border-petrol/5 border-t-petrol rounded-full animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="text-petrol animate-spin" size={32} />
               </div>
            </div>
            <div className="text-center space-y-3 px-6">
               <p className="font-black uppercase tracking-[0.4em] italic text-navy text-xl">Cloud Sync</p>
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {savingStep === 'screenshot' && 'Snapshot Erstellung...'}
                  {savingStep === 'upload' && 'Datenübertragung...'}
                  {savingStep === 'db' && 'NFeC Profil Finalisierung...'}
               </p>
            </div>
          </div>
        )}

        {/* View Mode Indicator (Desktop only mostly) */}
        <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-none items-end">
           <div className="bg-white/80 backdrop-blur-xl px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-navy/5 shadow-2xl flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${activeDept === '3d' ? 'bg-action' : 'bg-petrol'} animate-pulse`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-navy">
                 {activeDept === '3d' ? 'Hardware Mode' : 'Content Mode'}
              </span>
           </div>
           {activeDept === 'digital' && (
             <div className="bg-navy text-white/50 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[7px] font-black uppercase tracking-widest flex items-center gap-2">
                <Eye size={10} /> Live Preview
             </div>
           )}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden flex h-20 bg-white border-t border-navy/5 z-[100] relative">
        <button 
          onClick={() => setMobileTab('editor')} 
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${mobileTab === 'editor' ? 'text-petrol' : 'text-zinc-400'}`}
        >
          <Edit3 size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Editor</span>
        </button>
        <div className="w-[1px] h-8 bg-navy/5 self-center" />
        <button 
          onClick={() => setMobileTab('preview')} 
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${mobileTab === 'preview' ? 'text-petrol' : 'text-zinc-400'}`}
        >
          {activeDept === '3d' ? <RefreshCw size={20} /> : <Smartphone size={20} />}
          <span className="text-[8px] font-black uppercase tracking-widest">Preview</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
