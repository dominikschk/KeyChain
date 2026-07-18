/**
 * SVG → Pfade für 3D-Extrusion (lädt three/SVGLoader erst bei Bedarf).
 */
import type { SVGPathData } from '../types';

export async function parseSvgContent(
  content: string,
  autoScaleLogo = true
): Promise<{ elements: SVGPathData[]; scale: number } | null> {
  try {
    if (!content?.trim()) return null;
    const [{ SVGLoader }, THREE] = await Promise.all([
      import('three/examples/jsm/loaders/SVGLoader'),
      import('three'),
    ]);
    const loader = new SVGLoader();
    const svgData = loader.parse(content);
    if (!svgData.paths?.length) return null;
    const elements: SVGPathData[] = svgData.paths.map((path, i) => ({
      id: `path-${i}`,
      shapes: SVGLoader.createShapes(path),
      color: path.color.getStyle(),
      currentColor: path.color.getStyle(),
      name: `Teil ${i + 1}`,
    }));
    const box = new THREE.Box3();
    elements.forEach((el) => {
      el.shapes.forEach((shape) => {
        shape.getPoints().forEach((p) =>
          box.expandByPoint(new THREE.Vector3(p.x, -p.y, 0))
        );
      });
    });
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.x === 0 && size.y === 0) return null;
    const targetSize = 38;
    const scale = autoScaleLogo
      ? parseFloat((targetSize / Math.max(size.x, size.y)).toFixed(3))
      : 1;
    return { elements, scale };
  } catch (err) {
    console.error('SVG parsing error:', err);
    return null;
  }
}
