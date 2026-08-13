// Official HTML-in-Canvas capture plus a WebGL particle dissolve used only for
// docs-to-docs navigation. Unsupported browsers keep the lightweight fade.
// 仅用于文档间导航的官方 HTML-in-Canvas 捕获与 WebGL 粒子消散；不支持时保留轻量淡入。

import { getDocsPageElement } from '@/adapters/fumadocs/dom';
import { TRANSITION_DURATION_MS } from '@/runtime/motion/config';
import { supportsExperimentalMotion } from '@/runtime/motion/experimental-support';
import { getEffectiveMotionLevel, isExperimentalMotionEnabled } from '@/runtime/motion/preferences';
import {
  type ContentParticleCaptureSnapshot,
  matchesContentParticleCapture,
} from './content-particle-capture-state';
import type {
  ContentParticleWorkerInitMessage,
  ContentParticleWorkerResponse,
} from './content-particle-worker-protocol';

export interface ContentParticleTransition {
  canvas: HTMLCanvasElement;
  destroy: () => void;
  play: (onFirstFrame?: () => void, onFailure?: () => void) => void;
}

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => DOMMatrix | undefined;
};

const CAPTURE_EXCLUDE_SELECTOR =
  'canvas, svg, img, picture, video, audio, iframe, script, object, embed, .immersive-particle-layer';
const TRANSPARENT_PIXEL = new Uint8Array([0, 0, 0, 0]);
const PARTICLE_PRESETS = {
  high: {
    density: 2,
    gravity: -0.18,
    size: 1.5,
    spread: 180,
    swirl: 28,
  },
  medium: {
    density: 2 * Math.SQRT2,
    gravity: -0.12,
    size: 1.35,
    spread: 118,
    swirl: 17,
  },
} as const;

const HASH = `
float hash (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}`;

const DISSOLVE_VERT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uGrid;
uniform vec2 uAnchor;
uniform float uDensity;
uniform float uSpread;
uniform float uGravity;
uniform float uSwirl;
uniform float uProgress;
uniform float uSize;
uniform float uDpr;
uniform float uTime;
out vec2 vCenter;
out float vSize;
out float vAlpha;
out float vMerge;
${HASH}
void main () {
  float fid = float(gl_VertexID);
  vec2 cell = vec2(mod(fid, uGrid.x), floor(fid / uGrid.x));
  float h1 = hash(cell);
  float h2 = hash(cell + vec2(1.7, 9.1));
  float h3 = hash(cell + vec2(5.5, 2.9));
  float h4 = hash(cell + vec2(8.4, 4.2));
  float h5 = hash(cell + vec2(3.2, 7.8));
  float h6 = hash(cell + vec2(9.7, 1.3));
  vec2 home = (cell + vec2(h5, h6)) * uDensity;
  vec2 dir = normalize(vec2(h2 - 0.5, h3 - 0.5) + vec2(1e-4, 0.0));
  vec2 anchorDelta = home - uAnchor;
  float reach = 0.16 + 0.84 * pow(h4, 2.2);
  // Rise immediately, then bend progressively left like a smooth smoke plume.
  // 首帧立即上浮，随后像炊烟一样逐渐向左弯曲。
  float lift = 1.0 - pow(1.0 - uProgress, 2.0);
  float sweep = uProgress * uProgress * uProgress;
  vec2 smoke = vec2(
    -uSpread * sweep,
    -uSpread * (0.55 * lift + 0.2 * sweep)
  ) * reach;
  smoke += dir * uSpread * 0.12 * sweep * (0.4 + 0.6 * h4);
  smoke.y += uGravity * uSpread * lift * (0.25 + 0.75 * h4);
  vec2 pos = uAnchor + anchorDelta * (1.0 + 0.025 * sweep) + smoke;
  vec2 tangent = normalize(vec2(-max(sweep, 0.05), -max(lift * 0.75, 0.05)));
  vec2 perp = vec2(-tangent.y, tangent.x);
  pos += perp * (h2 - 0.5) * 2.0 * uSwirl * sin(lift * 3.14159);
  float amp = lift * (uSpread * 0.02 + 1.2);
  pos += vec2(
    sin(uTime * (4.0 + 5.0 * h2) + h3 * 40.0),
    cos(uTime * (3.5 + 5.5 * h3) + h2 * 40.0)
  ) * amp;
  float breakup = smoothstep(0.08, 0.42, uProgress);
  vCenter = home;
  vSize = mix(uSize * 1.15, uSize, breakup);
  vAlpha = 1.0 - smoothstep(0.28 + h1 * 0.14, 0.96, uProgress);
  vMerge = 0.0;
  gl_Position = vec4(
    pos.x / uRes.x * 2.0 - 1.0,
    1.0 - pos.y / uRes.y * 2.0,
    0.0,
    1.0
  );
  gl_PointSize = max(vSize * uDpr, 1.0);
}`;

const DISSOLVE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uContent;
uniform vec2 uRes;
uniform float uDark;
in vec2 vCenter;
in float vSize;
in float vAlpha;
in float vMerge;
out vec4 outColor;
void main () {
  vec2 offset = gl_PointCoord - 0.5;
  vec2 uv = clamp((vCenter + offset * vSize) / uRes, 0.0, 1.0);
  vec4 tex = texture(uContent, uv);
  float circle = 1.0 - smoothstep(0.25, 0.5, length(offset));
  float mask = mix(circle, 1.0, vMerge);
  vec3 contrastTarget = uDark > 0.5 ? vec3(1.0) : vec3(0.04, 0.11, 0.2);
  vec3 particleColor = mix(tex.rgb, contrastTarget, 0.24);
  float alpha = min(tex.a * 1.2, 1.0) * vAlpha * mask;
  if (alpha < 0.01) discard;
  outColor = vec4(particleColor, alpha);
}`;

