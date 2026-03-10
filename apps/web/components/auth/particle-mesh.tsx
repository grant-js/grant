'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

const PARTICLE_COUNT = 200;
const CONNECT_RADIUS = 200;
const PARTICLE_RADIUS = 1.2;
const BASE_SPEED = 0.2;
const LINE_OPACITY = 0.14;
/** Virtual space extends this far beyond the visible canvas so connections appear from outside the frame */
const FRAME_OFFSET = 140;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Clip line segment (x0,y0)-(x1,y1) to rect [0,w]×[0,h]. Returns visible segment or null. */
function clipSegmentToRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  h: number
): { x0: number; y0: number; x1: number; y1: number } | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let tLow = 0;
  let tHigh = 1;

  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) tHigh = -1;
      return;
    }
    const t = q / p;
    if (p < 0) {
      if (t > tLow) tLow = t;
    } else {
      if (t < tHigh) tHigh = t;
    }
  };

  clip(-dx, x0);
  clip(dx, w - x0);
  clip(-dy, y0);
  clip(dy, h - y0);

  if (tLow > tHigh) return null;
  return {
    x0: x0 + tLow * dx,
    y0: y0 + tLow * dy,
    x1: x0 + tHigh * dx,
    y1: y0 + tHigh * dy,
  };
}

function useParticleMesh(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    if (w <= 0 || h <= 0) return;

    if (particlesRef.current.length === 0) {
      const vW = w + 2 * FRAME_OFFSET;
      const vH = h + 2 * FRAME_OFFSET;
      const cols = Math.ceil(Math.sqrt(PARTICLE_COUNT * (vW / vH)));
      const rows = Math.ceil(PARTICLE_COUNT / cols);
      const stepX = vW / (cols + 1);
      const stepY = vH / (rows + 1);
      const jitter = Math.min(stepX, stepY) * 0.4;
      const particles: Particle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const baseX = -FRAME_OFFSET + stepX * (col + 1);
        const baseY = -FRAME_OFFSET + stepY * (row + 1);
        particles.push({
          x: baseX + (Math.random() - 0.5) * 2 * jitter,
          y: baseY + (Math.random() - 0.5) * 2 * jitter,
          vx: (Math.random() - 0.5) * BASE_SPEED,
          vy: (Math.random() - 0.5) * BASE_SPEED,
        });
      }
      particlesRef.current = particles;
    }
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    let w = canvas.width;
    let h = canvas.height;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = [];
    };

    resize();
    init();

    const left = -FRAME_OFFSET;
    const right = w + FRAME_OFFSET;
    const top = -FRAME_OFFSET;
    const bottom = h + FRAME_OFFSET;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < left || p.x > right) p.vx *= -1;
        if (p.y < top || p.y > bottom) p.vy *= -1;
        p.x = Math.max(left, Math.min(right, p.x));
        p.y = Math.max(top, Math.min(bottom, p.y));
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - particles[i].x;
          const dy = particles[j].y - particles[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist < CONNECT_RADIUS && dist > 0) {
            const ux = dx / dist;
            const uy = dy / dist;
            const x1 = particles[i].x + ux * PARTICLE_RADIUS;
            const y1 = particles[i].y + uy * PARTICLE_RADIUS;
            const x2 = particles[j].x - ux * PARTICLE_RADIUS;
            const y2 = particles[j].y - uy * PARTICLE_RADIUS;
            const clipped = clipSegmentToRect(x1, y1, x2, y2, w, h);
            if (clipped) {
              const alpha = (1 - dist / CONNECT_RADIUS) * LINE_OPACITY;
              ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(clipped.x0, clipped.y0);
              ctx.lineTo(clipped.x1, clipped.y1);
              ctx.stroke();
            }
          }
        }
      }

      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      for (const p of particles) {
        if (p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      resize();
      init();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [canvasRef, init]);

  return { init };
}

/**
 * Lightweight canvas-based particle mesh (connected nodes). No extra dependencies,
 * uses requestAnimationFrame and a modest particle count for snappy 60fps.
 */
export function ParticleMesh({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticleMesh(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 size-full', className)}
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    />
  );
}
