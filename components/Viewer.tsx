
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData, ActionIcon } from '../types';
import { BlockRenderer } from './Microsite';
import { Globe, ShoppingCart, Info, Briefcase, User, Star, Mail, Phone, Instagram, Utensils, Shield, Camera, Dumbbell, Heart, Activity, Link as LinkIcon, Zap } from 'lucide-react';

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
    default: return <LinkIcon size={size} />;
  }
};

const PhonePreview: React.FC<{ config: ModelConfig }> = ({ config }) => {
  const blocks = config.nfcBlocks || [];
  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id') || 'preview';
  const isDark = config.theme === 'dark';
  const fontClass = config.fontStyle === 'luxury' ? 'font-serif' : config.fontStyle === 'elegant' ? 'serif-headline' : 'font-sans';

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[100] pointer-events-none animate-in fade-in zoom-in duration-500">
      <div className="w-[min(320px,85vw)] aspect-[9/19] bg-zinc-950 rounded-[3rem] border-[8px] border-zinc-900 shadow-2xl relative pointer-events-auto overflow-hidden flex flex-col ring-1 ring-white/10">
        <div className={`h-10 flex items-center justify-center pt-1 shrink-0 ${isDark ? 'bg-zinc-900' : 'bg-cream'}`}>
          <div className="w-16 h-5 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5">
             <div className="w-1 h-1 rounded-full bg-white/10 mr-2" />
             <div className="w-6 h-1 rounded-full bg-white/20" />
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto space-y-4 pb-12 custom-scrollbar ${isDark ? 'bg-zinc-950' : 'bg-cream'} ${fontClass}`}>
           {config.headerImageUrl && (
             <div className="w-full h-32 overflow-hidden mb-[-2rem] relative">
                <img src={config.headerImageUrl} className="w-full h-full object-cover" alt="Cover" />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${isDark ? 'to-zinc-950' : 'to-cream'}`} />
             </div>
           )}
           <header className="flex flex-col items-center text-center space-y-3 pt-6 px-4">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-navy/5 relative z-10">
                <div style={{ color: config.accentColor }}>
                   {getLucideIcon(config.profileIcon, 36)}
                </div>
              </div>
              <h1 className="serif-headline text-xl font-black italic uppercase px-4 leading-tight" style={{ color: isDark ? '#fff' : config.accentColor }}>
                {config.profileTitle}
              </h1>
              <p className="text-[7px] font-black uppercase tracking-[0.3em] opacity-40">Live Preview</p>
           </header>
           <div className="space-y-4 px-4">
              {blocks.map(block => (
                <div key={block.id} className="scale-90 origin-top -mb-4">
                   <BlockRenderer block={block} configId={currentId} accentColor={config.accentColor} theme={config.theme} />
                </div>
              ))}
           </div>
        </div>
        <div className={`h-6 flex items-center justify-center shrink-0 ${isDark ? 'bg-zinc-950' : 'bg-cream'}`}>
           <div className={`w-20 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-navy/10'}`} />
        </div>
      </div>
    </div>
  );
};

