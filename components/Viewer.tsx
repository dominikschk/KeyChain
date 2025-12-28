
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData } from '../types';
import { ADDITION, Brush, Evaluator } from 'three-bvh-csg';

// Augment the global JSX namespace to include Three.js elements for React Three Fiber.
// This allows TypeScript to recognize elements like <mesh />, <group />, <torusGeometry />, etc.
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export interface ViewerProps {
  config: ModelConfig;
  svgElements: SVGPathData[] | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const KeychainChain: React.FC<{ 
  markerRef: React.RefObject<THREE.Group | null>;
  parentRef: React.RefObject<THREE.Group | null>;
}> = ({ markerRef, parentRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);

  const chainLinks = useMemo(() => {
    const links = [];
    const ringRadius = 6.5;
    const tubeRadius = 1.1;
    for (let i = 0; i < 6; i++) {
      links.push({
        position: i === 0 ? [0, 0, 0] : [-ringRadius * 1.5 * i, 0, i * 0.2],
        rotation: i === 0 ? [0, Math.PI / 4, 0] : [Math.PI / 2, 0, i % 2 === 0 ? 0.8 : -0.8],
        radius: ringRadius,
        tube: tubeRadius
      });
    }
    return links;
  }, []);

  useFrame(() => {
    if (markerRef.current && groupRef.current && parentRef.current) {
      markerRef.current.updateWorldMatrix(true, true);
      markerRef.current.getWorldPosition(worldPos);
      parentRef.current.updateWorldMatrix(true, true);
      parentRef.current.worldToLocal(worldPos);
      groupRef.current.position.copy(worldPos);
    }
  });

  return (
    <group ref={groupRef} userData={{ excludeFromExport: true }}>
      {chainLinks.map((link, idx) => (
        <mesh key={idx} position={link.position as [number, number, number]} rotation={link.rotation as [number, number, number]}>
          <torusGeometry args={[link.radius, link.tube, 24, 48]} />
          <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

const LogoElement: React.FC<{ element: SVGPathData; config: ModelConfig; isSelected: boolean }> = ({ element, config, isSelected }) => {
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(element.shapes, { depth: config.logoDepth, bevelEnabled: false });
    geo.scale(1, -1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.computeBoundingBox();
    const bbox = geo.boundingBox!;
    geo.translate(0, -bbox.min.y, 0); 
    return geo;
  }, [element.shapes, config.logoDepth]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial 
        color={element.currentColor} 
        roughness={0.2} 
        metalness={0.4} 
        side={THREE.DoubleSide} 
        emissive={isSelected ? element.currentColor : '#000000'}
        emissiveIntensity={isSelected ? 0.5 : 0}
      />
    </mesh>
  );
};

const LogoGroup: React.FC<{ elements: SVGPathData[]; config: ModelConfig; plateRef: React.RefObject<THREE.Mesh | null>; selectedId: string | null }> = ({ elements, config, plateRef, selectedId }) => {
  const groupRef = useRef<THREE.Group>(null);
  const plateBox = useMemo(() => new THREE.Box3(), []);
  const logoBox = useMemo(() => new THREE.Box3(), []);

  const centerOffset = useMemo(() => {
    const totalBox = new THREE.Box3();
    elements.forEach(el => {
      el.shapes.forEach(s => {
        const sg = new THREE.ShapeGeometry(s);
        sg.computeBoundingBox();
        if (sg.boundingBox) totalBox.union(sg.boundingBox);
      });
    });
    const c = new THREE.Vector3();
    totalBox.getCenter(c);
    return { x: c.x, z: -c.y };
  }, [elements]);

  useFrame(() => {
    if (plateRef.current && groupRef.current) {
      plateRef.current.updateWorldMatrix(true, true);
      groupRef.current.updateWorldMatrix(true, true);
      plateBox.setFromObject(plateRef.current);
      logoBox.setFromObject(groupRef.current);
      const diffY = plateBox.max.y - logoBox.min.y;
      if (Math.abs(diffY) > 0.0001) {
        groupRef.current.position.y += diffY;
      }
    }
  });

  const scaleFactor = config.logoScale * (config.mirrorX ? -1 : 1);

  return (
    <group 
      ref={groupRef} 
      position={[config.logoPosX, 0, config.logoPosY]} 
      scale={[scaleFactor, config.logoScale, config.logoScale]}
      rotation={[0, THREE.MathUtils.degToRad(config.logoRotation), 0]}
    >
      <group position={[-centerOffset.x, 0, -centerOffset.z]}>
        {elements.map(el => (
          <LogoElement 
            key={el.id} 
            element={el} 
            config={config} 
            isSelected={selectedId === el.id} 
          />
        ))}
      </group>
    </group>
  );
};

const KeychainBase = forwardRef<THREE.Mesh, { config: ModelConfig; markerRef: React.RefObject<THREE.Group | null> }>(({ config, markerRef }, ref) => {
  const geometry = useMemo(() => {
    const s = 45;
    const r = 5;
    const shape = new THREE.Shape();
    shape.moveTo(-s/2+r, -s/2); shape.lineTo(s/2-r, -s/2);
    shape.absarc(s/2-r, -s/2+r, r, -Math.PI/2, 0, false);
    shape.lineTo(s/2, s/2-r);
    shape.absarc(s/2-r, s/2-r, r, 0, Math.PI/2, false);
    shape.lineTo(-s/2+r, s/2);
    shape.absarc(-s/2+r, s/2-r, r, Math.PI/2, Math.PI, false);
    shape.lineTo(-s/2, -s/2+r);
    shape.absarc(-s/2+r, -s/2+r, r, Math.PI, Math.PI*1.5, false);

    const eyelet = new THREE.Shape();
    eyelet.absarc(-22.5, 22.5, 8.5, 0, Math.PI*2, false);
    const hole = new THREE.Path();
    hole.absarc(-22.5, 22.5, 4.0, 0, Math.PI*2, true);
    eyelet.holes.push(hole);

    const sets = { depth: config.plateDepth, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 4 };
    const bodyG = new THREE.ExtrudeGeometry(shape, sets);
    const eyeG = new THREE.ExtrudeGeometry(eyelet, sets);
    
    bodyG.translate(0, 0, -config.plateDepth/2);
    eyeG.translate(0, 0, -config.plateDepth/2);
    bodyG.rotateX(-Math.PI/2);
    eyeG.rotateX(-Math.PI/2);

    try {
      const evaler = new Evaluator();
      return evaler.evaluate(new Brush(bodyG), new Brush(eyeG), ADDITION).geometry;
    } catch { return bodyG; }
  }, [config.plateDepth]);

  return (
    <group>
      <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#18181b" roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <group ref={markerRef} position={[-22.5, 0, -22.5]} />
    </group>
  );
});

export const Viewer = forwardRef<{ getExportableGroup: () => THREE.Group | null, takeScreenshot: () => Promise<string> }, ViewerProps>((props, ref) => {
  const { config, svgElements, selectedId } = props;
  const sceneGroupRef = useRef<THREE.Group>(null);
  const plateRef = useRef<THREE.Mesh>(null);
  const holeMarkerRef = useRef<THREE.Group>(null);

  useImperativeHandle(ref, () => ({
    getExportableGroup: () => {
      if (!sceneGroupRef.current) return null;
      const exportGroup = new THREE.Group();
      const traverse = (obj: THREE.Object3D) => {
        if (obj.userData.excludeFromExport) return;
        if (obj instanceof THREE.Mesh) {
          const clone = obj.clone();
          obj.updateWorldMatrix(true, false);
          clone.applyMatrix4(obj.matrixWorld);
          exportGroup.add(clone);
        }
        obj.children.forEach(traverse);
      };
      traverse(sceneGroupRef.current);
      return exportGroup;
    },
    takeScreenshot: async () => {
      return new Promise((resolve) => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          requestAnimationFrame(() => {
            resolve(canvas.toDataURL('image/png'));
          });
        } else {
          resolve('');
        }
      });
    }
  }));

  return (
    <div className="w-full h-full bg-[#09090b]">
      <Canvas 
        shadows 
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <PerspectiveCamera makeDefault position={[80, 80, 80]} fov={35} />
        <OrbitControls makeDefault minDistance={30} maxDistance={400} />
        <ambientLight intensity={0.5} />
        <spotLight position={[50, 100, 50]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-50, -50, -50]} intensity={1} color="#3b82f6" />
        
        <group ref={sceneGroupRef}>
          <KeychainBase config={config} ref={plateRef} markerRef={holeMarkerRef} />
          {svgElements && (
            <LogoGroup elements={svgElements} config={config} plateRef={plateRef} selectedId={selectedId} />
          )}
          {config.hasChain && (
            <KeychainChain markerRef={holeMarkerRef} parentRef={sceneGroupRef} />
          )}
        </group>

        <gridHelper args={[600, 60, 0x18181b, 0x0c0c0e]} position={[0, -10, 0]} />
        <ContactShadows opacity={0.6} scale={150} blur={3} far={20} color="#000000" position={[0, -8, 0]} />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
});
