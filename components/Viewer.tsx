
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData, ActionIcon } from '../types';
import { BlockRenderer } from './Microsite';
import { Globe, ShoppingCart, Info, Briefcase, User, Star, Mail, Phone, Instagram, Utensils, Shield, Camera, Dumbbell, Heart, Link as LinkIcon, Zap, Map as MapIcon, Clock, Calendar, Youtube, Video } from 'lucide-react';

// Fix for JSX intrinsic element type errors for @react-three/fiber
// Correctly augmenting the global JSX namespace for Three.js elements recognition
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
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
    default: return <LinkIcon size={size} />;
  }
};

const PhonePreview: React.FC<{ config: ModelConfig; googleLogoUrl?: string | null }> = ({ config, googleLogoUrl }) => {
  const blocks = config.nfcBlocks || [];
  const isDark = config.theme === 'dark';
  const fontClass = config.fontStyle === 'luxury' ? 'font-sans font-medium' : config.fontStyle === 'elegant' ? 'font-headline' : 'font-sans';

  return (
    <div className="absolute inset-0 z-[300] bg-white/40 backdrop-blur-md overflow-y-auto pt-10 pb-24 md:py-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-[280px] md:max-w-[340px] aspect-[9/18.5] bg-zinc-950 rounded-[3rem] border-[8px] border-zinc-900 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative flex flex-col ring-1 ring-white/10 shrink-0 overflow-hidden">
        {/* Notch Area */}
        <div className={`h-7 flex items-center justify-center pt-1 shrink-0 ${isDark ? 'bg-zinc-900' : 'bg-cream'}`}>
          <div className="w-16 h-4 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5" />
        </div>
        
        {/* Screen Content */}
        <div className={`flex-1 overflow-y-auto space-y-4 pb-16 scroll-container min-h-0 ${isDark ? 'bg-zinc-950 text-white' : 'bg-cream text-navy'} ${fontClass}`}>
           {config.headerImageUrl && (
             <div className="w-full h-28 overflow-hidden mb-[-1.5rem] relative shrink-0">
                <img src={config.headerImageUrl} className="w-full h-full object-cover" alt="Cover" />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${isDark ? 'to-zinc-950' : 'to-cream'}`} />
             </div>
           )}
           <header className="flex flex-col items-center text-center space-y-3 pt-6 px-5 shrink-0">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-navy/5 relative z-10 transition-transform overflow-hidden">
                {(googleLogoUrl || config.profileLogoUrl) ? (
                   <img src={googleLogoUrl || config.profileLogoUrl} alt="" className="w-full h-full object-cover object-center" />
                ) : (
                  <div style={{ color: config.accentColor }}>
                     {getLucideIcon(config.profileIcon, 28)}
                  </div>
                )}
              </div>
              <h1 className="font-headline text-base md:text-xl font-extrabold uppercase tracking-tight px-4 leading-tight" style={{ color: isDark ? '#fff' : config.accentColor }}>
                {config.profileTitle}
              </h1>
              <div className="w-6 h-0.5 rounded-full bg-current opacity-10" />
           </header>
           <div className="space-y-4 px-5 pb-8">
              {blocks.map(block => (
                 <BlockRenderer key={block.id} block={block} configId="preview" accentColor={config.accentColor} theme={config.theme} />
              ))}
           </div>
        </div>
        
        {/* Bottom Bar */}
        <div className={`h-5 flex items-center justify-center shrink-0 ${isDark ? 'bg-zinc-950' : 'bg-cream'}`}>
           <div className={`w-14 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-navy/10'}`} />
        </div>
      </div>
    </div>
  );
};

// BaseModel using augmented intrinsic elements
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
    </group>
  );
});

