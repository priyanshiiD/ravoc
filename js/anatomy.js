/**
 * anatomy.js - Exploded component view
 * Interactive top-down robot anatomy with component hotspots.
 */

(function () {
  const canvas  = document.getElementById('anatomy-canvas');
  const explBtn = document.getElementById('anatomy-explode-btn');
  const asmBtn  = document.getElementById('anatomy-assemble-btn');
  const nameEl  = document.getElementById('component-name');
  const roleEl  = document.getElementById('component-role');
  const detailEl = document.getElementById('component-detail');
  const panel   = document.getElementById('anatomy-info-panel');
  if (!canvas) return;

  let ctx, W, H;
  let cx, cy, R;
  let rafId;

  // Animation state
  let explodeT = 0;       // 0 = assembled, 1 = exploded
  let targetT  = 0;
  let lidarAngle = 0;
  let brushAngle = 0;
  let hoveredId  = null;
  let isExploded = false;

  // Component definitions - 8 components evenly distributed radially (45° intervals)
  // Calibrated so max distance from center is ~0.30 * min(W,H), leaving ample margin for labels
  const COMPONENTS = [
    {
      id: 'lidar',
      name: 'LiDAR Sensor',
      role: 'Environment Mapping',
      detail: 'The simulated rotating LiDAR dome models 1,800 infrared distance samples per second at 300 RPM. Distance measurement uses time-of-flight principles to map surrounding geometry.',
      color: '#00D4FF',
      explodeDir: { x: 0, y: -1.4 },
      basePos: (R) => ({ x: 0, y: -R * 0.08 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx;
        const ey = cy + (-R * 0.08) + (-1.4) * eT * R;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
    {
      id: 'bumper',
      name: 'Bumper Sensor',
      role: 'Physical Contact Detection',
      detail: 'A spring-loaded arc sensor spanning 240° around the front. When compressed by contact with an obstacle, it triggers a stop and course correction to mitigate collision impact.',
      color: '#FF6B35',
      explodeDir: { x: 1.1, y: -1.1 },
      basePos: (R) => ({ x: 0, y: -R * 0.88 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx + 1.1 * eT * R;
        const ey = cy + (-R * 0.88) + (-1.1) * eT * R;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
    {
      id: 'right-wheel',
      name: 'Drive Wheel (R)',
      role: 'Differential Movement',
      detail: 'Paired with the left wheel for independent differential drive. Rotary encoders model wheel rotation to estimate distance traveled for dead-reckoning navigation.',
      color: '#7B4FFF',
      explodeDir: { x: 1.25, y: 0 },
      basePos: (R) => ({ x: R * 0.88, y: 0 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx + (R * 0.88) + 1.25 * eT * R;
        const ey = cy;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
    {
      id: 'contacts',
      name: 'Charging Contacts',
      role: 'Auto-Dock Power Interface',
      detail: 'Two spring-loaded metal contacts at the back of the robot align with the charging station. When docked, these complete the circuit to support fast battery recharging.',
      color: '#8AACCC',
      explodeDir: { x: 1.1, y: 1.1 },
      basePos: (R) => ({ x: 0, y: -R * 0.72 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx + 1.1 * eT * R;
        const ey = cy + (-R * 0.72) + 1.1 * eT * R;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
    {
      id: 'main-brush',
      name: 'Roller Brush',
      role: 'Primary Debris Agitation',
      detail: 'A dual-material counter-rotating roller brush (bristles + rubber blades) runs the intake width. It agitates carpet fibers to release dirt and sweeps hard floors into the suction path.',
      color: '#7B4FFF',
      explodeDir: { x: 0, y: 1.4 },
      basePos: (R) => ({ x: 0, y: R * 0.45 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx;
        const ey = cy + (R * 0.45) + 1.4 * eT * R;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
    {
      id: 'side-brush',
      name: 'Side Brush',
      role: 'Edge & Corner Sweeping',
      detail: 'The three-arm spinning side brush reaches into corners and baseboards beyond the main body profile, sweeping edge debris inward toward the main brush and suction inlet.',
      color: '#00E58A',
      explodeDir: { x: -1.1, y: 1.1 },
      basePos: (R) => ({ x: -R * 0.68, y: R * 0.55 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx + (-R * 0.68) + (-1.1) * eT * R;
        const ey = cy + (R * 0.55) + 1.1 * eT * R;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
    {
      id: 'left-wheel',
      name: 'Drive Wheel (L)',
      role: 'Differential Movement',
      detail: 'Two independently motorized rubber wheels provide differential steering. By varying individual wheel speeds, ROVAC can spin in place, follow arcs, and navigate constrained spaces with fine positional control.',
      color: '#7B4FFF',
      explodeDir: { x: -1.25, y: 0 },
      basePos: (R) => ({ x: -R * 0.88, y: 0 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx + (-R * 0.88) + (-1.25) * eT * R;
        const ey = cy;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
    {
      id: 'dustbin',
      name: 'Dustbin + HEPA Filter',
      role: 'Debris Collection & Filtration',
      detail: 'The integrated dustbin collects captured debris. Air passes through a HEPA filtration stage designed to trap fine particles before exhaust air leaves the enclosure.',
      color: '#00D4FF',
      explodeDir: { x: -1.1, y: -1.1 },
      basePos: (R) => ({ x: 0, y: -R * 0.4 }),
      hitTest: (mx, my, cx, cy, R, eT) => {
        const ex = cx + (-1.1) * eT * R;
        const ey = cy + (-R * 0.4) + (-1.1) * eT * R;
        return Math.hypot(mx - ex, my - ey) < R * 0.8;
      },
    },
  ];

  function init() {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx; W = setup.W; H = setup.H;
    cx = W / 2; cy = H / 2;
    // Calibrated robot radius so explosion fits safely within canvas boundaries
    R  = Math.min(W, H) * 0.14;

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onClick);

    explBtn.addEventListener('click', () => { targetT = 1; isExploded = true; });
    asmBtn.addEventListener('click',  () => {
      targetT = 0; isExploded = false;
      hoveredId = null;
      resetPanel();
    });

    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);

    // Smooth explode interpolation
    explodeT += (targetT - explodeT) * 0.06;
    lidarAngle += 0.04;
    brushAngle -= 0.055;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0D1422';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    drawBackgroundGrid(ctx, W, H);

    if (explodeT < 0.05) {
      // Fully assembled -- draw normally
      drawRobot(ctx, cx, cy, R, 0, lidarAngle, brushAngle);
    } else {
      drawExploded(ctx, explodeT);
    }
  }

  function drawBackgroundGrid(ctx, W, H) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.04)';
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawExploded(ctx, eT) {
    // Keep translucent robot chassis in center for visual reference frame
    ctx.save();
    ctx.globalAlpha = 0.22;
    drawRobot(ctx, cx, cy, R, 0, lidarAngle, brushAngle);
    ctx.restore();

    // Draw each component offset outward
    COMPONENTS.forEach(comp => {
      const base = comp.basePos(R);
      const ex = cx + base.x + comp.explodeDir.x * eT * R;
      const ey = cy + base.y + comp.explodeDir.y * eT * R;
      const isHovered = comp.id === hoveredId;

      // Connector line from base chassis pos to exploded pos
      if (eT > 0.1) {
        ctx.save();
        ctx.globalAlpha = isHovered ? 0.9 : eT * 0.35;
        ctx.setLineDash(isHovered ? [] : [3, 4]);
        ctx.strokeStyle = comp.color;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + base.x, cy + base.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      drawExplodedComponent(ctx, comp, ex, ey, eT, isHovered);

      // Label pill
      if (eT > 0.4) {
        const labelAlpha = Math.min(1, (eT - 0.4) / 0.6);
        drawComponentLabel(ctx, comp, ex, ey, labelAlpha, isHovered);
      }
    });
  }

  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(0,212,255,${alpha})`;
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
  }

  function drawExplodedComponent(ctx, comp, x, y, eT, isHovered) {
    ctx.save();
    ctx.translate(x, y);

    const cr = comp.color;

    // Glow ring
    if (isHovered) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.35);
      g.addColorStop(0, hexToRgba(cr, 0.35));
      g.addColorStop(1, hexToRgba(cr, 0));
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // Draw the specific component visually
    drawComponentShape(ctx, comp, R * 0.28, isHovered);

    ctx.restore();
  }

  function drawComponentShape(ctx, comp, r, isHovered) {
    const alpha = isHovered ? 1 : 0.75;
    ctx.globalAlpha = alpha;

    switch (comp.id) {
      case 'lidar':
        // Dome circle
        const dg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        dg.addColorStop(0, 'rgba(0,220,255,0.5)');
        dg.addColorStop(1, 'rgba(0,100,180,0.2)');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = dg;
        ctx.fill();
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Spinning arm
        ctx.save();
        ctx.rotate(lidarAngle * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.7);
        ctx.strokeStyle = '#00D4FF'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        break;

      case 'bumper':
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.7, Math.PI * 0.7);
        ctx.strokeStyle = '#FF6B35';
        ctx.lineWidth = r * 0.28;
        ctx.lineCap = 'round';
        ctx.stroke();
        break;

      case 'left-wheel':
      case 'right-wheel':
        _roundRect(ctx, -r * 0.5, -r, r, r * 2, r * 0.25);
        ctx.fillStyle = '#111824';
        ctx.fill();
        ctx.strokeStyle = '#7B4FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Tread lines
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.5 + 3, i * r * 0.3);
          ctx.lineTo(r * 0.5 - 3, i * r * 0.3);
          ctx.strokeStyle = 'rgba(123,79,255,0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        break;

      case 'side-brush':
        ctx.save();
        ctx.rotate(brushAngle * 2);
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i / 3) * Math.PI * 2);
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(0, -r);
          ctx.strokeStyle = '#00E58A';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, -r, r * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = '#00E58A';
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#1A2D40';
        ctx.fill();
        ctx.strokeStyle = '#00E58A';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        break;

      case 'main-brush':
        _roundRect(ctx, -r * 1.5, -r * 0.45, r * 3, r * 0.9, r * 0.2);
        ctx.fillStyle = 'rgba(123,79,255,0.2)';
        ctx.fill();
        ctx.strokeStyle = '#7B4FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const x = -r * 1.4 + (r * 2.8 / 6) * i;
          ctx.beginPath();
          ctx.moveTo(x, -r * 0.35);
          ctx.lineTo(x, r * 0.35);
          ctx.strokeStyle = 'rgba(123,79,255,0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;

      case 'dustbin':
        _roundRect(ctx, -r * 0.9, -r * 0.55, r * 1.8, r * 1.1, r * 0.2);
        ctx.fillStyle = 'rgba(0,212,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Filter mesh
        ctx.save();
        ctx.beginPath();
        _roundRect(ctx, -r * 0.9, -r * 0.55, r * 1.8, r * 1.1, r * 0.2);
        ctx.clip();
        for (let xi = -5; xi <= 5; xi++) {
          for (let yi = -3; yi <= 3; yi++) {
            ctx.beginPath();
            ctx.arc(xi * r * 0.33, yi * r * 0.33, r * 0.06, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,212,255,0.25)';
            ctx.fill();
          }
        }
        ctx.restore();
        break;

      case 'contacts':
        for (const x of [-r * 0.38, r * 0.38]) {
          _roundRect(ctx, x - r * 0.18, -r * 0.45, r * 0.36, r * 0.9, r * 0.1);
          ctx.fillStyle = 'rgba(180,200,230,0.35)';
          ctx.fill();
          ctx.strokeStyle = '#8AACCC';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;
    }
    ctx.globalAlpha = 1;
  }

  function drawComponentLabel(ctx, comp, x, y, alpha, isHovered) {
    const text = comp.name;
    ctx.save();
    ctx.globalAlpha = alpha;

    const fontSize = 11;
    ctx.font = `600 ${fontSize}px 'Space Grotesk', sans-serif`;
    const tw = ctx.measureText(text).width;
    const pad = 6;
    const lh  = fontSize + 6;

    // Center label pill directly below/beside component
    let lx = x;
    let ly = y + R * 0.42;

    // Clamp label inside canvas with safe margin
    const margin = 10;
    lx = Math.max(tw / 2 + pad + margin, Math.min(W - tw / 2 - pad - margin, lx));
    ly = Math.max(lh / 2 + margin, Math.min(H - lh / 2 - margin, ly));

    // Label pill background
    ctx.beginPath();
    _roundRect(ctx, lx - tw / 2 - pad, ly - lh / 2, tw + pad * 2, lh, 5);
    ctx.fillStyle = isHovered ? `${comp.color}33` : 'rgba(10,16,28,0.92)';
    ctx.fill();
    ctx.strokeStyle = isHovered ? comp.color : `${comp.color}77`;
    ctx.lineWidth = isHovered ? 1.5 : 1;
    ctx.stroke();

    ctx.fillStyle = isHovered ? comp.color : 'rgba(230,240,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx, ly);

    ctx.restore();
  }

  // -- Mouse coordinate helper --
  function getCanvasMouse(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      mx: (e.clientX - rect.left) * (W / rect.width),
      my: (e.clientY - rect.top)  * (H / rect.height),
    };
  }

  // -- Hit detection in exploded state --
  function findHoveredExploded(mx, my) {
    // Component shape radius in drawComponentShape is R*0.28, use R*0.32 hit
    const hitR = R * 0.32;
    for (const comp of COMPONENTS) {
      const base = comp.basePos(R);
      const ex = cx + base.x + comp.explodeDir.x * explodeT * R;
      const ey = cy + base.y + comp.explodeDir.y * explodeT * R;
      if (Math.hypot(mx - ex, my - ey) < hitR) return comp;
    }
    return null;
  }

  // -- Hit detection in assembled state --
  function findHoveredAssembled(mx, my) {
    // If cursor is within robot body, find nearest component by base offset
    if (Math.hypot(mx - cx, my - cy) > R * 1.15) return null;
    let best = null, bestD = Infinity;
    for (const comp of COMPONENTS) {
      const base = comp.basePos(R);
      const d = Math.hypot((mx - cx) - base.x, (my - cy) - base.y);
      if (d < bestD) { bestD = d; best = comp; }
    }
    return best;
  }

  function onMouseMove(e) {
    const { mx, my } = getCanvasMouse(e);

    let comp = null;
    if (explodeT < 0.05) {
      // Fully assembled: hover nearest component inside robot body
      comp = findHoveredAssembled(mx, my);
    } else if (isExploded && explodeT > 0.85) {
      // Fully exploded: hover individual components with tight hit radius
      comp = findHoveredExploded(mx, my);
    }
    // During animation (explodeT 0.05-0.85) disable hover to avoid confusion

    const found = comp ? comp.id : null;
    if (found !== hoveredId) {
      hoveredId = found;
      if (comp) updatePanel(comp);
      else resetPanel();
    }
    canvas.style.cursor = found ? 'pointer' : 'default';
  }

  function onMouseLeave() {
    hoveredId = null;
    resetPanel();
    canvas.style.cursor = 'default';
  }

  function onClick(e) {
    if (hoveredId) {
      const comp = COMPONENTS.find(c => c.id === hoveredId);
      if (comp) updatePanel(comp);
    }
  }


  function updatePanel(comp) {
    nameEl.textContent   = comp.name;
    roleEl.textContent   = comp.role;
    detailEl.textContent = comp.detail;
    nameEl.style.color   = comp.color;
    panel.classList.add('highlighted');
    panel.style.borderColor = comp.color + '44';
  }

  function resetPanel() {
    nameEl.textContent   = 'Select a Component';
    nameEl.style.color   = '';
    roleEl.textContent   = 'Hover over any part of the robot to learn about its function.';
    detailEl.textContent = '';
    panel.classList.remove('highlighted');
    panel.style.borderColor = '';
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('click', onClick);
      init();
    }, 150);
  });

  init();
})();
