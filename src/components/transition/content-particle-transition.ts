// Official HTML-in-Canvas capture plus a WebGL particle dissolve used only for
// docs-to-docs navigation. Unsupported browsers keep the lightweight fade.
// 仅用于文档间导航的官方 HTML-in-Canvas 捕获与 WebGL 粒子消散；不支持时保留轻量淡入。

import { supportsHtmlInCanvas } from '@/components/canvasui/particle-scroll';
import { TRANSITION_DURATION_MS } from '@/lib/motion-config';

export interface ContentParticleTransition {
  canvas: HTMLCanvasElement;
  destroy: () => void;
  play: () => void;
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
const DENSITY = 2;
const SIZE = 1.25;
const SPREAD = 180;
const GRAVITY = 0.35;
const SWIRL = 54;

const HASH = `
float hash (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}`;

const DISSOLVE_VERT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uGrid;
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
  vec2 home = (cell + 0.5) * uDensity;
  float h1 = hash(cell);
  float h2 = hash(cell + vec2(1.7, 9.1));
  float h3 = hash(cell + vec2(5.5, 2.9));
  float h4 = hash(cell + vec2(8.4, 4.2));
  vec2 dir = normalize(vec2(h2 - 0.5, h3 - 0.5) + vec2(1e-4, 0.0));
  float reach = 0.08 + 0.92 * pow(h4, 2.4);
  vec2 off = dir * uSpread * reach;
  off.y += uGravity * uSpread * (0.25 + 0.75 * h4);
  float e = 1.0 - pow(1.0 - uProgress, 3.0);
  vec2 pos = mix(home, home + off, e);
  vec2 perp = vec2(-dir.y, dir.x);
  pos += perp * (h2 - 0.5) * 2.0 * uSwirl * sin(e * 3.14159);
  float amp = e * (uSpread * 0.025 + 1.5);
  pos += vec2(
    sin(uTime * (4.0 + 5.0 * h2) + h3 * 40.0),
    cos(uTime * (3.5 + 5.5 * h3) + h2 * 40.0)
  ) * amp;
  vCenter = home;
  vSize = mix(uDensity * 1.3, uSize, e);
  vAlpha = 1.0 - smoothstep(0.2 + h1 * 0.18, 1.0, uProgress);
  vMerge = 1.0 - smoothstep(0.05, 0.42, uProgress);
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
  float alpha = tex.a * vAlpha * mask;
  if (alpha < 0.01) discard;
  outColor = vec4(tex.rgb, alpha);
}`;

export function createContentParticleTransition(): ContentParticleTransition | null {
  if (!supportsHtmlInCanvas() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  const page = document.querySelector<HTMLElement>('#nd-page');
  if (!page) return null;

  const output = document.createElement('canvas');
  output.className = 'nd-content-particle-canvas';
  output.setAttribute('aria-hidden', 'true');
  const gl = output.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    stencil: false,
  });
  if (!gl || gl.isContextLost()) return null;
  const setProgram = gl.useProgram.bind(gl);

  const source = document.createElement('canvas') as PaintableCanvas;
  source.className = 'nd-content-particle-source';
  source.setAttribute('aria-hidden', 'true');
  source.setAttribute('layoutsubtree', 'true');
  const sourceContext = source.getContext('2d') as ElementImageContext | null;
  if (!sourceContext?.drawElementImage || !source.requestPaint) return null;

  const clone = page.cloneNode(true) as HTMLElement;
  clone.dataset.particleCapture = '';
  clone.inert = true;
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll(CAPTURE_EXCLUDE_SELECTOR).forEach((node) => {
    node.remove();
  });
  const pageRect = page.getBoundingClientRect();
  clone.style.width = `${pageRect.width}px`;
  clone.style.margin = '0';
  source.append(clone);
  document.body.append(source);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(window.innerWidth * dpr));
  const height = Math.max(1, Math.round(window.innerHeight * dpr));
  source.width = width;
  source.height = height;
  output.width = width;
  output.height = height;

  const vertex = compileShader(gl, gl.VERTEX_SHADER, DISSOLVE_VERT);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, DISSOLVE_FRAG);
  if (!vertex || !fragment) {
    source.remove();
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    source.remove();
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
    source.remove();
    return null;
  }

  const uniforms = readUniforms(gl, program);
  const vao = gl.createVertexArray();
  const texture = gl.createTexture();
  if (!vao || !texture) {
    source.remove();
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );

  let frameId = 0;
  let destroyed = false;
  let ready = false;
  let playRequested = false;
  let startedAt = 0;

  const draw = (now: number) => {
    if (destroyed || !ready) return;
    const progress = Math.min(Math.max((now - startedAt) / TRANSITION_DURATION_MS.content, 0), 1);
    const density = Math.max(
      DENSITY,
      Math.sqrt((window.innerWidth * window.innerHeight) / 800_000),
    );
    const gridX = Math.ceil(window.innerWidth / density);
    const gridY = Math.ceil(window.innerHeight / density);

    gl.viewport(0, 0, output.width, output.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    setProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.uContent, 0);
    gl.uniform2f(uniforms.uRes, window.innerWidth, window.innerHeight);
    gl.uniform2f(uniforms.uGrid, gridX, gridY);
    gl.uniform1f(uniforms.uDensity, density);
    gl.uniform1f(uniforms.uSpread, SPREAD);
    gl.uniform1f(uniforms.uGravity, GRAVITY);
    gl.uniform1f(uniforms.uSwirl, SWIRL);
    gl.uniform1f(uniforms.uProgress, progress);
    gl.uniform1f(uniforms.uSize, SIZE);
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.uniform1f(uniforms.uTime, now / 1000);
    gl.drawArrays(gl.POINTS, 0, gridX * gridY);

    if (progress < 1) frameId = window.requestAnimationFrame(draw);
  };

  source.onpaint = () => {
    if (destroyed) return;
    try {
      sourceContext.reset();
      sourceContext.drawElementImage?.(clone, pageRect.left, pageRect.top);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      ready = true;
      source.onpaint = null;
      source.remove();
      if (playRequested) {
        startedAt = performance.now();
        frameId = window.requestAnimationFrame(draw);
      }
    } catch (error) {
      console.error('Content particle capture error:', error);
    }
  };
  source.requestPaint?.();

  return {
    canvas: output,
    destroy() {
      destroyed = true;
      window.cancelAnimationFrame(frameId);
      source.onpaint = null;
      source.remove();
      output.remove();
      gl.deleteTexture(texture);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
    play() {
      if (destroyed) return;
      playRequested = true;
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