interface ContentParticleRenderer {
  canvas: HTMLCanvasElement;
  fragment: WebGLShader;
  gl: WebGL2RenderingContext;
  inUse: boolean;
  program: WebGLProgram;
  texture: WebGLTexture;
  uniforms: Record<string, WebGLUniformLocation>;
  vao: WebGLVertexArrayObject;
  vertex: WebGLShader;
}

interface WorkerParticleRenderer {
  canvas: HTMLCanvasElement;
  worker: Worker;
}

let sharedRenderer: ContentParticleRenderer | null = null;
let preparedCapture:
  | (ContentParticleCaptureSnapshot & {
      transition: ContentParticleTransition;
    })
  | null = null;
let cachedWorkerParticleSupport: boolean | undefined;

function supportsWorkerParticleRenderer(): boolean {
  if (cachedWorkerParticleSupport !== undefined) return cachedWorkerParticleSupport;
  if (
    typeof Worker === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    !('transferControlToOffscreen' in HTMLCanvasElement.prototype)
  ) {
    cachedWorkerParticleSupport = false;
    return false;
  }

  try {
    const probe = new OffscreenCanvas(1, 1);
    const gl = probe.getContext('webgl2');
    cachedWorkerParticleSupport = gl !== null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedWorkerParticleSupport = false;
  }
  return cachedWorkerParticleSupport;
}

function createWorkerParticleRenderer(
  dpr: number,
  pageRect: DOMRect,
  particlePreset: (typeof PARTICLE_PRESETS)[keyof typeof PARTICLE_PRESETS],
): WorkerParticleRenderer | null {
  if (!supportsWorkerParticleRenderer()) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'nd-content-particle-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));

  try {
    const worker = new Worker('/content-particle-worker.js');
    const offscreen = canvas.transferControlToOffscreen();
    const message: ContentParticleWorkerInitMessage = {
      type: 'init',
      canvas: offscreen,
      dark: document.documentElement.classList.contains('dark'),
      dpr,
      duration: TRANSITION_DURATION_MS.content,
      fragmentSource: DISSOLVE_FRAG,
      height: canvas.height,
      pageRect: {
        bottom: pageRect.bottom,
        left: pageRect.left,
        right: pageRect.right,
        top: pageRect.top,
      },
      preset: particlePreset,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      vertexSource: DISSOLVE_VERT,
      width: canvas.width,
    };
    worker.postMessage(message, [offscreen]);
    return { canvas, worker };
  } catch {
    canvas.remove();
    return null;
  }
}

