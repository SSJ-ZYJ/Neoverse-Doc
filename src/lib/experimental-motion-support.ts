// Experimental motion requires both HTML-in-Canvas capture and WebGL2.
// Keep one cached capability result so settings and runtime consumers agree
// without repeatedly allocating graphics contexts.
// 实验性动效同时依赖 HTML-in-Canvas 捕获与 WebGL2。缓存一次能力结果，
// 让设置界面与运行时消费者保持一致，并避免重复创建图形上下文。

interface ElementImageContext extends CanvasRenderingContext2D {
  drawElementImage?: (...args: unknown[]) => void;
}

interface PaintableCanvas extends HTMLCanvasElement {
  requestPaint?: () => void;
}

let cachedExperimentalMotionSupport: boolean | undefined;

export function supportsExperimentalMotion(): boolean {
  if (cachedExperimentalMotionSupport !== undefined) return cachedExperimentalMotionSupport;
  if (typeof document === 'undefined') return false;

  try {
    const captureCanvas = document.createElement('canvas') as PaintableCanvas;
    const captureContext = captureCanvas.getContext('2d') as ElementImageContext | null;
    const supportsCapture = Boolean(
      captureContext &&
        typeof captureContext.drawElementImage === 'function' &&
        typeof captureCanvas.requestPaint === 'function',
    );

    if (!supportsCapture) {
      cachedExperimentalMotionSupport = false;
      return false;
    }

    const graphicsCanvas = document.createElement('canvas');
    const graphicsContext = graphicsCanvas.getContext('webgl2');
    cachedExperimentalMotionSupport = graphicsContext !== null;
    graphicsContext?.getExtension('WEBGL_lose_context')?.loseContext();
    return cachedExperimentalMotionSupport;
  } catch {
    cachedExperimentalMotionSupport = false;
    return false;
  }
}
