
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, ThreeElements, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig, SVGPathData } from '../types';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      [tagName: string]: any;
    }
  }
}

export interface ViewerProps {
  config: ModelConfig;
  svgElements: SVGPathData[] | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const LogoElement: React.FC<{ element: SVGPathData; config: ModelConfig; isSelected: boolean }> = ({ element, config, isSelected }) => {
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(element.shapes, { 
      depth: config.logoDepth, 
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.2,
      bevelSegments: 5
    });
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
        roughness={0.4} 
        metalness={0.1} 
        side={THREE.DoubleSide} 
        emissive={isSelected ? "#12A9E0" : '#000000'}
        emissiveIntensity={isSelected ? 0.4 : 0}
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
      el.shapes.forEach(shape => {
        const sg = new THREE.ShapeGeometry(shape);
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
      const diffY = (plateBox.max.y - 0.01) - logoBox.min.y; 
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

const SceneWrapper = forwardRef(( { children }: { children: React.ReactNode }, ref) => {
  const { gl, scene, camera } = useThree();
  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      // Wir verstecken UI Elemente kurz für den Screenshot
      const gizmo = scene.getObjectByName('gizmo-helper');
      if (gizmo) gizmo.visible = false;
      
      gl.render(scene, camera);
      const data = gl.domElement.toDataURL('image/png');
      
      if (gizmo) gizmo.visible = true;
      return data;
    }
  }));
  return <>{children}</>;
});

const KeychainBase = forwardRef<THREE.Mesh, { config: ModelConfig }>(({ config }, ref) => {
  const geometry = useMemo(() => {
    const s = 45;
    const r = 10;
    const EYELET_X = -23.0;
    const EYELET_Y_2D = 23.0;
    
    const plateShape = new THREE.Shape();
    plateShape.moveTo(-s/2+r, -s/2); 
    plateShape.lineTo(s/2-r, -s/2);
    plateShape.absarc(s/2-r, -s/2+r, r, -Math.PI/2, 0, false);
    plateShape.lineTo(s/2, s/2-r);
    plateShape.absarc(s/2-r, s/2-r, r, 0, Math.PI/2, false);
    plateShape.lineTo(-s/2+r, s/2);
    plateShape.absarc(-s/2+r, s/2-r, r, Math.PI/2, Math.PI, false);
    plateShape.lineTo(-s/2, -s/2+r);
    plateShape.absarc(-s/2+r, -s/2+r, r, Math.PI, Math.PI*1.5, false);

    const extrudeSettings = { 
      depth: config.plateDepth, 
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 5
    };

    const plateGeo = new THREE.ExtrudeGeometry(plateShape, extrudeSettings);

    const eyeletShape = new THREE.Shape();
    eyeletShape.absarc(0, 0, 7.5, 0, Math.PI * 2, false);
    const eyeletGeo = new THREE.ExtrudeGeometry(eyeletShape, extrudeSettings);
    eyeletGeo.translate(EYELET_X, EYELET_Y_2D, 0);

    const holeShape = new THREE.Shape();
    holeShape.absarc(0, 0, 4.0, 0, Math.PI * 2, false);
    const holeGeo = new THREE.ExtrudeGeometry(holeShape, { 
      depth: config.plateDepth + 10, 
      bevelEnabled: false 
    });
    holeGeo.translate(EYELET_X, EYELET_Y_2D, -5);

    const evaluator = new Evaluator();
    const plateBrush = new Brush(plateGeo);
    const eyeletBrush = new Brush(eyeletGeo);
    const holeBrush = new Brush(holeGeo);

    const combined = evaluator.evaluate(plateBrush, eyeletBrush, ADDITION);
    const final = evaluator.evaluate(combined, holeBrush, SUBTRACTION);
    
    final.geometry.rotateX(-Math.PI/2);
    return final.geometry;
  }, [config.plateDepth]);

  return (
    <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.05} />
    </mesh>
  );
});

export const Viewer = forwardRef<{ getExportableGroup: () => THREE.Group | null, takeScreenshot: () => Promise<string> }, ViewerProps>(({ config, svgElements, selectedId, onSelect }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const plateRef = useRef<THREE.Mesh>(null);
  const sceneWrapperRef = useRef<{ takeScreenshot: () => string }>(null);

  useImperativeHandle(ref, () => ({
    getExportableGroup: () => groupRef.current,
    takeScreenshot: async () => {
      return sceneWrapperRef.current?.takeScreenshot() || "";
    }
  }));

  return (
    <div className="w-full h-full">
      <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <SceneWrapper ref={sceneWrapperRef}>
          <PerspectiveCamera makeDefault position={[0, 80, 120]} fov={35} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} enableDamping />
          
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <spotLight position={[50, 100, 50]} angle={0.2} penumbra={1} castShadow intensity={1.5} />
          <directionalLight position={[-50, 50, -50]} intensity={0.5} />

          <group ref={groupRef}>
            <KeychainBase ref={plateRef} config={config} />
            {svgElements && (
              <LogoGroup 
                elements={svgElements} 
                config={config} 
                plateRef={plateRef} 
                selectedId={selectedId} 
              />
            )}
          </group>

          <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={150} blur={2.5} far={15} />

          {/* Der interaktive Orientierungs-Gizmo */}
          <GizmoHelper
            alignment="bottom-right" 
            margin={[80, 80]}
            name="gizmo-helper"
          >
            <GizmoViewport 
              axisColors={['#ff3e3e', '#10b981', '#12A9E0']} 
              labelColor="white" 
            />
          </GizmoHelper>
        </SceneWrapper>
      </Canvas>
    </div>
  );
});
