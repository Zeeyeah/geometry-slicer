/// <reference types="vite/client" />
declare module 'n8ao' {
  import { Scene, Camera } from 'three';
  import { Pass } from 'postprocessing';

  export interface N8AOOptions {
    aoRadius?: number;
    intensity?: number;
    color?: string;
    quality?: number;
    distanceFalloff?: number;
    screenSpaceRadius?: boolean;
    noiseTexture?: any;
    bias?: number;
    luminanceInfluence?: number;
    gammaCorrection?: boolean;
  }

  export class N8AOPostPass extends Pass {
    configuration: N8AOOptions;
    needsUpdate: boolean;
    constructor(scene: Scene, camera: Camera, width: number, height: number, options?: N8AOOptions);
    generateNoiseTexture(): any;
  }
}