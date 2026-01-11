
import React, { useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData } from '../types';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Smartphone } from 'lucide-react';

const PhonePreview: React.FC<{ config: ModelConfig }> = ({ config }) => {
  const blocks = config.nfcBlocks;
  const t = config.nfcTemplate;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 md:p-12 z-[100] pointer-events-none animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-[320px] aspect-[1/2] max-h-[85vh] bg-navy rounded-[3rem] border-[8px] border-navy shadow-2xl relative pointer-events-auto overflow-hidden flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-navy rounded-b-2xl z-20" />
        <div className={`flex-1 overflow-y-auto custom-scrollbar pt-10 px-5 pb-10 space-y-6 ${t === 'minimal' ? 'bg-white' : t === 'professional' ? 'bg-slate-100' : 'bg-gradient-to-b from-slate-50 to-white'}`}>
          <header className="text-center space-y-3">
            <div className="w-12 h-12 bg-petrol rounded-xl flex items-center justify-center mx-auto text-white shadow-lg">
              <Smartphone size={24} />
            </div>
            <h3 className="font-bold text-navy text-sm uppercase tracking-widest">NFC Preview</h3>
          </header>
          
          <div className="space-y-3">
            {blocks.map(block => (
              <div key={block.id} className="bg-white p-4 rounded-xl shadow-sm border border-navy/5 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-1">
                   {block.type === 'magic_button' && <div className="w-1.5 h-1.5 rounded-full bg-action animate-pulse" />}
                   <p className="font-black text-navy text-[10px] uppercase tracking-wider">{block.title || block.buttonType || block.type}</p>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{block.content}</p>
                {block.type === 'image' && block.imageUrl && (
                  <img src={block.imageUrl} className="mt-3 rounded-lg w-full h-32 object-cover border border-navy/5" alt="Preview" />
                )}
              </div>
            ))}
          </div>
          
          <footer className="text-center opacity-20 pt-8">
            <p className="text-[7px] font-black uppercase tracking-[0.3em]">NUDAIM STUDIO GERMANY</p>
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
  
  // Center logic: Calculate the bounding box of all elements COMBINED to center the logo correctly
  const logoElements = useMemo(() => {
    return elements.map(el => {
      const geo = new THREE.ExtrudeGeometry(el.shapes, { 
        depth: config.logoDepth, 
        bevelEnabled: true, 
        bevelThickness: 0.2, 
        bevelSize: 0.1 
      });
      geo.scale(1, -1, 1); // Flip Y because SVG is top-down
      geo.rotateX(-Math.PI / 2);
      return { geo, color: el.currentColor };
    });
  }, [elements, config.logoDepth]);

  useFrame(() => {
    if (plateRef.current && groupRef.current) {
      const plateBox = new THREE.Box3().setFromObject(plateRef.current);
      const logoBox = new THREE.Box3().setFromObject(groupRef.current);
      // Ensure the logo sits exactly on top of the plate
      const targetY = plateBox.max.y - 0.01;
      const currentY = logoBox.min.y;
      const diffY = targetY - currentY;
      if (Math.abs(diffY) > 0.001) groupRef.current.position.y += diffY;

      // Center the logo on XZ plane relative to its own bounds
      const center = new THREE.Vector3();
      logoBox.getCenter(center);
      // We don't want to auto-center every frame if user is moving it, 
      // but we need an initial centering.
    }
  });

  // Calculate the collective center of all shapes once
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

export const Viewer = forwardRef<{ takeScreenshot: () => Promise<string> }, { config: ModelConfig, svgElements: SVGPathData[] | null, showNFCPreview: boolean }>(({ config, svgElements, showNFCPreview }, ref) => {
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
        onCreated={({ gl }) => { canvasRef.current = gl.domElement; }}
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
      {showNFCPreview && <PhonePreview config={config} />}
    </div>
  );
});
