import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  wobble: number;
  wobbleSpeed: number;
  shape: 'rect' | 'circle' | 'star';
  alpha: number;
}

const CONFETTI_COLORS = [
  '#facc15', // sunlit gold
  '#22c55e', // meadow green
  '#38bdf8', // sky blue
  '#ec4899', // blossom pink
  '#f97316', // warm tangerine
  '#a855f7', // lavender star
];

function drawStar(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * rad;
    const py = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export const ConfettiOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];

    const spawnWave = (count: number, initialBurst: boolean) => {
      const origins = initialBurst
        ? [0.16, 0.35, 0.5, 0.65, 0.84]
        : [0.25, 0.75];
      for (let i = 0; i < count; i++) {
        const originFrac = origins[i % origins.length];
        const ox = width * originFrac + (Math.random() - 0.5) * 110;
        const oy = initialBurst
          ? height * (0.08 + Math.random() * 0.22)
          : height * 0.14;
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        const speed = 160 + Math.random() * 320;
        const shapes: Particle['shape'][] = ['rect', 'rect', 'circle', 'star'];
        particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed * 1.25,
          vy: initialBurst
            ? -80 - Math.random() * 220
            : Math.sin(angle) * speed * 0.55 - Math.random() * 140,
          size: 7 + Math.random() * 7,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 8,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 4 + Math.random() * 5,
          shape: shapes[i % shapes.length],
          alpha: 1,
        });
      }
    };

    spawnWave(95, true);
    const secondWaveTimer = window.setTimeout(() => {
      spawnWave(55, false);
    }, 650);

    let rafId = 0;
    let lastMs = performance.now();

    const frame = (nowMs: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastMs) / 1000));
      lastMs = nowMs;

      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 320 * dt; // gentle gravity
        p.vx *= 1 - 0.85 * dt; // air drag
        p.wobble += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 35) * dt;
        p.y += p.vy * dt;
        p.rotation += p.vr * dt;

        if (p.y > height * 0.86) {
          p.alpha = Math.max(0, 1 - (p.y - height * 0.86) / (height * 0.2));
        }

        if (p.y > height + 40 || p.alpha <= 0.01) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const tilt = Math.cos(p.wobble) * 0.65 + 0.35;
        ctx.scale(1, Math.max(0.28, Math.abs(tilt)));
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size * 0.65, -p.size * 0.38, p.size * 1.3, p.size * 0.76);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, p.size * 0.65);
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(frame);
      }
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.clearTimeout(secondWaveTimer);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti-overlay"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[35] h-full w-full"
    />
  );
};
