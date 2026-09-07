/**
 * hero.js — Hero canvas animation
 * Full-screen canvas: animated perspective grid + robot + orbiting particles
 */

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  let ctx, W, H;
  let t = 0;
  let rafId;

  // Robot state
  const robot = {
    angle: -Math.PI / 2,   // facing up
    lidarAngle: 0,
    brushAngle: 0,
    scale: 1,
    scaleDir: 1,
    scaleT: 0,
  };

  // Particles
  const PARTICLE_COUNT = 60;
  const particles = [];

  function init() {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx;
    W = setup.W;
    H = setup.H;

    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }

    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function createParticle() {
    const orbitR  = 70 + Math.random() * 50; // tight planetary halo right around robot body
    const angle   = Math.random() * Math.PI * 2;
    const speed   = (0.0025 + Math.random() * 0.004) * (Math.random() < 0.5 ? 1 : -1);
    const size    = 1 + Math.random() * 2.2;
    const opacity = 0.25 + Math.random() * 0.6;
    const color   = Math.random() < 0.6 ? '#00D4FF' :
                    Math.random() < 0.5 ? '#7B4FFF' : '#00E58A';
    return { orbitR, angle, speed, size, opacity, color, trail: [] };
  }

  function getRobotCenter(W, H) {
    if (W > 1100) {
      return { cx: W * 0.83, cy: H * 0.48, R: Math.min(W, H) * 0.12 };
    } else if (W > 768) {
      return { cx: W * 0.82, cy: H * 0.48, R: Math.min(W, H) * 0.10 };
    } else {
      return { cx: W * 0.5, cy: H * 0.78, R: Math.min(W, H) * 0.10 };
    }
  }

  function loop() {
    t += 0.008;
    rafId = requestAnimationFrame(loop);

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, W, H);

    const pos = getRobotCenter(W, H);

    drawGrid(ctx, W, H, t);
    drawVignette(ctx, W, H);
    updateAndDrawParticles(ctx, W, H, pos.cx, pos.cy, pos.R, t);
    drawRobotHero(ctx, W, H, pos, t);
  }

  function drawGrid(ctx, W, H, t) {
    const horizon = H * 0.52;
    const cx      = W * 0.5;

    ctx.save();

    // Perspective vertical lines
    const vLines = 18;
    for (let i = 0; i <= vLines; i++) {
      const u = i / vLines;
      const bx = u * W;
      ctx.beginPath();
      ctx.moveTo(cx + (bx - cx) * 0.02, horizon);
      ctx.lineTo(bx, H);
      ctx.strokeStyle = `rgba(0,212,255,${0.04 + Math.sin(u * Math.PI) * 0.03})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Horizontal lines scrolling toward viewer
    const hLines = 14;
    for (let i = 0; i <= hLines; i++) {
      const u = ((i / hLines) + t * 0.18) % 1;
      // Perspective: lines closer to horizon are compressed, near viewer are spread
      const y = horizon + (H - horizon) * (u * u);
      const alpha = 0.035 + u * 0.055;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawVignette(ctx, W, H) {
    // Radial vignette so robot center pops
    const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, 'rgba(8,12,20,0)');
    g.addColorStop(1, 'rgba(8,12,20,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function updateAndDrawParticles(ctx, W, H, cx, cy, R, t) {
    for (const p of particles) {
      p.angle += p.speed;

      const orbitRadius = p.orbitR * (R / 100);
      const x = cx + Math.cos(p.angle) * orbitRadius;
      const y = cy + Math.sin(p.angle) * orbitRadius * 0.42; // elliptical orbit around robot center

      // Trail
      p.trail.push({ x, y });
      if (p.trail.length > 14) p.trail.shift();

      // Draw trail
      if (p.trail.length > 1) {
        for (let i = 1; i < p.trail.length; i++) {
          const prog = i / p.trail.length;
          ctx.beginPath();
          ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
          const a = p.opacity * prog * 0.6;
          ctx.strokeStyle = p.color === '#00D4FF' ? `rgba(0,212,255,${a})` : (p.color === '#7B4FFF' ? `rgba(123,79,255,${a})` : `rgba(0,229,138,${a})`);
          ctx.lineWidth = p.size * prog * 0.6;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Head dot
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawRobotHero(ctx, W, H, pos, t) {
    // Robot sits cleanly on the right side of the hero text
    const cx = pos.cx;
    const cy = pos.cy;
    const R  = pos.R;

    // Slow drift
    const drift = Math.sin(t * 0.7) * 4;
    const driftY = Math.cos(t * 0.5) * 2;

    // Update angles
    robot.lidarAngle += 0.045;
    robot.brushAngle -= 0.065;

    // Breathing scale
    robot.scaleT += 0.008;
    robot.scale = 1 + Math.sin(robot.scaleT) * 0.018;

    ctx.save();
    ctx.translate(cx + drift, cy + driftY);
    ctx.scale(robot.scale, robot.scale);

    // Ground shadow
    const shadowG = ctx.createRadialGradient(0, R * 0.6, 0, 0, R * 0.6, R * 1.2);
    shadowG.addColorStop(0, 'rgba(0,212,255,0.12)');
    shadowG.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.beginPath();
    ctx.ellipse(0, R * 0.6, R * 1.1, R * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadowG;
    ctx.fill();

    ctx.restore();

    drawRobot(ctx, cx + drift, cy + driftY, R, robot.angle, robot.lidarAngle, robot.brushAngle);
  }

  // Re-init on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 120);
  });

  init();
})();