function getCurrentCaptureSnapshot(page: HTMLElement): ContentParticleCaptureSnapshot {
  return {
    height: window.innerHeight,
    page,
    path: window.location.pathname,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    width: window.innerWidth,
  };
}

function captureMatchesCurrentPage(page: HTMLElement): boolean {
  return matchesContentParticleCapture(preparedCapture, getCurrentCaptureSnapshot(page));
}

export function discardPreparedContentParticleTransition(): void {
  preparedCapture?.transition.destroy();
  preparedCapture = null;
}

function pruneOffscreenCaptureBranches(sourceRoot: Element, cloneRoot: Element): void {
  const sourceChildren = Array.from(sourceRoot.children);
  const cloneChildren = Array.from(cloneRoot.children);

  sourceChildren.forEach((sourceChild, index) => {
    const cloneChild = cloneChildren[index];
    if (!(cloneChild instanceof HTMLElement)) return;

    const rect = sourceChild.getBoundingClientRect();
    if (rect.top >= window.innerHeight) {
      cloneChild.remove();
      return;
    }

    if (rect.bottom <= 0) {
      const display = getComputedStyle(sourceChild).display;
      // Inline descendants can affect wrapping in a partly visible text block.
      // Keep those small branches intact; replace only offscreen layout boxes
      // with fixed-size placeholders so the visible subtree keeps its position.
      // 行内后代会影响部分可见文本块的换行，因此保留这类小分支；仅将屏外
      // 布局盒替换为定尺寸占位，使可见子树维持原位置。
      if (!display.startsWith('inline')) {
        cloneChild.replaceChildren();
        cloneChild.style.blockSize = `${rect.height}px`;
        cloneChild.style.boxSizing = 'border-box';
        cloneChild.style.contain = 'strict';
        cloneChild.style.contentVisibility = 'hidden';
      }
      return;
    }

    pruneOffscreenCaptureBranches(sourceChild, cloneChild);
  });
}

function createRenderer(): ContentParticleRenderer | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'nd-content-particle-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    stencil: false,
  });
  if (!gl || gl.isContextLost()) return null;

  const vertex = compileShader(gl, gl.VERTEX_SHADER, DISSOLVE_VERT);
  if (!vertex) return null;
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, DISSOLVE_FRAG);
  if (!fragment) {
    gl.deleteShader(vertex);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Content particle program error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  const vao = gl.createVertexArray();
  const texture = gl.createTexture();
  if (!vao || !texture) {
    if (vao) gl.deleteVertexArray(vao);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, TRANSPARENT_PIXEL);

  return {
    canvas,
    fragment,
    gl,
    inUse: false,
    program,
    texture,
    uniforms: readUniforms(gl, program),
    vao,
    vertex,
  };
}

function destroyRenderer(renderer: ContentParticleRenderer): void {
  renderer.canvas.remove();
  renderer.gl.deleteTexture(renderer.texture);
  renderer.gl.deleteVertexArray(renderer.vao);
  renderer.gl.deleteProgram(renderer.program);
  renderer.gl.deleteShader(renderer.vertex);
  renderer.gl.deleteShader(renderer.fragment);
}

function resizeRenderer(renderer: ContentParticleRenderer): number {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(window.innerWidth * dpr));
  const height = Math.max(1, Math.round(window.innerHeight * dpr));
  if (renderer.canvas.width !== width) renderer.canvas.width = width;
  if (renderer.canvas.height !== height) renderer.canvas.height = height;
  return dpr;
}

