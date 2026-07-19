/**
 * Headless STL-Export für den NFC-Anhänger (ohne R3F/Canvas).
 * Baut Platte + optional vektorisierte Logo-Pfade; Raster-Logos → nur Platte
 * (Druck-PNG ist separates Print-Asset).
 */
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import type { ModelConfig, SVGPathData } from '../types';
import { parseSvgContent } from './parseSvgLogo';
import { isRasterLogoSvg } from './logoFromRaster';

const PLATE_SIZE = 40;

function buildPlateShape(hasChainHole: boolean): THREE.Shape {
  const r = 8;
  const er = 9.5;
  const eh = 3.5;
  const s = PLATE_SIZE / 2;
  const shape = new THREE.Shape();
  shape.moveTo(s - r, -s);
  shape.absarc(s - r, -s + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(s, s - r);
  shape.absarc(s - r, s - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-s + er, s);
  shape.absarc(-s, s, er, 0, Math.PI * 1.5, false);
  shape.lineTo(-s, -s + r);
  shape.absarc(-s + r, -s + r, r, Math.PI, Math.PI * 1.5, false);
  shape.lineTo(s - r, -s);
  if (hasChainHole) {
    const holePath = new THREE.Path();
    holePath.absarc(-s, s, eh, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }
  return shape;
}

function buildPlateMesh(config: ModelConfig): THREE.Mesh {
  const depth = Math.max(1, Number(config.plateDepth) || 3);
  const geo = new THREE.ExtrudeGeometry(buildPlateShape(true), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.4,
    bevelSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function buildChainMesh(config: ModelConfig): THREE.Mesh | null {
  if (config.hasChain === false) return null;
  const depth = Math.max(1, Number(config.plateDepth) || 3);
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.55, 16, 48));
  mesh.position.set(-20, depth / 2, 20);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function buildLogoMeshes(elements: SVGPathData[], config: ModelConfig, plateTopY: number): THREE.Object3D | null {
  if (!elements.length) return null;

  const logoDepth = Math.max(0.2, Number(config.logoDepth) || 1.2);
  const logoScale = Math.max(0.01, Number(config.logoScale) || 1);
  const meshes: { mesh: THREE.Mesh; box: THREE.Box3 }[] = [];

  for (const el of elements) {
    if (!el.shapes?.length) continue;
    const geo = new THREE.ExtrudeGeometry(el.shapes, {
      depth: logoDepth,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
    });
    geo.scale(1, -1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo);
    meshes.push({ mesh, box: geo.boundingBox?.clone() ?? new THREE.Box3() });
  }

  if (!meshes.length) return null;

  const union = new THREE.Box3();
  meshes.forEach(({ box }) => union.union(box));
  const center = new THREE.Vector3();
  union.getCenter(center);

  const group = new THREE.Group();
  group.position.set(Number(config.logoPosX) || 0, plateTopY + 0.05, Number(config.logoPosY) || 0);
  group.scale.set(config.mirrorX ? -logoScale : logoScale, 1, logoScale);
  group.rotation.y = THREE.MathUtils.degToRad(Number(config.logoRotation) || 0);

  const inner = new THREE.Group();
  inner.position.set(-center.x, 0, -center.z);
  for (const { mesh } of meshes) {
    inner.add(mesh);
  }
  group.add(inner);
  group.updateMatrixWorld(true);
  return group;
}

function collectMeshes(root: THREE.Object3D): THREE.Group {
  const out = new THREE.Group();
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      const clone = obj.clone();
      clone.applyMatrix4(obj.matrixWorld);
      out.add(clone);
    }
  });
  return out;
}

/**
 * Erzeugt eine ASCII-STL als Blob aus Config + optionalem Logo-SVG.
 * Bei Raster-Logos (eingebettetes PNG) wird nur die Plattengeometrie exportiert.
 */
export async function exportKeychainStl(
  config: ModelConfig,
  svgContent: string | null | undefined
): Promise<Blob | null> {
  try {
    const root = new THREE.Group();
    const plate = buildPlateMesh(config);
    root.add(plate);

    const chain = buildChainMesh(config);
    if (chain) root.add(chain);

    const plateBox = new THREE.Box3().setFromObject(plate);
    const plateTopY = plateBox.max.y;

    const svg = svgContent?.trim() || '';
    if (svg && !isRasterLogoSvg(svg)) {
      const parsed = await parseSvgContent(svg, false);
      if (parsed?.elements?.length) {
        const logo = buildLogoMeshes(parsed.elements, config, plateTopY);
        if (logo) root.add(logo);
      }
    }

    const exportGroup = collectMeshes(root);
    if (exportGroup.children.length === 0) return null;

    const exporter = new STLExporter();
    const stlString = exporter.parse(exportGroup, { binary: false });
    if (!stlString || typeof stlString !== 'string' || stlString.length < 20) return null;

    return new Blob([stlString], { type: 'model/stl' });
  } catch (err) {
    console.error('STL export error:', err);
    return null;
  }
}

/** Schneller Smoke-Check: STL enthält solid/facet-Header. */
export function isLikelyStlAscii(text: string): boolean {
  const head = text.slice(0, 80).toLowerCase();
  return head.includes('solid') && text.toLowerCase().includes('facet');
}
