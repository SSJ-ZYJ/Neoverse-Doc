// Shared finite-state and route-transition contracts.
// 统一的有限状态与路由转场契约。

export type TransitionPhase = 'idle' | 'preparing' | 'navigating' | 'revealing' | 'settling';

export type TransitionKind =
  | 'auto'
  | 'aperture'
  | 'overview'
  | 'surface'
  | 'content'
  | 'crossfade'
  | 'none';

export interface TransitionOrigin {
  x: number;
  y: number;
}

export interface TransitionIntent {
  kind: Exclude<TransitionKind, 'auto'>;
  origin: TransitionOrigin;
  sourcePath: string;
  targetPath: string;
}