// LogoGroup using augmented intrinsic elements
const LogoGroup: React.FC<{ elements: SVGPathData[]; config: ModelConfig; plateRef: React.RefObject<THREE.Mesh | null> }> = ({ elements, config, plateRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const logoElements = useMemo(() => {
    return elements.map(el => {
      const geo = new THREE.ExtrudeGeometry(el.shapes, { 
        depth: config.logoDepth, 
        bevelEnabled: true, 
        bevelThickness: 0.1, 
        bevelSize: 0.05 
      });
      geo.scale(1, -1, 1);
      geo.rotateX(-Math.PI / 2);
      return { geo, color: config.logoColor };
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
      // Adjusted elevation slightly higher (0.05) and ensured it sits correctly on the base
      groupRef.current.position.y = plateBox.max.y + 0.05;
    }
  });

  return (
    <group 
      position={[config.logoPosX, 0, config.logoPosY]} 
      scale={[config.logoScale, 1, config.logoScale]} 
      rotation={[0, THREE.MathUtils.degToRad(config.logoRotation), 0]} 
      ref={groupRef}
    >
      <group position={[-initialOffset.x, 0, -initialOffset.z]}>
        {logoElements.map((el, idx) => (
          <mesh key={idx} geometry={el.geo} castShadow>
            {/* Added DoubleSide and adjusted material to handle "hollow" paths or thin geometry better */}
            <meshStandardMaterial 
              color={el.color} 
              roughness={0.3} 
              metalness={0.2} 
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Viewer component utilizing Canvas and Three.js components
export const Viewer = forwardRef<{ takeScreenshot: () => Promise<string> }, { config: ModelConfig, svgElements: SVGPathData[] | null, showNFCPreview: boolean, googleLogoUrl?: string | null }>(({ config, svgElements, showNFCPreview, googleLogoUrl }, ref) => {
  const plateRef = useRef<THREE.Mesh>(null);
  const r3fState = useRef<{ gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera } | null>(null);

  /** Zentrierte Kameraposition für konsistente Screenshots (Modell mittig im Bild). */
  const screenshotCamera = useRef<{ position: [number, number, number]; target: [number, number, number] }>({
    position: [50, 38, 50],
    target: [0, 8, 0],
  });

  useImperativeHandle(ref, () => ({
    takeScreenshot: async () => {
      try {
        if (!r3fState.current) {
          console.warn('R3F state not initialized');
          return '';
        }
        const { gl, scene, camera } = r3fState.current;
        const cam = camera as THREE.PerspectiveCamera;
        const savedPosition = cam.position.clone();
        const savedQuaternion = cam.quaternion.clone();
        const [px, py, pz] = screenshotCamera.current.position;
        const [tx, ty, tz] = screenshotCamera.current.target;
        cam.position.set(px, py, pz);
        cam.lookAt(new THREE.Vector3(tx, ty, tz));
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL('image/png');
        cam.position.copy(savedPosition);
        cam.quaternion.copy(savedQuaternion);
        if (!dataUrl || dataUrl === 'data:,') {
          throw new Error('Screenshot generation failed');
        }
        return dataUrl;
      } catch (error) {
        console.error('Error taking screenshot:', error);
        throw error;
      }
    }
  }));

  return (
    <div className="w-full h-full relative bg-cream overflow-hidden">
      <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }} onCreated={(state) => { r3fState.current = { gl: state.gl, scene: state.scene, camera: state.camera }; }}>
        <PerspectiveCamera makeDefault position={[50, 38, 50]} fov={40} />
        <OrbitControls makeDefault enableDamping minDistance={30} maxDistance={150} maxPolarAngle={Math.PI/2.1} target={[0, 8, 0]} />
        <ambientLight intensity={1.8} />
        <spotLight position={[50, 100, 50]} angle={0.3} penumbra={1} intensity={4} castShadow />
        <BaseModel ref={plateRef} config={config} />
        {svgElements && <LogoGroup elements={svgElements} config={config} plateRef={plateRef} />}
        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={100} blur={2} far={20} />
      </Canvas>
      {showNFCPreview && <PhonePreview config={config} googleLogoUrl={googleLogoUrl} />}
    </div>
  );
});
