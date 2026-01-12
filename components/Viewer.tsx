
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData } from '../types';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Smartphone, Globe, Wifi, Instagram, Star, Link as LinkIcon, Camera } from 'lucide-react';

const PhonePreview: React.FC<{ config: ModelConfig, onOpenScanner?: () => void }> = ({ config, onOpenScanner }) => {
  const blocks = config.nfcBlocks;
  const t = config.nfcTemplate;

  const getIcon = (type: string, btnType?: string) => {
    if (type === 'image') return <Globe size={16} />;
    switch (btnType) {
      case 'review': return <Star size={16} className="text-yellow-500" />;
      case 'wifi': return <Wifi size={16} className="text-blue-500" />;
      case 'social_loop': return <Instagram size={16} className="text-pink-500" />;
      default: return <LinkIcon size={16} />;
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[100] pointer-events-none animate-in fade-in zoom-in duration-500">
      <div className="w-[min(320px,80vw)] aspect-[9/19] max-h-[80vh] bg-navy rounded-[3rem] border-[8px] border-navy shadow-[0_0_60px_rgba(17,35,90,0.4)] relative pointer-events-auto overflow-hidden flex flex-col scale-90 sm:scale-100">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-navy rounded-b-3xl z-30" />
        
        <div className={`flex-1 overflow-y-auto custom-scrollbar pt-12 px-6 pb-12 space-y-6 ${
          t === 'minimal' ? 'bg-white' : 
          t === 'professional' ? 'bg-slate-50' : 
          'bg-gradient-to-br from-slate-50 to-offwhite'
        }`}>
          <header className="text-center space-y-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-navy/5">
              <Smartphone size={28} className="text-petrol" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-navy text-[10px] uppercase tracking-[0.3em]">Direct Connect</h3>
              <div className="h-0.5 w-8 bg-action mx-auto rounded-full" />
            </div>
          </header>
          
          <div className="space-y-4">
            {blocks.map(block => (
              <div key={block.id} className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(17,35,90,0.04)] border border-navy/5 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-cream rounded-lg text-petrol">
                     {getIcon(block.type, block.buttonType)}
                   </div>
                   <p className="font-black text-navy text-[10px] uppercase tracking-wider">{block.title || block.buttonType || 'Info'}</p>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">{block.content}</p>
                {block.type === 'image' && block.imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-navy/5 shadow-inner">
                    <img src={block.imageUrl} className="w-full h-32 object-cover" alt="Preview" />
                  </div>
                )}
                {block.type === 'magic_button' && (
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={() => onOpenScanner?.()}
                      className="px-4 py-2 bg-petrol text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm flex items-center gap-2 hover:bg-action active:scale-95 transition-all pointer-events-auto"
                    >
                      <Camera size={10} /> Aktion starten
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <footer className="text-center opacity-30 pt-10">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-navy">NUDAIM STUDIO GERMANY</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

const BaseModel = forwardRef<THREE.Mesh, { config: ModelConfig, showNFC?: boolean }>(({ config, showNFC }, ref) => {
  const geometry = useMemo(() => {
    try {
      const extrudeSettings = { depth: config.plateDepth, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3 };
      let baseGeo: THREE.BufferGeometry;

      if (config.baseType === 'circle') {
        baseGeo = new THREE.ExtrudeGeometry(new THREE.Shape().absarc(0, 0, 22.5, 0, Math.PI * 2, false), extrudeSettings);
      } else if (config.baseType === 'rect') {
        const shape = new THREE.Shape();
        shape.moveTo(-22.5, -15); shape.lineTo(22.5, -15); shape.lineTo(22.5, 15); shape.lineTo(-22.5, 15);
        baseGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      } else {
        const s = 45, r = 10;
        const shape = new THREE.Shape();
        shape.moveTo(-s/2+r, -s/2); shape.lineTo(s/2-r, -s/2); shape.absarc(s/2-r, -s/2+r, r, -Math.PI/2, 0, false);
        shape.lineTo(s/2, s/2-r); shape.absarc(s/2-r, s/2-r, r, 0, Math.PI/2, false);
        shape.lineTo(-s/2+r, s/2); shape.absarc(-s/2+r, s/2-r, r, Math.PI/2, Math.PI, false);
        shape.lineTo(-s/2, -s/2+r); shape.absarc(-s/2+r, -s/2+r, r, Math.PI, Math.PI*1.5, false);
        baseGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      }

      if (!config.hasChain) { baseGeo.rotateX(-Math.PI/2); return baseGeo; }

      const eyeletGeo = new THREE.ExtrudeGeometry(new THREE.Shape().absarc(0, 0, 7.5, 0, Math.PI * 2, false), extrudeSettings);
      eyeletGeo.translate(config.eyeletPosX, config.eyeletPosY, 0);

      const holeGeo = new THREE.ExtrudeGeometry(new THREE.Shape().absarc(0, 0, 4.0, 0, Math.PI * 2, false), { depth: config.plateDepth + 2, bevelEnabled: false });
      holeGeo.translate(config.eyeletPosX, config.eyeletPosY, -1);

      const evaluator = new Evaluator();
      const final = evaluator.evaluate(evaluator.evaluate(new Brush(baseGeo), new Brush(eyeletGeo), ADDITION), new Brush(holeGeo), SUBTRACTION);
      final.geometry.rotateX(-Math.PI/2);
      return final.geometry;
    } catch (e) {
      return new THREE.BoxGeometry(45, 4, 45);
    }
  }, [config.plateDepth, config.baseType, config.hasChain, config.eyeletPosX, config.eyeletPosY]);

  return (
    <group>
      <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.05} />
      </mesh>
      {showNFC && (
        <group position={[0, config.plateDepth + 0.1, 0]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[8, 32]} />
            <meshStandardMaterial color="#12A9E0" transparent opacity={0.3} emissive="#12A9E0" emissiveIntensity={0.5} />
          </mesh>
          <Float speed={5} rotationIntensity={0.5}>
             <Text position={[0, 10, 0]} fontSize={2.5} color="#12A9E0" font="https://fonts.gstatic.com/s/plusjakartasans/v8/L0xPDF4xlVqn-I7F9mp8968m_E5v.woff2">NFC CHIP</Text>
          </Float>
        </group>
      )}
    </group>
  );
});

const LogoGroup: React.FC<{ elements: SVGPathData[]; config: ModelConfig; plateRef: React.RefObject<THREE.Mesh | null> }> = ({ elements, config, plateRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const logoElements = useMemo(() => {
    return elements.map(el => {
      const geo = new THREE.ExtrudeGeometry(el.shapes, { 
        depth: config.logoDepth, 
        bevelEnabled: true, 
        bevelThickness: 0.2, 
        bevelSize: 0.1 
      });
      geo.scale(1, -1, 1);
      geo.rotateX(-Math.PI / 2);
      return { geo, color: el.currentColor };
    });
  }, [elements, config.logoDepth]);

  const initialOffset = useMemo(() => {
    const box = new THREE.Box3();
    logoElements.forEach(({ geo }) => {
      geo.computeBoundingBox();
      if (geo.boundingBox) box.union(geo.boundingBox);
    });
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }, [logoElements]);

  useFrame(() => {
    if (plateRef.current && groupRef.current) {
      const plateBox = new THREE.Box3().setFromObject(plateRef.current);
      groupRef.current.position.y = plateBox.max.y - 0.02;
    }
  });

  return (
    <group 
      position={[config.logoPosX, 0, config.logoPosY]} 
      scale={[config.logoScale, config.logoScale, config.logoScale]} 
      rotation={[0, THREE.MathUtils.degToRad(config.logoRotation), 0]} 
      ref={groupRef}
    >
      <group position={[-initialOffset.x, 0, -initialOffset.z]}>
        {logoElements.map((el, idx) => (
          <mesh key={idx} geometry={el.geo} castShadow>
            <meshStandardMaterial color={el.color} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const Viewer = forwardRef<{ takeScreenshot: () => Promise<string> }, { config: ModelConfig, svgElements: SVGPathData[] | null, showNFCPreview: boolean, onOpenScanner?: () => void }>(({ config, svgElements, showNFCPreview, onOpenScanner }, ref) => {
  const plateRef = useRef<THREE.Mesh>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    takeScreenshot: async () => {
      if (!canvasRef.current) return '';
      return canvasRef.current.toDataURL('image/png');
    }
  }));

  return (
    <div className="w-full h-full relative bg-cream">
      <Canvas 
        shadows 
        gl={{ preserveDrawingBuffer: true, antialias: true }} 
        onCreated={(state) => { 
          (canvasRef as any).current = state.gl.domElement; 
        }}
        className="w-full h-full"
      >
        <PerspectiveCamera makeDefault position={[0, 80, 120]} fov={40} />
        <OrbitControls makeDefault enableDamping minDistance={30} maxDistance={400} maxPolarAngle={Math.PI/2.1} />
        <Environment preset="city" />
        <ambientLight intensity={0.6} />
        <spotLight position={[50, 100, 50]} castShadow intensity={2} shadow-mapSize={[1024, 1024]} />
        <BaseModel ref={plateRef} config={config} showNFC={showNFCPreview} />
        {svgElements && <LogoGroup elements={svgElements} config={config} plateRef={plateRef} />}
        <ContactShadows position={[0, -0.01, 0]} opacity={0.3} scale={200} blur={2.5} far={20} />
      </Canvas>
      {showNFCPreview && <PhonePreview config={config} onOpenScanner={onOpenScanner} />}
    </div>
  );
});
