
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Download, QrCode as QrIcon, X, ArrowRight } from 'lucide-react';
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
  onCancel: () => void 
}> = ({ config, onConfirm, onCancel }) => {
  const [qrCodes, setQrCodes] = useState<{label: string, secret: string, dataUrl: string}[]>([]);
  
  const stampBlocks = config.nfcBlocks.filter(b => b.buttonType === 'stamp_card');

  useEffect(() => {
    const generateCodes = async () => {
      const codes = await Promise.all(stampBlocks.map(async (block) => {
        const secret = block.settings?.secretKey || 'SECRET';
        const url = await QRCode.toDataURL(secret, { width: 1024, margin: 2 });
        return { label: block.title || 'Stempelkarte', secret: secret, dataUrl: url };
      }));
      setQrCodes(codes);
    };
    generateCodes();
  }, [config.nfcBlocks]);

  const downloadQR = (dataUrl: string, label: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `NUDAIM_QR_${label.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-navy/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <header className="p-8 border-b border-navy/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-petrol/10 p-3 rounded-2xl text-petrol">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="serif-headline text-2xl font-black italic uppercase">Design-Check</h2>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-cream rounded-full transition-colors"><X size={24}/></button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar text-center">
          <div className="space-y-3">
            <p className="text-navy font-bold text-lg">Entspricht das Design deinen Vorstellungen?</p>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto">
              Wichtig: Nach diesem Schritt wird dein Design finalisiert. Änderungen sind danach nicht mehr möglich.
            </p>
          </div>

          {qrCodes.length > 0 && (
            <div className="bg-cream rounded-[2.5rem] p-8 border border-navy/5 space-y-6">
              <div className="flex flex-col items-center gap-2">
                <QrIcon size={32} className="text-petrol" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Deine Stempelkarten QR-Codes</h3>
                <p className="text-[9px] text-zinc-400 font-bold max-w-[200px]">Lade diese Codes jetzt herunter. Jeder Code ist einzigartig für die jeweilige Karte.</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6">
                {qrCodes.map((qr, i) => (
                  <div key={i} className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-3xl shadow-lg border border-navy/5">
                      <img src={qr.dataUrl} className="w-32 h-32" alt="QR Code" />
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-navy uppercase tracking-widest">{qr.label}</p>
                      <p className="text-[7px] text-zinc-400 font-mono mt-1">Code: {qr.secret}</p>
                    </div>
                    <button 
                      onClick={() => downloadQR(qr.dataUrl, qr.label)}
                      className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-[9px] font-black uppercase hover:bg-petrol transition-colors"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-zinc-400 italic">Hinweis: Diese Codes erhältst du zusätzlich per E-Mail nach Abschluss der Bestellung.</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-start gap-4 text-left">
            <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
            <p className="text-[10px] text-amber-900 font-medium leading-relaxed italic">
              Deine NFeC wird genau so produziert, wie du sie hier in der 3D-Vorschau siehst. Prüfe Logos, Farben und Texte sorgfältig.
            </p>
          </div>
        </div>

        <footer className="p-8 bg-zinc-50 border-t border-navy/5 flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full h-16 bg-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-petrol transition-all shadow-xl shadow-navy/20"
          >
            <span>JA, DESIGN BESTÄTIGEN</span>
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-4 text-[10px] font-black uppercase text-zinc-400 hover:text-navy transition-colors"
          >
            Zurück zum Editor
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
  const [activeDept, setActiveDept] = useState<Department>('3d');
  const [savingStep, setSavingStep] = useState<SavingStep>('idle');
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string} | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(viewMode === 'microsite');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
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
        setErrorInfo({ title: "Profil nicht gefunden", msg: "Dieses NFeC Profil existiert nicht oder wurde noch nicht synchronisiert.", code: "404" });
      } finally { setIsInitialLoading(false); }
    };
    loadMicrositeData();
  }, [viewMode]);

  const initiateSave = () => {
    setShowConfirmation(true);
  };

  const executeSave = async () => {
    if (!supabase) return;
    setShowConfirmation(false);
    setSavingStep('screenshot');
    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    try {
      const screenshot = await viewerRef.current?.takeScreenshot();
      setSavingStep('upload');
      
      let finalImageUrl = '';
      if (screenshot) {
        const res = await fetch(screenshot);
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
      setErrorInfo({ title: "Speicherfehler", msg: "Deine Konfiguration konnte nicht gesichert werden.", code: "DB_ERR" });
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
        <div className="w-12 h-12 border-4 border-white/10 border-t-action rounded-full animate-spin mb-6" />
        <p className="serif-headline text-xl italic tracking-widest animate-pulse">LADE NFeC PROFIL...</p>
      </div>
    );
  }

  if (viewMode === 'microsite') {
    return <Microsite config={config} error={errorInfo} />;
  }

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden">
      {showConfirmation && (
        <ConfirmationModal 
          config={config} 
          onConfirm={executeSave} 
          onCancel={() => setShowConfirmation(false)} 
        />
      )}

      <aside className="w-[450px] bg-white border-r border-navy/5 flex flex-col z-50 shadow-2xl">
        <header className="p-8 border-b border-navy/5">
          <h1 className="serif-headline font-black text-2xl uppercase italic">NUDAIM3D</h1>
          <div className="flex bg-cream p-1 rounded-2xl border border-navy/5 mt-6">
            <button onClick={() => setActiveDept('3d')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeDept === '3d' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>3D Design</button>
            <button onClick={() => setActiveDept('digital')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeDept === 'digital' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>Profil-Inhalt</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar technical-grid-fine">
          <Controls activeDept={activeDept} config={config} setConfig={setConfig} svgElements={svgElements} 
            onUpload={handleFileUpload} 
            onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)} 
          />
        </div>

        <footer className="p-8 border-t border-navy/5">
          <button onClick={initiateSave} disabled={savingStep !== 'idle'} className="w-full h-16 bg-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-petrol transition-colors">
            {savingStep !== 'idle' ? <Loader2 className="animate-spin" /> : "DESIGN SPEICHERN & BESTELLEN"}
          </button>
        </footer>
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} showNFCPreview={activeDept === 'digital'} />
        {savingStep !== 'idle' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-petrol/10 border-t-petrol rounded-full animate-spin mb-4" />
            <p className="font-black uppercase tracking-widest italic text-navy">Konfiguration wird synchronisiert...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