function acquireRenderer(): ContentParticleRenderer | null {
  if (sharedRenderer?.gl.isContextLost()) {
    destroyRenderer(sharedRenderer);
    sharedRenderer = null;
  }
  if (!sharedRenderer) sharedRenderer = createRenderer();
  if (sharedRenderer && !sharedRenderer.inUse) {
    sharedRenderer.inUse = true;
    return sharedRenderer;
  }

  const renderer = createRenderer();
  if (renderer) renderer.inUse = true;
  return renderer;
}

function releaseRenderer(renderer: ContentParticleRenderer): void {
  if (renderer !== sharedRenderer || renderer.gl.isContextLost()) {
    if (renderer === sharedRenderer) sharedRenderer = null;
    destroyRenderer(renderer);
    return;
  }

  const { canvas, gl, texture } = renderer;
  canvas.remove();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, TRANSPARENT_PIXEL);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  renderer.inUse = false;
}

// Create and size the expensive WebGL resources while the docs page is idle.
// 在文档页空闲阶段创建并调整高成本 WebGL 资源，避免首个粒子帧同步初始化。
export function prewarmContentParticleRenderer(): void {
  if (!supportsExperimentalMotion() || !isExperimentalMotionEnabled()) {
    return;
  }
  if (!supportsWorkerParticleRenderer()) {
    if (sharedRenderer?.gl.isContextLost()) {
      destroyRenderer(sharedRenderer);
      sharedRenderer = null;
    }
    if (!sharedRenderer) sharedRenderer = createRenderer();
    if (!sharedRenderer || sharedRenderer.inUse) return;
    resizeRenderer(sharedRenderer);
    sharedRenderer.gl.viewport(0, 0, sharedRenderer.canvas.width, sharedRenderer.canvas.height);
    sharedRenderer.gl.clearColor(0, 0, 0, 0);
    sharedRenderer.gl.clear(sharedRenderer.gl.COLOR_BUFFER_BIT);
    sharedRenderer.gl.flush();
  }

  const page = getDocsPageElement();
  if (!page || captureMatchesCurrentPage(page)) return;
  discardPreparedContentParticleTransition();
  // Prewarm captures the destination as the next fully visible outgoing page,
  // independent of its current enter-animation opacity. Otherwise the second
  // navigation replays a structurally valid but transparent particle texture.
  // 预热捕获的是下一次完整可见的退场页，不继承当前入场动画的透明度；否则
  // 第二次导航会播放结构有效但完全透明的粒子纹理。
  const transition = createUncachedContentParticleTransition('1');
  if (!transition) return;
  preparedCapture = {
    ...getCurrentCaptureSnapshot(page),
    transition,
  };
}

export function createContentParticleTransition(): ContentParticleTransition | null {
  const page = getDocsPageElement();
  if (page && captureMatchesCurrentPage(page) && preparedCapture) {
    const prepared = preparedCapture.transition;
    preparedCapture = null;
    return prepared;
  }

  discardPreparedContentParticleTransition();
  return createUncachedContentParticleTransition();
}

