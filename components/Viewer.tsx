
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData } from '../types';
import { BlockRenderer } from './Microsite';

const PhonePreview: React.FC<{ config: ModelConfig }> = ({ config }) => {
  const blocks = config.nfcBlocks || [];
  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id') || 'preview';

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[100] pointer-events-none animate-in fade-in zoom-in duration-500">
      <div className="w-[min(320px,85vw)] aspect-[9/19] bg-zinc-950 rounded-[3rem] border-[8px] border-zinc-900 shadow-2xl relative pointer-events-auto overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* Notch */}
        <div className="h-10 flex items-center justify-center pt-1 shrink-0">
          <div className="w-16 h-5 bg-zinc-900 rounded-2xl flex items-center justify-center">
             <div className="w-1 h-1 rounded-full bg-white/5 mr-2" />
             <div className="w-6 h-1 rounded-full bg-white/10" />
          </div>
        </div>
        
        {/* Real Content Preview */}
        <div className="flex-1 bg-cream overflow-y-auto space-y-4 px-4 pt-4 pb-12 custom-scrollbar">
           <header className="flex flex-col items-center text-center space-y-3 mb-6">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-navy/5">
                <div className="w-8 h-8 bg-petrol/10 rounded-lg flex items-center justify-center text-petrol">
                   <div className="w-4 h-4 border-2 border-petrol rounded-sm" />
                </div>
              </div>
              <h1 className="serif-headline text-xl font-black italic uppercase text-navy">NUDAIM NFeC</h1>
              <p className="text-[7px] font-black uppercase tracking-[0.3em] text-petrol/60">Preview Mode</p>
           </header>

           <div className="space-y-4">
              {blocks.map(block => (
                <div key={block.id} className="scale-90 origin-top -mb-4">
                   <BlockRenderer block={block} configId={currentId} />
                </div>
              ))}
           </div>
        </div>

        {/* Home Indicator */}
        <div className="h-6 flex items-center justify-center shrink-0 bg-cream">
           <div className="w-20 h-1 bg-navy/10 rounded-full" />
        </div>
      </div>
    </div>
  );
};

const BaseModel = forwardRef<THREE.Mesh, { config: ModelConfig, showNFC?: boolean }>(({ config, showNFC }, ref) => {
  const geometry = useMemo(() => {
    const extrudeSettings = { depth: config.plateDepth, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 5 };
    const shape = new THREE.Shape();
    const s = 45, r = 10;
    shape.moveTo(-s/2+r, -s/2); shape.lineTo(s/2-r, -s/2); shape.absarc(s/2-r, -s/2+r, r, -Math.PI/2, 0, false);
    shape.lineTo(s/2, s/2-r); shape.absarc(s/2-r, s/2-r, r, 0, Math.PI/2, false);
    shape.lineTo(-s/2+r, s/2); shape.absarc(-s/2+r, s/2-r, r, Math.PI/2, Math.PI, false);
    shape.lineTo(-s/2, -s/2+r); shape.absarc(-s/2+r, -s/2+r, r, Math.PI, Math.PI*1.5, false);

    if (config.hasChain) {
      const holePath = new THREE.Path();
      holePath.absarc(config.eyeletPosX, config.eyeletPosY, 4, 0, Math.PI * 2, true);
      shape.holes.push(holePath);
    }
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [config.plateDepth, config.hasChain, config.eyeletPosX, config.eyeletPosY]);

  return (
    <group>
      <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </mesh>
      
      {/* NFeC Chip Rendering */}
      <group position={[0, config.plateDepth + 0.1, 0]}>
        {[10, 9, 8].map((radius, i) => (
          <mesh key={i} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[radius - 0.2, radius, 64]} />
            <meshStandardMaterial color="#B87333" metalness={1} roughness={0.3} emissive="#B87333" emissiveIntensity={showNFC ? 0.8 : 0.1} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {showNFC && (
        <Float speed={4} rotationIntensity={0.1} floatIntensity={0.2}>
          <Text position={[0, 20, 0]} fontSize={2} color="#12A9E0" font="https://fonts.gstatic.com/s/plusjakartasans/v8/L0xPDF4xlVqn-I7F9mp8968m_E5v.woff2">
            NFeC CHIP ACTIVE
          </Text>
        </Float>
      )}
    </group>
  );
});

const LogoGroup: React.FC<{ elements: SVGPathData[]; config: ModelConfig; plateRef: React.RefObject<THREE.Mesh | null> }> = ({ elements, config, plateRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const logoElements = useMemo(() => {
    return elements.map(el => {
      const geo = new THREE.ExtrudeGeometry(el.shapes, { depth: config.logoDepth, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.1 });
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
        <PerspectiveCamera makeDefault position={[0, 90, 110]} fov={35} />
        <OrbitControls makeDefault enableDamping minDistance={40} maxDistance={250} maxPolarAngle={Math.PI/2.1} />
        <ambientLight intensity={0.7} />
        <spotLight position={[60, 110, 60]} angle={0.3} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-60, 30, -60]} intensity={1} color="#12A9E0" />
        <BaseModel ref={plateRef} config={config} showNFC={showNFCPreview} />
        {svgElements && <LogoGroup elements={svgElements} config={config} plateRef={plateRef} />}
        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={100} blur={3} far={20} />
      </Canvas>
      {showNFCPreview && <PhonePreview config={config} />}
    </div>
  );
});