const BaseModel = forwardRef<THREE.Mesh, { config: ModelConfig, showNFC?: boolean }>(({ config, showNFC }, ref) => {
  const geometry = useMemo(() => {
    const size = 40;
    const r = 8;
    const er = 9.5;
    const eh = 3.5;
    const s = size / 2;
    const shape = new THREE.Shape();
    shape.moveTo(s - r, -s);
    shape.absarc(s - r, -s + r, r, -Math.PI/2, 0, false);
    shape.lineTo(s, s - r);
    shape.absarc(s - r, s - r, r, 0, Math.PI/2, false);
    shape.lineTo(-s + er, s); 
    shape.absarc(-s, s, er, 0, Math.PI * 1.5, false);
    shape.lineTo(-s, -s + r);
    shape.absarc(-s + r, -s + r, r, Math.PI, Math.PI * 1.5, false);
    shape.lineTo(s - r, -s);
    const holePath = new THREE.Path();
    holePath.absarc(-s, s, eh, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    const extrudeSettings = { depth: config.plateDepth, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.4, bevelSegments: 8 };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [config.plateDepth]);

  return (
    <group>
      <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </mesh>
      <group position={[0, config.plateDepth + 0.12, 0]}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[11, 64]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.05} metalness={0.9} />
        </mesh>
        {[10.2, 9.2, 8.2, 7.2].map((radius, i) => (
          <mesh key={i} position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[radius - 0.2, radius, 64]} />
            <meshStandardMaterial 
                color="#CD7F32" 
                metalness={1} 
                roughness={0.1} 
                emissive="#CD7F32" 
                emissiveIntensity={showNFC ? 3.5 : 0.3} 
            />
          </mesh>
        ))}
      </group>
      {showNFC && (
        <Float speed={4} rotationIntensity={0.2} floatIntensity={0.4}>
          <Text position={[0, 22, 0]} fontSize={3} color={config.accentColor} font="https://fonts.gstatic.com/s/plusjakartasans/v8/L0xPDF4xlVqn-I7F9mp8968m_E5v.woff2" outlineWidth={0.08} outlineColor="#ffffff" anchorY="middle">SMART CONNECT</Text>
        </Float>
      )}
    </group>
  );
});

const LogoGroup: React.FC<{ elements: SVGPathData[]; config: ModelConfig; plateRef: React.RefObject<THREE.Mesh | null> }> = ({ elements, config, plateRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const logoElements = useMemo(() => {
    return elements.map(el => {
      const geo = new THREE.ExtrudeGeometry(el.shapes, { depth: config.logoDepth, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05 });
      geo.scale(1, -1, 1);
      geo.rotateX(-Math.PI / 2);
      return { geo, color: config.logoColor }; // Benutze config.logoColor für alle Elemente
    });
  }, [elements, config.logoDepth, config.logoColor]);

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
    <group position={[config.logoPosX, 0, config.logoPosY]} scale={[config.logoScale, config.logoScale, config.logoScale]} rotation={[0, THREE.MathUtils.degToRad(config.logoRotation), 0]} ref={groupRef}>
      <group position={[-initialOffset.x, 0, -initialOffset.z]}>
        {logoElements.map((el, idx) => (
          <mesh key={idx} geometry={el.geo} castShadow><meshStandardMaterial color={el.color} roughness={0.3} metalness={0.1} /></mesh>
        ))}
      </group>
    </group>
  );
};

export const Viewer = forwardRef<{ takeScreenshot: () => Promise<string> }, { config: ModelConfig, svgElements: SVGPathData[] | null, showNFCPreview: boolean }>(({ config, svgElements, showNFCPreview }, ref) => {
  const plateRef = useRef<THREE.Mesh>(null);
  const r3fState = useRef<{ gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera } | null>(null);

  useImperativeHandle(ref, () => ({
    takeScreenshot: async () => {
      if (!r3fState.current) return '';
      const { gl, scene, camera } = r3fState.current;
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    }
  }));

  return (
    <div className="w-full h-full relative bg-cream">
      <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }} onCreated={(state) => { r3fState.current = { gl: state.gl, scene: state.scene, camera: state.camera }; }}>
        <PerspectiveCamera makeDefault position={[0, 100, 100]} fov={35} />
        <OrbitControls makeDefault enableDamping minDistance={35} maxDistance={250} maxPolarAngle={Math.PI/2.1} />
        <ambientLight intensity={1.0} />
        <spotLight position={[60, 120, 60]} angle={0.3} penumbra={1} intensity={3} castShadow />
        <pointLight position={[-50, 30, -50]} intensity={2.5} color={config.accentColor} />
        <BaseModel ref={plateRef} config={config} showNFC={showNFCPreview} />
        {svgElements && <LogoGroup elements={svgElements} config={config} plateRef={plateRef} />}
        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={100} blur={3} far={25} />
      </Canvas>
      {showNFCPreview && <PhonePreview config={config} />}
    </div>
  );
});
