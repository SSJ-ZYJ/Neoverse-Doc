export interface ContentParticleCaptureSnapshot {
  height: number;
  page: HTMLElement;
  path: string;
  scrollX: number;
  scrollY: number;
  width: number;
}

export function matchesContentParticleCapture(
  capture: ContentParticleCaptureSnapshot | null,
  current: ContentParticleCaptureSnapshot,
): boolean {
  return Boolean(
    capture &&
      capture.page === current.page &&
      capture.path === current.path &&
      capture.scrollX === current.scrollX &&
      capture.scrollY === current.scrollY &&
      capture.width === current.width &&
      capture.height === current.height,
  );
}
