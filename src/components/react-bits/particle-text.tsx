// Accessible local adaptation of React Bits Particle Text with theme-aware
// colors, a static fallback, and bounded animation work.
// React Bits Particle Text 的无障碍本地化实现，支持主题色、静态回退与
// 有界动画开销。
'use client';

import { type CSSProperties, useEffect, useRef } from 'react';
import { useMotionPreferences } from '@/runtime/motion/provider';

type ParticleTextTrigger = 'mount' | 'hover' | 'click';

interface ParticleTextProps {
  className?: string;
  color?: string;
  density?: number;
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  gatherDuration?: number;
  glow?: boolean;
  highlightColor?: string;
  idleDrift?: number;
  particleSize?: number;
  pointerRepel?: number;
  repelRadius?: number;
  roundedCharacters?: string;
  scatter?: number;
  shortenedCharacters?: string;
  stagger?: number;
  style?: CSSProperties;
  text?: string;
  trigger?: ParticleTextTrigger;
}

interface RgbColor {
  b: number;
  g: number;
  r: number;
}

interface Particle {
  color: string;
  delay: number;
  depth: number;
  seed: number;
  size: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
}

interface GlyphBounds {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  radius: number;
}

const GLYPH_ALPHA_THRESHOLD = 40;
const ROUNDED_GLYPH_RADIUS_RATIO = 0.22;
const SHORTENED_GLYPH_ARM_RATIO = 0.1;
const SHORTENED_GLYPH_CAP_ZONE_RATIO = 0.28;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

function mixRgb(from: RgbColor, to: RgbColor, amount: number): RgbColor {
  return {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  };
}

function rgbToCss({ r, g, b }: RgbColor) {
  return `rgb(${r}, ${g}, ${b})`;
}

function isOutsideRoundedCorner(x: number, y: number, bounds: GlyphBounds) {
  const { maxX, maxY, minX, minY, radius } = bounds;
  if (x < minX || x > maxX || y < minY || y > maxY) return false;

  const inLeftCorner = x < minX + radius;
  const inRightCorner = x > maxX - radius;
  const inTopCorner = y < minY + radius;
  const inBottomCorner = y > maxY - radius;
  if (!(inLeftCorner || inRightCorner) || !(inTopCorner || inBottomCorner)) return false;

  const centerX = inLeftCorner ? minX + radius : maxX - radius;
  const centerY = inTopCorner ? minY + radius : maxY - radius;
  return (x - centerX) ** 2 + (y - centerY) ** 2 > radius ** 2;
}

function isInsideShortenedArm(x: number, y: number, bounds: GlyphBounds) {
  const { maxX, maxY, minX, minY } = bounds;
  if (x < minX || x > maxX || y < minY || y > maxY) return false;

  const width = maxX - minX;
  const height = maxY - minY;
  const inCap =
    y < minY + height * SHORTENED_GLYPH_CAP_ZONE_RATIO ||
    y > maxY - height * SHORTENED_GLYPH_CAP_ZONE_RATIO;
  return inCap && x > maxX - width * SHORTENED_GLYPH_ARM_RATIO;
}

function resolveColor(value: string, container: HTMLElement): { css: string; rgb: RgbColor } {
  const probe = document.createElement('span');
  probe.style.color = value;
  probe.style.display = 'none';
  container.appendChild(probe);
  const css = window.getComputedStyle(probe).color;
  probe.remove();

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { css, rgb: { r: 255, g: 255, b: 255 } };

  context.fillStyle = css;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return { css, rgb: { r, g, b } };
}

function resolveFontSize(
  value: number | string,
  container: HTMLElement,
  fontWeight: string,
  fontFamily: string,
) {
  if (typeof value === 'number') return value;

  const probe = document.createElement('span');
  probe.textContent = 'M';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.fontFamily = fontFamily;
  probe.style.fontSize = value;
  probe.style.fontWeight = fontWeight;
  container.appendChild(probe);
  const size = Number.parseFloat(window.getComputedStyle(probe).fontSize) || 96;
  probe.remove();
  return size;
}

