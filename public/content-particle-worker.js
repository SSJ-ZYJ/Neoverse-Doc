// Off-main-thread WebGL renderer for the docs particle dissolve. Shader source
// is supplied by the feature module so the visual algorithm has one owner.
// 文档粒子消散的独立线程 WebGL 渲染器。Shader 源码由 Feature 模块传入，
// 确保视觉算法只有一个事实来源。

let renderer = null;
let ready = false;
let playRequested = false;
let firstFrameDrawn = false;
let startedAt = 0;

function fail(message) {
  self.postMessage({ type: 'error', message });
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    fail(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed.');
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function readUniforms(gl, program) {
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let index = 0; index < count; index += 1) {
    const info = gl.getActiveUniform(program, index);
    if (!info) continue;
    const location = gl.getUniformLocation(program, info.name);
    if (location) uniforms[info.name] = location;
  }
  return uniforms;
}

function initialize(message) {
  const gl = message.canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    stencil: false,
  });
  if (!gl || gl.isContextLost()) {
    fail('Offscreen WebGL2 is unavailable.');
    return;
  }

  const vertex = compileShader(gl, gl.VERTEX_SHADER, message.vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, message.fragmentSource);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  const vao = gl.createVertexArray();
  const texture = gl.createTexture();
  if (!program || !vao || !texture) {
    fail('Unable to allocate particle WebGL resources.');
    return;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    fail(gl.getProgramInfoLog(program) ?? 'Particle program linking failed.');
    return;
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  renderer = {
    dark: message.dark,
    dpr: message.dpr,
    duration: message.duration,
    gl,
    pageRect: message.pageRect,
    preset: message.preset,
    program,
    texture,
    uniforms: readUniforms(gl, program),
    vao,
    viewportHeight: message.viewportHeight,
    viewportWidth: message.viewportWidth,
  };
}

function renderFrame(now, progress) {
  if (!renderer || !ready) return;
  const { dark, dpr, gl, pageRect, preset, program, texture, uniforms, vao } = renderer;
  const { viewportHeight, viewportWidth } = renderer;
  const density = Math.max(preset.density, Math.sqrt((viewportWidth * viewportHeight) / 800_000));
  const gridX = Math.ceil(viewportWidth / density);
  const gridY = Math.ceil(viewportHeight / density);

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
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
  gl.uniform2f(uniforms.uRes, viewportWidth, viewportHeight);
  gl.uniform2f(uniforms.uGrid, gridX, gridY);
  gl.uniform2f(
    uniforms.uAnchor,
    (Math.max(pageRect.left, 0) + Math.min(pageRect.right, viewportWidth)) / 2,
    (Math.max(pageRect.top, 0) + Math.min(pageRect.bottom, viewportHeight)) / 2,
  );
  gl.uniform1f(uniforms.uDensity, density);
  gl.uniform1f(uniforms.uSpread, preset.spread);
  gl.uniform1f(uniforms.uGravity, preset.gravity);
  gl.uniform1f(uniforms.uSwirl, preset.swirl);
  gl.uniform1f(uniforms.uProgress, progress);
  gl.uniform1f(uniforms.uSize, preset.size);
  gl.uniform1f(uniforms.uDpr, dpr);
  gl.uniform1f(uniforms.uTime, now / 1000);
  gl.uniform1f(uniforms.uDark, dark ? 1 : 0);
  gl.drawArrays(gl.POINTS, 0, gridX * gridY);
  gl.flush();

  if (!firstFrameDrawn) {
    firstFrameDrawn = true;
    self.postMessage({ type: 'first-frame' });
  }
}

function draw(now) {
  if (!renderer || !ready) return;
  const progress = Math.min(Math.max((now - startedAt) / renderer.duration, 0), 1);
  renderFrame(now, progress);
  if (progress < 1) self.requestAnimationFrame(draw);
}

function start() {
  if (!renderer || !ready || !playRequested || startedAt !== 0) return;
  startedAt = performance.now();
  self.requestAnimationFrame(draw);
}

self.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'init') {
    initialize(message);
    return;
  }
  if (message.type === 'texture') {
    if (!renderer) {
      message.bitmap.close();
      fail('Particle texture arrived before renderer initialization.');
      return;
    }
    const { gl, texture } = renderer;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, message.bitmap);
    message.bitmap.close();
    ready = true;
    renderFrame(performance.now(), 0);
    start();
    return;
  }
  playRequested = true;
  start();
};
