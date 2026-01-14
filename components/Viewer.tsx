
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData } from '../types';
import { Smartphone } from 'lucide-react';

const PhonePreview: React.FC<{ config: ModelConfig }> = ({ config }) => {
  const blocks = config.nfcBlocks || [];
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[100] pointer-events-none animate-in fade-in zoom-in duration-500">
      <div className="w-[min(280px,80vw)] aspect-[9/19] bg-zinc-950 rounded-[2.5rem] border-[6px] border-zinc-900 shadow-2xl relative pointer-events-auto overflow-hidden flex flex-col">
        <div className="h-10 flex items-center justify-center pt-1">
          <div className="w-8 h-1 bg-white/10 rounded-full" />
        </div>
        <div className="flex-1 bg-white px-5 pt-6 overflow-y-auto space-y-4">
          <div className="w-12 h-12 bg-cream rounded-xl flex items-center justify-center mx-auto shadow-sm"><Smartphone size={24} className="text-petrol" /></div>
          <div className="h-0.5 w-8 bg-action/20 mx-auto rounded-full" />
          {blocks.map(block => (
            <div key={block.id} className="bg-slate-50 p-4 rounded-xl border border-navy/5">
              <p className="font-black text-navy text-[8px] uppercase tracking-widest mb-1">{block.title || 'Inhalt'}</p>
              <p className="text-[9px] text-zinc-500 leading-tight">{block.content}</p>
            </div>
          ))}
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
