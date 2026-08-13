export interface ContentParticleWorkerInitMessage {
  type: 'init';
  canvas: OffscreenCanvas;
  dark: boolean;
  dpr: number;
  duration: number;
  fragmentSource: string;
  height: number;
  pageRect: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
  preset: {
    density: number;
    gravity: number;
    size: number;
    spread: number;
    swirl: number;
  };
  viewportHeight: number;
  viewportWidth: number;
  vertexSource: string;
  width: number;
}

export interface ContentParticleWorkerTextureMessage {
  type: 'texture';
  bitmap: ImageBitmap;
}

export interface ContentParticleWorkerPlayMessage {
  type: 'play';
}

export type ContentParticleWorkerMessage =
  | ContentParticleWorkerInitMessage
  | ContentParticleWorkerTextureMessage
  | ContentParticleWorkerPlayMessage;

export type ContentParticleWorkerResponse =
  | { type: 'first-frame' }
  | { type: 'error'; message: string };
