
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Check, Smartphone, Globe, Star, Wifi, Instagram, Link as LinkIcon, Camera, ShoppingCart, ShieldCheck, ArrowRight, AlertTriangle, Database, Clock, Code2 } from 'lucide-react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { DEFAULT_CONFIG, SHOPIFY_CART_URL, VARIANT_ID } from './constants';
import { ModelConfig, SVGPathData, Department, SavingStep, NFCBlock } from './types';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { supabase, getDetailedError } from './lib/supabase';
import * as THREE from 'three';

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

const App: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [svgElements, setSvgElements] = useState<SVGPathData[] | null>(null);
  const [activeDept, setActiveDept] = useState<Department>('3d');
  const [savingStep, setSavingStep] = useState<SavingStep>('idle');
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string, code: string, source?: string} | null>(null);
  const [successData, setSuccessData] = useState<{id: string, imageUrl: string, micrositeUrl: string} | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const viewerRef = useRef<{ takeScreenshot: () => Promise<string> }>(null);

  useEffect(() => {
    setIsInitialLoading(false);
  }, []);

  const handleSave = async () => {
    if (!supabase) {
      setErrorInfo({ title: "Setup Fehler", msg: "Cloud-Verbindung fehlt.", code: "SUPA_MISSING" });
      return;
    }
    
    setSavingStep('screenshot');
    setErrorInfo(null);
    setSuccessData(null);

    const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
    // Die Basis-URL des Projekts. Wenn live, ist das z.B. https://studio.nudaim3d.de
    const currentBaseUrl = window.location.href.split('?')[0];
    const micrositeUrl = `${currentBaseUrl}?id=${shortId}`;
    let finalImageUrl = '';

    try {
      // 1. Snapshot des 3D Modells machen
      const screenshot = await withTimeout<string>(
        viewerRef.current?.takeScreenshot() || Promise.resolve(''),
        12000
      ).catch(() => '');
      
      if (screenshot) {
        setSavingStep('upload');
        try {
          const blob = dataURLtoBlob(screenshot);
          if (blob) {
            const fileName = `nudaim_${shortId}.png`;
            const { error: uploadError } = (await withTimeout(
              supabase.storage.from('nudaim').upload(fileName, blob, { upsert: true, cacheControl: '0' }),
              15000
            )) as any;
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('nudaim').getPublicUrl(fileName);
              finalImageUrl = urlData.publicUrl;
            }
          }
        } catch (e) { console.warn("Screenshot upload failed"); }
      }

      setSavingStep('db');
      
      // 2. Haupt-Eintrag in nfc_configs (3D Design)
      const { data: configRow, error: dbError } = await supabase.from('nfc_configs').insert([{ 
        short_id: shortId, 
        preview_image: finalImageUrl,
        plate_data: {
          width: config.plateWidth,
          height: config.plateHeight,
          depth: config.plateDepth,
          logoScale: config.logoScale,
          logoColor: config.logoColor,
          baseType: config.baseType
        }
      }]).select().single();

      if (dbError) throw dbError;

      // 3. Verteilung der Blöcke auf spezialisierte Tabellen
      const textAndImageBlocks = config.nfcBlocks.filter(b => b.type !== 'magic_button');
      const magicButtons = config.nfcBlocks.filter(b => b.type === 'magic_button');

      // A: Text/Bild Blöcke speichern
      if (textAndImageBlocks.length > 0) {
        const blocksToInsert = textAndImageBlocks.map((b, i) => ({
          config_id: configRow.id,
          type: b.type,
          title: b.title,
          content: b.content,
          image_url: b.imageUrl,
          sort_order: i
        }));
        await supabase.from('nfc_microsite_blocks').insert(blocksToInsert);
      }

      // B: Magic Buttons in eigene Tabelle speichern
      if (magicButtons.length > 0) {
        const buttonsToInsert = magicButtons.map((b, i) => ({
          config_id: configRow.id,
          button_type: b.buttonType,
          label: b.title || b.buttonType,
          target_value: b.content,
          extra_metadata: b.settings || {},
          sort_order: i
        }));
        await supabase.from('nfc_magic_buttons').insert(buttonsToInsert);
      }
      
      setSuccessData({ id: shortId, imageUrl: finalImageUrl, micrositeUrl });
      setSavingStep('done');

      // 4. Shopify Redirect
      const cartUrl = new URL(SHOPIFY_CART_URL);
      cartUrl.searchParams.append('id', VARIANT_ID);
      cartUrl.searchParams.append('quantity', '1');
      cartUrl.searchParams.append('properties[Config-ID]', shortId);
      cartUrl.searchParams.append('properties[NFeC-Profil]', micrositeUrl);
      if (finalImageUrl) {
        cartUrl.searchParams.append('properties[Vorschau]', finalImageUrl);
      }
      cartUrl.searchParams.append('return_to', '/cart');
      
      setTimeout(() => {
        window.location.href = cartUrl.toString();
      }, 3000);
      
    } catch (err: any) {
      const detailed = getDetailedError(err);
      setErrorInfo({ ...detailed, source: `Prozess: ${savingStep} | ID: ${shortId}` });
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
      
      const box = new THREE.Box2();
      svgData.paths.forEach(p => {
        const shapes = SVGLoader.createShapes(p);
        shapes.forEach(s => {
          const points = s.getPoints();
          points.forEach(pt => box.expandByPoint(pt));
        });
      });
      
      const size = new THREE.Vector2();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y);
      const targetSize = config.plateWidth * 0.75;
      const autoScale = targetSize / maxDim;

      setSvgElements(svgData.paths.map((path, i) => ({
        id: `path-${i}`, shapes: SVGLoader.createShapes(path), color: path.color.getStyle(), currentColor: path.color.getStyle(), name: `Teil ${i + 1}`
      })));
      
      setConfig(prev => ({ ...prev, logoScale: autoScale, logoPosX: 0, logoPosY: 0 }));
    };
    reader.readAsText(file);
  };

  if (isInitialLoading) return null;

  return (
    <div className="flex h-screen w-screen bg-cream text-navy overflow-hidden">
      <aside className="w-[450px] bg-white border-r border-navy/5 flex flex-col z-50 shadow-2xl">
        <header className="p-8 border-b border-navy/5">
          <div className="flex items-center justify-between mb-8">
            <h1 className="serif-headline font-black text-2xl uppercase italic tracking-tight">NUDAIM3D</h1>
            <div className="flex bg-cream p-1 rounded-2xl border border-navy/5">
              <button onClick={() => setActiveDept('3d')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === '3d' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>Design</button>
              <button onClick={() => setActiveDept('digital')} className={`px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeDept === 'digital' ? 'bg-white shadow-md text-petrol' : 'text-zinc-400'}`}>Profil</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar technical-grid-fine">
          <Controls activeDept={activeDept} config={config} setConfig={setConfig} svgElements={svgElements} 
            onUpload={handleFileUpload} 
            onUpdateColor={(id, c) => setSvgElements(prev => prev?.map(el => el.id === id ? { ...el, currentColor: c } : el) || null)} 
          />
        </div>

        <footer className="p-8 border-t border-navy/5">
          <button onClick={activeDept === '3d' ? () => setActiveDept('digital') : handleSave} disabled={savingStep !== 'idle'} className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl transition-all bg-navy text-white hover:bg-petrol">
            {savingStep !== 'idle' ? <Loader2 className="animate-spin" /> : (activeDept === '3d' ? "NFeC PROFIL BEARBEITEN" : "JETZT BESTELLEN")}
          </button>
        </footer>
      </aside>

      <main className="flex-1 relative bg-cream">
        <Viewer ref={viewerRef} config={config} svgElements={svgElements} showNFCPreview={activeDept === 'digital'} />
        
        {savingStep !== 'idle' && savingStep !== 'done' && (
          <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in">
             <div className="w-20 h-20 border-[6px] border-petrol/10 rounded-full soft-spin border-t-petrol mb-8 shadow-2xl" />
             <p className="text-xl font-black uppercase tracking-[0.3em] italic">SYNCING CLOUD...</p>
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Daten werden strukturiert gespeichert</p>
          </div>
        )}

        {successData && (
          <div className="absolute inset-0 z-[500] bg-navy/98 backdrop-blur-3xl flex items-center justify-center p-8 animate-in zoom-in">
             <div className="text-center space-y-8 max-w-lg w-full">
                <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto border-4 border-white/20"><Check size={48} /></div>
                <h3 className="serif-headline text-5xl font-black text-white uppercase italic">BEREIT!</h3>
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Weiterleitung zum Warenkorb...</p>
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-left">
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Deine Cloud ID</p>
                   <p className="text-[11px] font-mono text-white/80">{successData.id}</p>
                </div>
                <button onClick={() => window.location.href = `${SHOPIFY_CART_URL}?id=${VARIANT_ID}&quantity=1&properties[Config-ID]=${successData.id}&return_to=/cart`} className="w-full h-20 bg-white text-navy rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl">ZUM WARENKORB <ArrowRight size={20} /></button>
             </div>
          </div>
        )}

        {errorInfo && (
          <div className="absolute inset-0 z-[300] bg-navy/40 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center max-w-md w-full">
              <AlertTriangle size={32} className="text-red-500 mb-6" />
              <h3 className="font-black text-navy uppercase tracking-widest mb-2 italic">{errorInfo.title}</h3>
              <p className="text-xs text-zinc-500 mb-6">{errorInfo.msg}</p>
              <button onClick={() => { setErrorInfo(null); setSavingStep('idle'); }} className="w-full py-4 bg-navy text-white rounded-2xl text-[10px] font-black uppercase">Erneut versuchen</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
