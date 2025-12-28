import * as THREE from 'three';

export interface ModelConfig {
  plateWidth: number;
  plateHeight: number;
  plateDepth: number;
  logoScale: number;
  logoDepth: number;
  logoPosX: number;
  logoPosY: number;
  logoRotation: number;
  logoColor: string;
  wallThickness: number;
  isHollow: boolean;
  mirrorX: boolean;
  hasChain: boolean;
  customLink: string; // Neues Feld für Link oder Text-Addon
}

export interface SVGPathData {
  id: string;
  shapes: THREE.Shape[];
  color: string;
  currentColor: string;
  name: string;
}