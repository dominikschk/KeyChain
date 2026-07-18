declare module 'vecburner' {
  export type VecburnerPreset =
    | 'auto'
    | 'logo'
    | 'lineart'
    | 'illustration'
    | 'photo'
    | 'pixel'
    | 'simple';

  export type VecburnerAnalysis = {
    uniqueColors: number;
    clusterCount: number;
    isBinary: boolean;
    isPixelArt: boolean;
    isPhoto: boolean;
    recommendedPreset: VecburnerPreset | string;
    recommendedNumColors: number;
  };

  export type VecburnerResult = {
    svg: string;
    width: number;
    height: number;
    layers?: unknown[];
    paths?: unknown[];
    colors?: string[];
    engine?: string;
  };

  export const Vecburner: {
    version: string;
    vectorize: (imageData: ImageData, options?: Record<string, unknown>) => Promise<VecburnerResult>;
    vectorizeWithPreset: (imageData: ImageData, preset?: VecburnerPreset | string) => Promise<VecburnerResult>;
    analyzeImage: (imageData: ImageData) => VecburnerAnalysis;
  };

  export default Vecburner;
}
