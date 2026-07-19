/* eslint-disable @typescript-eslint/no-namespace */

import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { ModelConfig, SVGPathData } from '../types';
import { Microsite } from './Microsite';

// Fix for JSX intrinsic element type errors for @react-three/fiber
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
const PhonePreview: React.FC<{ config: ModelConfig; googleLogoUrl?: string | null }> = ({ config, googleLogoUrl }) => {
  const isExternal = config.landingMode === 'external';
  const dest = (config.externalUrl || '').trim();

  return (
    <div className="absolute inset-0 z-[300] bg-white/40 backdrop-blur-md overflow-y-auto pt-10 pb-24 md:py-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-[280px] md:max-w-[320px] aspect-[9/18.5] bg-zinc-950 rounded-[2.5rem] border-[8px] border-zinc-900 shadow-xl relative flex flex-col overflow-hidden ring-1 ring-white/10 shrink-0">
        <div className="h-6 flex items-center justify-center shrink-0 bg-zinc-900">
          <div className="w-14 h-3.5 bg-black rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white min-h-0">
          {isExternal ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-cream">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Kunden landen hier</p>
              <p className="text-sm font-bold text-navy break-all leading-snug">
                {dest || 'Noch keine Adresse'}
              </p>
              <p className="text-[10px] text-zinc-500 leading-snug">
                Website, Instagram, Google-Profil oder Shop – was du verlinkst.
              </p>
            </div>
          ) : (
            <div className="origin-top scale-[0.92] w-[108%] -ml-[4%]">
              <Microsite config={config} googleLogoUrl={googleLogoUrl} embedded />
            </div>
          )}
        </div>
        <div className="h-4 flex items-center justify-center shrink-0 bg-zinc-900">
          <div className="w-12 h-1 rounded-full bg-white/20" />
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
        <meshStandardMaterial
          color={config.plateColor || '#F8F5F0'}
          roughness={0.22}
          metalness={0.08}
        />
      </mesh>
      {config.hasChain !== false && (
        <mesh position={[-20, config.plateDepth / 2, 20]} castShadow>
          <torusGeometry args={[3.2, 0.55, 16, 48]} />
          <meshStandardMaterial color="#C0C0C0" metalness={0.95} roughness={0.18} />
        </mesh>
      )}
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
      scale={[config.mirrorX ? -config.logoScale : config.logoScale, 1, config.logoScale]} 
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
export const Viewer = forwardRef<{ takeScreenshot: () => Promise<string>; exportSTL: () => Promise<Blob | null> }, { config: ModelConfig, svgElements: SVGPathData[] | null, showNFCPreview: boolean, googleLogoUrl?: string | null }>(({ config, svgElements, showNFCPreview, googleLogoUrl }, ref) => {
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
        const dataUrl = await new Promise<string>((resolve, reject) => {
          gl.domElement.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Screenshot generation failed'));
                return;
              }
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || ''));
              reader.onerror = () => reject(new Error('Screenshot lesen fehlgeschlagen'));
              reader.readAsDataURL(blob);
            },
            'image/jpeg',
            0.82
          );
        });
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
    },
    exportSTL: async (): Promise<Blob | null> => {
      try {
        if (!r3fState.current) return null;
        const { scene } = r3fState.current;
        const group = new THREE.Group();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.geometry && obj.visible) {
            const clone = obj.clone();
            clone.applyMatrix4(obj.matrixWorld);
            group.add(clone);
          }
        });
        if (group.children.length === 0) return null;
        const exporter = new STLExporter();
        const stlString = exporter.parse(group, { binary: false });
        const blob = new Blob([stlString], { type: 'model/stl' });
        return blob;
      } catch (error) {
        console.error('STL export error:', error);
        return null;
      }
    },
  }));

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, #ffffff 0%, #F8F5F0 45%, #E8E4DC 100%)',
      }}
    >
      <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }} onCreated={(state) => { r3fState.current = { gl: state.gl, scene: state.scene, camera: state.camera }; }}>
        <PerspectiveCamera makeDefault position={[50, 38, 50]} fov={40} />
        <OrbitControls makeDefault enableDamping minDistance={30} maxDistance={150} maxPolarAngle={Math.PI/2.1} target={[0, 8, 0]} />
        <ambientLight intensity={1.6} />
        <spotLight position={[50, 100, 50]} angle={0.35} penumbra={1} intensity={3.6} castShadow />
        <directionalLight position={[-40, 60, -20]} intensity={0.45} />
        <BaseModel ref={plateRef} config={config} />
        {svgElements && <LogoGroup elements={svgElements} config={config} plateRef={plateRef} />}
        <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={100} blur={2.2} far={20} />
      </Canvas>
      {showNFCPreview && <PhonePreview config={config} googleLogoUrl={googleLogoUrl} />}
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-zinc-500/80 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full">
        Drehen · Zoomen · Anfassen
      </p>
    </div>
  );
});