function createUncachedContentParticleTransition(
  captureOpacity?: string,
): ContentParticleTransition | null {
  if (!supportsExperimentalMotion() || !isExperimentalMotionEnabled()) {
    return null;
  }

  const page = getDocsPageElement();
  if (!page) return null;

  const particlePreset =
    getEffectiveMotionLevel() === 'medium' ? PARTICLE_PRESETS.medium : PARTICLE_PRESETS.high;

  const source = document.createElement('canvas') as PaintableCanvas;
  source.className = 'nd-content-particle-source';
  source.setAttribute('aria-hidden', 'true');
  source.setAttribute('layoutsubtree', 'true');
  const sourceContext = source.getContext('2d') as ElementImageContext | null;
  if (!sourceContext?.drawElementImage || !source.requestPaint) {
    return null;
  }

  const clone = page.cloneNode(true) as HTMLElement;
  const contentOpacity = captureOpacity ?? getComputedStyle(page.firstElementChild ?? page).opacity;
  clone.dataset.particleCapture = '';
  clone.inert = true;
  clone.setAttribute('aria-hidden', 'true');
  clone.style.animation = 'none';
  Array.from(clone.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    child.style.animation = 'none';
    child.style.opacity = contentOpacity;
  });
  clone.querySelectorAll(CAPTURE_EXCLUDE_SELECTOR).forEach((node) => {
    node.remove();
  });
  pruneOffscreenCaptureBranches(page, clone);
  const pageRect = page.getBoundingClientRect();
  const pageAnchor = page.firstElementChild;
  const cloneAnchor = clone.firstElementChild;
  clone.style.width = `${pageRect.width}px`;
  clone.style.margin = '0';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const workerRenderer = createWorkerParticleRenderer(dpr, pageRect, particlePreset);
  const renderer = workerRenderer ? null : acquireRenderer();
  if (!workerRenderer && !renderer) return null;
  const output = workerRenderer?.canvas ?? renderer?.canvas;
  if (!output) {
    workerRenderer?.worker.terminate();
    if (renderer) releaseRenderer(renderer);
    return null;
  }
  source.append(clone);
  document.body.append(source);

  if (renderer) resizeRenderer(renderer);
  const width = output.width;
  const height = output.height;
  source.width = width;
  source.height = height;

  let frameId = 0;
  let destroyed = false;
  let ready = false;
  let playRequested = false;
  let firstFrameDrawn = false;
  let onFirstFrame: (() => void) | null = null;
  let onFailure: (() => void) | null = null;
  let failed = false;
  let startedAt = 0;

  const fail = (message: string, error?: unknown) => {
    if (failed || destroyed) return;
    failed = true;
    console.error(message, error);
    onFailure?.();
    onFailure = null;
  };

  if (workerRenderer) {
    workerRenderer.worker.onmessage = (event: MessageEvent<ContentParticleWorkerResponse>) => {
      if (destroyed) return;
      if (event.data.type === 'error') {
        fail('Content particle worker error:', event.data.message);
        return;
      }
      if (!firstFrameDrawn) {
        firstFrameDrawn = true;
        onFirstFrame?.();
        onFirstFrame = null;
      }
    };
    workerRenderer.worker.onerror = (event) => {
      fail('Content particle worker error:', event.message);
    };
  }

  const draw = (now: number) => {
    if (destroyed || !ready || !renderer) return;
    const { gl, program, texture, uniforms, vao } = renderer;
    const progress = Math.min(Math.max((now - startedAt) / TRANSITION_DURATION_MS.content, 0), 1);
    const density = Math.max(
      particlePreset.density,
      Math.sqrt((window.innerWidth * window.innerHeight) / 800_000),
    );
    const gridX = Math.ceil(window.innerWidth / density);
    const gridY = Math.ceil(window.innerHeight / density);

    gl.viewport(0, 0, output.width, output.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const activateProgram = gl.useProgram.bind(gl);
    activateProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.uContent, 0);
    gl.uniform2f(uniforms.uRes, window.innerWidth, window.innerHeight);
    gl.uniform2f(uniforms.uGrid, gridX, gridY);
    gl.uniform2f(
      uniforms.uAnchor,
      (Math.max(pageRect.left, 0) + Math.min(pageRect.right, window.innerWidth)) / 2,
      (Math.max(pageRect.top, 0) + Math.min(pageRect.bottom, window.innerHeight)) / 2,
    );
    gl.uniform1f(uniforms.uDensity, density);
    gl.uniform1f(uniforms.uSpread, particlePreset.spread);
    gl.uniform1f(uniforms.uGravity, particlePreset.gravity);
    gl.uniform1f(uniforms.uSwirl, particlePreset.swirl);
    gl.uniform1f(uniforms.uProgress, progress);
    gl.uniform1f(uniforms.uSize, particlePreset.size);
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.uniform1f(uniforms.uTime, now / 1000);
    gl.uniform1f(uniforms.uDark, document.documentElement.classList.contains('dark') ? 1 : 0);
    gl.drawArrays(gl.POINTS, 0, gridX * gridY);

    if (!firstFrameDrawn) {
      firstFrameDrawn = true;
      onFirstFrame?.();
      onFirstFrame = null;
    }

    if (progress < 1) frameId = window.requestAnimationFrame(draw);
  };

  source.onpaint = () => {
    if (destroyed) return;
    try {
      sourceContext.reset();
      // The detached clone can contain descendants whose viewport-relative
      // sizing overflows the article. Clip the capture to the real card so
      // those pixels cannot create particles across the TOC or side gutters.
      // 脱离原布局的克隆可能包含按视口计算尺寸并溢出正文的后代。将捕获范围
      // 裁剪到真实正文卡片，避免这些像素在 TOC 或两侧空隙生成多余粒子。
      sourceContext.beginPath();
      sourceContext.rect(
        pageRect.left * dpr,
        pageRect.top * dpr,
        pageRect.width * dpr,
        pageRect.height * dpr,
      );
      sourceContext.clip();
      const cloneRect = clone.getBoundingClientRect();
      const pageAnchorRect = pageAnchor?.getBoundingClientRect();
      const cloneAnchorRect = cloneAnchor?.getBoundingClientRect();
      const captureX =
        pageAnchorRect && cloneAnchorRect
          ? pageAnchorRect.left - (cloneAnchorRect.left - cloneRect.left)
          : pageRect.left;
      const captureY =
        pageAnchorRect && cloneAnchorRect
          ? pageAnchorRect.top - (cloneAnchorRect.top - cloneRect.top)
          : pageRect.top;
      // drawElementImage snapshots CSS content at device resolution, while its
      // destination offsets use canvas-grid pixels. Convert only the offsets;
      // scaling the whole context would enlarge every captured glyph and card.
      // drawElementImage 会按设备分辨率捕获 CSS 内容，但目标偏移使用 Canvas
      // 网格像素。这里只换算偏移；缩放整个上下文会放大所有文字和卡片。
      sourceContext.drawElementImage?.(clone, captureX * dpr, captureY * dpr);
      if (workerRenderer) {
        void createImageBitmap(source)
          .then((bitmap) => {
            if (destroyed) {
              bitmap.close();
              return;
            }
            workerRenderer.worker.postMessage({ type: 'texture', bitmap }, [bitmap]);
            ready = true;
          })
          .catch((error: unknown) => fail('Content particle bitmap error:', error));
      } else if (renderer) {
        const { gl, texture } = renderer;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        ready = true;
      }
      source.onpaint = null;
      source.remove();
      if (playRequested && renderer) {
        startedAt = performance.now();
        frameId = window.requestAnimationFrame(draw);
      }
    } catch (error) {
      fail('Content particle capture error:', error);
    }
  };
  source.requestPaint?.();

  return {
    canvas: output,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.cancelAnimationFrame(frameId);
      onFirstFrame = null;
      onFailure = null;
      source.onpaint = null;
      source.remove();
      workerRenderer?.worker.terminate();
      if (renderer) releaseRenderer(renderer);
    },
    play(handleFirstFrame, handleFailure) {
      if (destroyed) return;
      if (failed) {
        handleFailure?.();
        return;
      }
      if (firstFrameDrawn) {
        handleFirstFrame?.();
      } else if (handleFirstFrame) {
        onFirstFrame = handleFirstFrame;
      }
      if (handleFailure) onFailure = handleFailure;
      if (playRequested) return;
      playRequested = true;
      if (workerRenderer) {
        workerRenderer.worker.postMessage({ type: 'play' });
        return;
      }
      if (!ready) return;
      startedAt = performance.now();
      frameId = window.requestAnimationFrame(draw);
    },
  };
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Content particle shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function readUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
): Record<string, WebGLUniformLocation> {
  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let index = 0; index < count; index += 1) {
    const info = gl.getActiveUniform(program, index);
    if (!info) continue;
    const location = gl.getUniformLocation(program, info.name);
    if (location) uniforms[info.name] = location;
  }
  return uniforms;
}