async function waitForFonts(font: string, text: string) {
  if (!('fonts' in document)) return;

  try {
    await document.fonts.load(font, text);
  } catch {
    // A failed font probe should not prevent the system-font fallback.
    // 字体探测失败时仍允许使用系统字体回退。
  }

  await document.fonts.ready;
}

export function ParticleText({
  className = '',
  color = 'var(--color-brand-start)',
  density = 4,
  fontFamily = 'inherit',
  fontSize = 'inherit',
  fontWeight = 'inherit',
  gatherDuration = 1600,
  glow = true,
  highlightColor = 'var(--color-brand-end)',
  idleDrift = 0.7,
  particleSize = 2,
  pointerRepel = 40,
  repelRadius = 120,
  roundedCharacters = '',
  scatter = 180,
  shortenedCharacters = '',
  stagger = 420,
  style,
  text = 'React Bits',
  trigger = 'mount',
}: ParticleTextProps) {
  const { effectiveLevel } = useMotionPreferences();
  const mediumMotion = effectiveLevel === 'medium';

  const containerRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) {
      container.dataset.fallback = '';
      return;
    }

    let animationFrame: number | null = null;
    let resizeFrame: number | null = null;
    let buildId = 0;
    let particles: Particle[] = [];
    let gathering = false;
    let gatherStart = 0;
    let inView = true;
    let width = 0;
    let height = 0;
    let highlightCss = highlightColor;
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = effectiveLevel === 'low';
    const intensityScale = mediumMotion ? 0.6 : 1;

    const pointer = {
      active: false,
      smoothX: 0,
      smoothY: 0,
      x: 0,
      y: 0,
    };

    const setReady = (ready: boolean) => {
      if (ready) {
        container.dataset.ready = '';
        delete container.dataset.fallback;
      } else {
        delete container.dataset.ready;
      }
    };

    const showFallback = () => {
      setReady(false);
      container.dataset.fallback = '';
    };

    const stopRenderLoop = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };

    const startGather = (fromScatter = true) => {
      if (!particles.length || reducedMotion) return;

      const spread = Math.max(0, scatter * intensityScale);
      for (const particle of particles) {
        if (fromScatter) {
          const angle = particle.seed * Math.PI * 2;
          const distance = spread * (0.35 + particle.depth * 0.75);
          particle.x =
            particle.targetX + Math.cos(angle) * distance + (particle.depth - 0.5) * spread * 0.55;
          particle.y =
            particle.targetY + Math.sin(angle) * distance + (particle.seed - 0.5) * spread * 0.55;
        }

        particle.startX = particle.x;
        particle.startY = particle.y;
        particle.delay = particle.seed * Math.max(0, stagger);
      }

      gatherStart = performance.now();
      gathering = true;
    };

    const drawParticle = (particle: Particle) => {
      context.fillStyle = particle.color;
      if (particle.size <= 2.1) {
        context.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size,
        );
        return;
      }

      context.beginPath();
      context.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      context.fill();
    };

    const render = (now: number) => {
      animationFrame = null;
      if (!inView || reducedMotion) return;

      context.clearRect(0, 0, width, height);
      if (glow) {
        context.shadowBlur = particleSize * 2.2;
        context.shadowColor = highlightCss;
      } else {
        context.shadowBlur = 0;
      }

      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18;

      let gatherComplete = true;
      let positionsSettled = true;
      for (const particle of particles) {
        let baseX = particle.targetX;
        let baseY = particle.targetY;
        let progress = 1;

        if (gathering) {
          const local = (now - gatherStart - particle.delay) / Math.max(1, gatherDuration);
          progress = clamp(local, 0, 1);
          const eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) gatherComplete = false;
        } else if (idleDrift > 0) {
          const driftTime = now * 0.001;
          baseX += Math.sin(driftTime * 0.9 + particle.seed * 10) * idleDrift * particle.depth;
          baseY += Math.cos(driftTime * 0.75 + particle.depth * 10) * idleDrift * particle.depth;
        }

        if (pointer.active && pointerRepel > 0 && repelRadius > 0) {
          const dx = baseX - pointer.smoothX;
          const dy = baseY - pointer.smoothY;
          const distance = Math.hypot(dx, dy);
          const effectiveRepelRadius = repelRadius * (mediumMotion ? 0.8 : 1);
          if (distance > 0 && distance < effectiveRepelRadius) {
            const force =
              (1 - distance / effectiveRepelRadius) ** 2 * pointerRepel * intensityScale;
            baseX += (dx / distance) * force;
            baseY += (dy / distance) * force;
          }
        }

        particle.x += (baseX - particle.x) * 0.22;
        particle.y += (baseY - particle.y) * 0.22;
        if (Math.abs(particle.x - baseX) > 0.15 || Math.abs(particle.y - baseY) > 0.15) {
          positionsSettled = false;
        }
        context.globalAlpha = clamp(0.35 + progress * 0.65, 0, 1);
        drawParticle(particle);
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
      if (gathering && gatherComplete) gathering = false;

      const pointerSettling =
        Math.abs(pointer.smoothX - pointer.x) > 0.1 || Math.abs(pointer.smoothY - pointer.y) > 0.1;
      if (gathering || idleDrift > 0 || !positionsSettled || pointerSettling) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const ensureRenderLoop = () => {
      if (animationFrame === null && inView && !reducedMotion) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const sampleText = async () => {
      const currentBuild = ++buildId;
      stopRenderLoop();

      if (reducedMotion) {
        particles = [];
        gathering = false;
        pointer.active = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        showFallback();
        return;
      }

      const rect = container.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) {
        setReady(false);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const computed = window.getComputedStyle(container);
      const resolvedFamily = fontFamily === 'inherit' ? computed.fontFamily : fontFamily;
      const resolvedWeight = fontWeight === 'inherit' ? computed.fontWeight : String(fontWeight);
      const resolvedSize =
        fontSize === 'inherit'
          ? Number.parseFloat(computed.fontSize) || 96
          : resolveFontSize(fontSize, container, resolvedWeight, resolvedFamily);
      const font = `${resolvedWeight} ${resolvedSize}px ${resolvedFamily}`;

      await waitForFonts(font, text);
      if (currentBuild !== buildId) return;

      const offscreen = document.createElement('canvas');
      const offscreenContext = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offscreenContext) {
        showFallback();
        return;
      }

      const content = String(text || ' ');
      offscreenContext.font = font;
      offscreenContext.letterSpacing = computed.letterSpacing;
      const metrics = offscreenContext.measureText(content);

      const left = Math.ceil(metrics.actualBoundingBoxLeft || 0);
      const right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width);
      const ascent = Math.ceil(metrics.actualBoundingBoxAscent || resolvedSize * 0.78);
      const descent = Math.ceil(metrics.actualBoundingBoxDescent || resolvedSize * 0.22);
      const padding = Math.max(12, Math.ceil(resolvedSize * 0.08));
      const textWidth = Math.max(1, Math.ceil(metrics.width), left + right);
      const textHeight = Math.max(1, ascent + descent);

      offscreen.width = textWidth + padding * 2;
      offscreen.height = textHeight + padding * 2;
      offscreenContext.font = font;
      offscreenContext.letterSpacing = computed.letterSpacing;
      offscreenContext.textAlign = 'left';
      offscreenContext.textBaseline = 'alphabetic';
      offscreenContext.fillStyle = '#ffffff';
      offscreenContext.fillText(content, padding - left, padding + ascent);

      const imageData = offscreenContext.getImageData(0, 0, offscreen.width, offscreen.height);
      const targets: Array<{ x: number; y: number }> = [];
      let glyphMinY = Number.POSITIVE_INFINITY;
      let glyphMaxY = Number.NEGATIVE_INFINITY;

      // Align the sampling rows within the real glyph bounds so curved bottoms
      // are not truncated by an arbitrary grid origin on small screens.
      // 在真实字形边界内对齐采样行，避免小屏下底部曲线被任意网格起点削平。
      for (let y = 0; y < offscreen.height; y += 1) {
        for (let x = 0; x < offscreen.width; x += 1) {
          const alpha = imageData.data[(y * offscreen.width + x) * 4 + 3];
          if (alpha > GLYPH_ALPHA_THRESHOLD) {
            glyphMinY = Math.min(glyphMinY, y);
            glyphMaxY = Math.max(glyphMaxY, y);
          }
        }
      }

      if (!Number.isFinite(glyphMinY) || !Number.isFinite(glyphMaxY)) {
        showFallback();
        return;
      }

      const glyphHeight = glyphMaxY - glyphMinY;
      // Small glyphs need one extra sample between strokes to preserve details
      // such as the straight side of D versus the double curve of O. Motion
      // preferences change animation intensity, never the finished wordmark.
      // 小字形需要在笔画间增加一级采样，以保留 D 的直边与 O 的双侧曲线；
      // 动效偏好只调整动画强度，不降低最终字标的清晰度。
      const samplingScale = glyphHeight < 48 ? 0.75 : 1;
      const step = Math.max(2, Math.round(density * samplingScale));
      const firstSampleY = glyphMinY + Math.floor((glyphHeight % step) / 2);
      const verticalOffset = height / 2 - (glyphMinY + glyphMaxY) / 2;
      const roundedCharacterSet = new Set(Array.from(roundedCharacters));
      const shortenedCharacterSet = new Set(Array.from(shortenedCharacters));
      const characters = Array.from(content);
      const drawableCharacters = characters.filter((character) => !/^\s$/u.test(character));
      const glyphRuns: Array<{ maxX: number; minX: number }> = [];
      let runStart: number | null = null;

      for (let x = 0; x < offscreen.width; x += 1) {
        let columnHasInk = false;
        for (let y = glyphMinY; y <= glyphMaxY; y += 1) {
          const alpha = imageData.data[(y * offscreen.width + x) * 4 + 3];
          if (alpha > GLYPH_ALPHA_THRESHOLD) {
            columnHasInk = true;
            break;
          }
        }

        if (columnHasInk && runStart === null) runStart = x;
        if (!columnHasInk && runStart !== null) {
          glyphRuns.push({ maxX: x - 1, minX: runStart });
          runStart = null;
        }
      }
      if (runStart !== null) glyphRuns.push({ maxX: offscreen.width - 1, minX: runStart });

      const glyphBounds =
        glyphRuns.length === drawableCharacters.length
          ? glyphRuns.map<GlyphBounds>(({ maxX, minX }) => ({
              maxX,
              maxY: glyphMaxY,
              minX,
              minY: glyphMinY,
              radius: Math.min(maxX - minX, glyphHeight) * ROUNDED_GLYPH_RADIUS_RATIO,
            }))
          : [];
      const roundedGlyphBounds = glyphBounds.filter((_, index) =>
        roundedCharacterSet.has(drawableCharacters[index] ?? ''),
      );
      const shortenedGlyphBounds = glyphBounds.filter((_, index) =>
        shortenedCharacterSet.has(drawableCharacters[index] ?? ''),
      );

      for (let y = firstSampleY; y <= glyphMaxY; y += step) {
        for (let x = 0; x < offscreen.width; x += step) {
          const alpha = imageData.data[(y * offscreen.width + x) * 4 + 3];
          const outsideRoundedGlyph = roundedGlyphBounds.some((bounds) =>
            isOutsideRoundedCorner(x, y, bounds),
          );
          const insideShortenedArm = shortenedGlyphBounds.some((bounds) =>
            isInsideShortenedArm(x, y, bounds),
          );
          if (alpha > GLYPH_ALPHA_THRESHOLD && !outsideRoundedGlyph && !insideShortenedArm) {
            targets.push({
              x: width / 2 - offscreen.width / 2 + x,
              y: verticalOffset + y,
            });
          }
        }
      }

      if (!targets.length || currentBuild !== buildId) {
        if (currentBuild === buildId) showFallback();
        return;
      }

      const base = resolveColor(color, container);
      const highlight = resolveColor(highlightColor, container);
      highlightCss = highlight.css;
      const maxParticles = Math.max(700, Math.min(3000, Math.floor((width * height) / 85)));
      const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      const selected = targets.filter((_, index) => index % stride === 0);

      particles = selected.map((target, index) => {
        const seed = ((index * 9301 + 49297) % 233280) / 233280;
        const depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9;
        const blend = clamp(target.x / Math.max(1, width) + (seed - 0.5) * 0.22, 0, 1);
        const angle = seed * Math.PI * 2;
        const effectiveScatter = scatter * intensityScale;
        const distance = effectiveScatter * (0.35 + depth * 0.75);
        const startX =
          target.x + Math.cos(angle) * distance + (seed - 0.5) * effectiveScatter * 0.4;
        const startY =
          target.y + Math.sin(angle) * distance + (depth - 0.9) * effectiveScatter * 0.4;

        return {
          color: rgbToCss(mixRgb(base.rgb, highlight.rgb, blend)),
          delay: seed * stagger,
          depth,
          seed,
          size: Math.max(0.6, particleSize),
          startX,
          startY,
          targetX: target.x,
          targetY: target.y,
          x: startX,
          y: startY,
        };
      });

      pointer.x = width / 2;
      pointer.y = height / 2;
      pointer.smoothX = pointer.x;
      pointer.smoothY = pointer.y;
      setReady(true);
      startGather(false);
      ensureRenderLoop();
    };

    const queueSample = () => {
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        void sampleText();
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      ensureRenderLoop();
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      ensureRenderLoop();
    };

    const handlePointerEnter = (event: PointerEvent) => {
      handlePointerMove(event);
      if (trigger === 'hover') startGather(true);
      ensureRenderLoop();
    };

    const handleClick = () => {
      if (trigger === 'click') {
        startGather(true);
        ensureRenderLoop();
      }
    };

    const handleHoverChange = () => {
      if (hoverQuery.matches) {
        canvas.addEventListener('pointerenter', handlePointerEnter);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerleave', handlePointerLeave);
      } else {
        canvas.removeEventListener('pointerenter', handlePointerEnter);
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerleave', handlePointerLeave);
        pointer.active = false;
      }
    };

    hoverQuery.addEventListener('change', handleHoverChange);
    canvas.addEventListener('click', handleClick);
    handleHoverChange();

    const resizeObserver = new ResizeObserver(queueSample);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver((entries) => {
      inView = entries.at(-1)?.isIntersecting ?? true;
      if (inView) ensureRenderLoop();
      else stopRenderLoop();
    });
    intersectionObserver.observe(container);

    const themeObserver = new MutationObserver(queueSample);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ['class', 'style'],
      attributes: true,
    });

    void sampleText();

    return () => {
      buildId += 1;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      hoverQuery.removeEventListener('change', handleHoverChange);
      canvas.removeEventListener('pointerenter', handlePointerEnter);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
      stopRenderLoop();
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    };
  }, [
    color,
    density,
    effectiveLevel,
    fontFamily,
    fontSize,
    fontWeight,
    gatherDuration,
    glow,
    highlightColor,
    idleDrift,
    mediumMotion,
    particleSize,
    pointerRepel,
    repelRadius,
    roundedCharacters,
    scatter,
    shortenedCharacters,
    stagger,
    text,
    trigger,
  ]);

  return (
    <span className={`rb-particle-text ${className}`} ref={containerRef} style={style}>
      <span aria-hidden="true" className="rb-particle-text__fallback">
        {text}
      </span>
      <noscript>
        <span aria-hidden="true" className="rb-particle-text__noscript">
          {text}
        </span>
      </noscript>
      <canvas className="rb-particle-text__canvas" ref={canvasRef} />
    </span>
  );
}

export default ParticleText;
