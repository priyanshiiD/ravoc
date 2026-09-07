/**
 * cleaning.js — Four-Stage Cleaning Mechanism Animation
 * Side/cross-section view showing the complete debris flow.
 */

(function () {
  const canvas   = document.getElementById('cleaning-canvas');
  const playBtn  = document.getElementById('cleaning-play-btn');
  const resetBtn = document.getElementById('cleaning-reset-btn');
  if (!canvas) return;

  let ctx, W, H, rafId;

  // Animation state
  let playing     = false;
  let currentStep = 0;      // 0=idle, 1=side brush, 2=roller, 3=suction, 4=collect
  let stepT       = 0;      // progress within current step (0–1)
  let stepTimer   = 0;
  const STEP_DURATION = 200; // frames per step

  // Particle systems
  let particles    = [];
  let dustbinLevel = 0;     // 0–1 (fill level)

  // Brush angles
  let sideBrushAngle  = 0;
  let rollerAngle     = 0;

  // Debris particles on the floor
  let floorDebris = [];

  function init() {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx; W = setup.W; H = setup.H;

    spawnFloorDebris();

    playBtn.addEventListener('click', () => {
      if (!playing) {
        playing = true;
        currentStep = 1;
        stepTimer = 0;
        playBtn.textContent = 'Playing...';
        playBtn.disabled = true;
        updateStepHighlight(1);
      }
    });

    resetBtn.addEventListener('click', () => {
      playing = false;
      currentStep = 0;
      stepTimer = 0;
      particles = [];
      dustbinLevel = 0;
      sideBrushAngle = 0;
      rollerAngle = 0;
      spawnFloorDebris();
      playBtn.textContent = 'Play Animation';
      playBtn.disabled = false;
      updateStepHighlight(0);
    });

    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function spawnFloorDebris() {
    floorDebris = [];
    const cx = W * 0.5;
    const floorY = H * 0.78;
    const spread = W * 0.38;
    for (let i = 0; i < 28; i++) {
      floorDebris.push({
        x: cx + (Math.random() - 0.5) * spread,
        y: floorY + Math.random() * H * 0.06,
        size: 2.5 + Math.random() * 3.5,
        color: Math.random() < 0.5 ? '#6A7A6A' : '#8A7040',
        swept: false,
      });
    }
  }

  function loop() {
    rafId = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);

    if (playing) {
      stepTimer++;
      stepT = Math.min(1, stepTimer / STEP_DURATION);

      sideBrushAngle -= 0.08;
      if (currentStep >= 2) rollerAngle += 0.12;

      // Advance steps
      if (stepTimer >= STEP_DURATION) {
        stepTimer = 0;
        stepT = 0;
        if (currentStep < 4) {
          currentStep++;
          updateStepHighlight(currentStep);
          if (currentStep === 4) {
            setTimeout(() => {
              playBtn.textContent = 'Play Animation';
              playBtn.disabled = false;
              playing = false;
              currentStep = 0;
              updateStepHighlight(0);
            }, 2000);
          }
        }
      }
    }

    // Update & spawn particles based on step
    if (playing) {
      spawnParticles();
      updateParticles();
    }

    // Draw scene layers
    drawRobotBody(ctx);
    drawSideBrush(ctx);
    drawRollerBrush(ctx);
    drawSuctionChannel(ctx);
    drawDustbin(ctx);
    drawFloor(ctx);
    drawFloorDebris(ctx);
    drawParticles(ctx);
    drawStepLabel(ctx);
  }

  function drawBackground(ctx) {
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, W, H);
    // Subtle lines
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFloor(ctx) {
    const floorY = H * 0.78;
    // Floor surface
    const g = ctx.createLinearGradient(0, floorY, 0, H);
    g.addColorStop(0, 'rgba(30,50,80,0.9)');
    g.addColorStop(1, 'rgba(10,16,28,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, floorY, W, H - floorY);

    // Floor line
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.strokeStyle = 'rgba(0,212,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawRobotBody(ctx) {
    const bodyX = W * 0.5;
    const bodyY = H * 0.42;
    const bodyW = W * 0.7;
    const bodyH = H * 0.32;
    const r     = bodyH * 0.4;

    // Body glow
    const glow = ctx.createRadialGradient(bodyX, bodyY, 0, bodyX, bodyY, bodyW * 0.6);
    glow.addColorStop(0, 'rgba(0,212,255,0.07)');
    glow.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.beginPath();
    ctx.ellipse(bodyX, bodyY, bodyW * 0.6, bodyH * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Body shape
    const bg = ctx.createLinearGradient(bodyX - bodyW / 2, bodyY - bodyH / 2, bodyX + bodyW / 2, bodyY + bodyH / 2);
    bg.addColorStop(0, '#1E2D48');
    bg.addColorStop(1, '#0A0E1A');
    ctx.beginPath();
    _roundRect(ctx, bodyX - bodyW / 2, bodyY - bodyH / 2, bodyW, bodyH, r);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Panel details
    ctx.beginPath();
    _roundRect(ctx, bodyX - bodyW * 0.38, bodyY - bodyH * 0.32, bodyW * 0.76, bodyH * 0.64, r * 0.5);
    ctx.strokeStyle = 'rgba(0,212,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Intake opening (bottom center)
    const intakeW = bodyW * 0.5, intakeH = bodyH * 0.22;
    ctx.beginPath();
    _roundRect(ctx, bodyX - intakeW / 2, bodyY + bodyH / 2 - intakeH, intakeW, intakeH, intakeH * 0.3);
    ctx.fillStyle = 'rgba(8,12,20,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(123,79,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Suction channel (inside body, going up to dustbin)
    const chnX = bodyX - bodyW * 0.08;
    const chnTop = bodyY - bodyH * 0.1;
    const chnBot = bodyY + bodyH * 0.5 - intakeH * 0.5;
    const g2 = ctx.createLinearGradient(0, chnBot, 0, chnTop);
    g2.addColorStop(0, 'rgba(123,79,255,0.3)');
    g2.addColorStop(1, 'rgba(123,79,255,0.05)');
    ctx.beginPath();
    ctx.rect(chnX - 12, chnTop, 24, chnBot - chnTop);
    ctx.fillStyle = g2;
    ctx.fill();
  }

  function drawSideBrush(ctx) {
    const cx = W * 0.5 - W * 0.32;
    const cy = H * 0.72;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sideBrushAngle);

    const arms = 3;
    const armLen = W * 0.085;

    for (let i = 0; i < arms; i++) {
      ctx.save();
      ctx.rotate((i / arms) * Math.PI * 2);

      // Arm
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -armLen);
      const armAlpha = currentStep >= 1 ? 1 : 0.35;
      ctx.strokeStyle = `rgba(0,229,138,${armAlpha})`;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Tip
      ctx.beginPath();
      ctx.arc(0, -armLen, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,229,138,${armAlpha})`;
      ctx.fill();

      ctx.restore();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#1A2D40';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,229,138,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Step 1 arrow/effect
    if (currentStep === 1 && stepT < 1) {
      const arrowX = cx + Math.cos(sideBrushAngle) * W * 0.065;
      const arrowY = cy + Math.sin(sideBrushAngle) * W * 0.065;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX + W * 0.06, arrowY);
      ctx.strokeStyle = '#00E58A';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function drawRollerBrush(ctx) {
    const bodyX = W * 0.5;
    const bodyH = H * 0.32;
    const bodyY = H * 0.42;
    const brushY = bodyY + bodyH / 2 - bodyH * 0.18;
    const brushW = W * 0.35;
    const brushH = H * 0.055;
    const alpha = currentStep >= 2 ? 1 : 0.3;

    ctx.save();
    ctx.translate(bodyX, brushY);
    ctx.rotate(rollerAngle * 0.5);

    // Roller cylinder
    const rg = ctx.createLinearGradient(-brushW / 2, 0, brushW / 2, 0);
    rg.addColorStop(0,   `rgba(123,79,255,${alpha * 0.5})`);
    rg.addColorStop(0.5, `rgba(150,100,255,${alpha * 0.8})`);
    rg.addColorStop(1,   `rgba(123,79,255,${alpha * 0.5})`);

    ctx.beginPath();
    _roundRect(ctx, -brushW / 2, -brushH / 2, brushW, brushH, brushH * 0.4);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = `rgba(123,79,255,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Bristle lines (rotate with roller)
    ctx.save();
    ctx.translate(bodyX, brushY);
    const numBristles = 10;
    for (let i = 0; i < numBristles; i++) {
      const x = -brushW / 2 + (brushW / numBristles) * i;
      const phase = (i / numBristles) * Math.PI * 2 + rollerAngle;
      const by = Math.sin(phase) * brushH * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, -brushH / 2);
      ctx.lineTo(x + by * 0.5, brushH / 2);
      ctx.strokeStyle = `rgba(180,140,255,${alpha * 0.6})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSuctionChannel(ctx) {
    if (currentStep < 3) return;
    const bodyX = W * 0.5;
    const bodyY = H * 0.42;
    const bodyH = H * 0.32;
    const chnX  = bodyX;
    const chnTop = bodyY - bodyH * 0.05;
    const chnBot = bodyY + bodyH * 0.36;
    const width  = W * 0.055;

    // Channel fill with animated gradient
    const t2 = (Date.now() / 400) % 1;
    const sg = ctx.createLinearGradient(0, chnBot, 0, chnTop);
    sg.addColorStop(0,    'rgba(123,79,255,0)');
    sg.addColorStop(t2,   'rgba(123,79,255,0.55)');
    sg.addColorStop(Math.min(1, t2 + 0.2), 'rgba(180,140,255,0.8)');
    sg.addColorStop(1,    'rgba(123,79,255,0)');

    ctx.beginPath();
    ctx.rect(chnX - width / 2, chnTop, width, chnBot - chnTop);
    ctx.fillStyle = sg;
    ctx.fill();

    // Arrows indicating upward flow
    const arrowCount = 4;
    for (let i = 0; i < arrowCount; i++) {
      const frac = ((i / arrowCount) - t2 * 0.6 + 1) % 1;
      const ay = chnBot - frac * (chnBot - chnTop);
      const aa = frac;
      ctx.save();
      ctx.globalAlpha = aa * 0.7;
      ctx.beginPath();
      ctx.moveTo(chnX, ay);
      ctx.lineTo(chnX - 5, ay + 8);
      ctx.lineTo(chnX + 5, ay + 8);
      ctx.closePath();
      ctx.fillStyle = '#7B4FFF';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawDustbin(ctx) {
    const bodyX = W * 0.5;
    const bodyY = H * 0.42;
    const bodyH = H * 0.32;
    const binW  = W * 0.18, binH = bodyH * 0.45;
    const binX  = bodyX + W * 0.12;
    const binY  = bodyY - bodyH * 0.38;

    // Bin outline
    ctx.beginPath();
    _roundRect(ctx, binX - binW / 2, binY, binW, binH, 6);
    ctx.strokeStyle = 'rgba(0,212,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill level
    const fillH = binH * dustbinLevel;
    if (dustbinLevel > 0) {
      const fg = ctx.createLinearGradient(0, binY + binH, 0, binY + binH - fillH);
      fg.addColorStop(0, 'rgba(100,85,55,0.8)');
      fg.addColorStop(1, 'rgba(130,110,70,0.4)');
      ctx.save();
      ctx.beginPath();
      _roundRect(ctx, binX - binW / 2, binY, binW, binH, 6);
      ctx.clip();
      ctx.fillStyle = fg;
      ctx.fillRect(binX - binW / 2, binY + binH - fillH, binW, fillH);
      ctx.restore();
    }

    // HEPA label
    ctx.save();
    ctx.font = `600 10px 'Inter', sans-serif`;
    ctx.fillStyle = 'rgba(0,212,255,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('HEPA', binX, binY - 3);
    ctx.fillText('DUSTBIN', binX, binY + binH + 13);
    ctx.restore();
  }

  function drawFloorDebris(ctx) {
    floorDebris.forEach(d => {
      if (d.swept) return;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function spawnParticles() {
    const bodyX = W * 0.5;
    const bodyY = H * 0.42;
    const bodyH = H * 0.32;
    const intakeY = bodyY + bodyH / 2;

    if (currentStep === 1) {
      // Side brush sweeping debris
      const cx = W * 0.5 - W * 0.32;
      const cy = H * 0.72;
      if (Math.random() < 0.3) {
        floorDebris.forEach(d => {
          if (!d.swept && Math.hypot(d.x - cx, d.y - cy) < W * 0.18 && Math.random() < 0.02) {
            d.swept = true;
            particles.push({
              x: d.x, y: d.y, vx: (bodyX - d.x) * 0.04 + (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 2, size: d.size * 0.8,
              color: d.color, life: 1, phase: 'sweep'
            });
          }
        });
      }
    }

    if (currentStep === 2) {
      // Roller brush collecting
      if (Math.random() < 0.4) {
        floorDebris.forEach(d => {
          if (!d.swept && Math.abs(d.x - bodyX) < W * 0.25 && Math.random() < 0.03) {
            d.swept = true;
            particles.push({
              x: d.x, y: d.y,
              vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 3,
              size: d.size * 0.7, color: d.color, life: 1, phase: 'roller'
            });
          }
        });
      }
    }

    if (currentStep === 3) {
      // Suction pulling particles upward
      if (Math.random() < 0.5) {
        particles.push({
          x: bodyX + (Math.random() - 0.5) * W * 0.08,
          y: intakeY,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(2 + Math.random() * 3),
          size: 2 + Math.random() * 3,
          color: Math.random() < 0.5 ? '#6A7A6A' : '#8A7040',
          life: 1, phase: 'suction'
        });
      }
    }

    if (currentStep === 4) {
      // Particles entering dustbin
      if (Math.random() < 0.3 && dustbinLevel < 1) {
        dustbinLevel = Math.min(1, dustbinLevel + 0.004);
        particles.push({
          x: bodyX + W * 0.12 + (Math.random() - 0.5) * W * 0.05,
          y: bodyY - H * 0.1,
          vx: (Math.random() - 0.5) * 1, vy: 1 + Math.random() * 2,
          size: 2 + Math.random() * 2,
          color: Math.random() < 0.5 ? '#6A7A6A' : '#8A7040',
          life: 1, phase: 'collect'
        });
      }
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.018;
      if (p.phase === 'suction') p.vy -= 0.12; // accelerate upward
      if (p.life <= 0) { particles.splice(i, 1); continue; }
    }
  }

  function drawParticles(ctx) {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life * 0.85;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.phase === 'suction' ? '#7B4FFF' : p.color;
      ctx.fill();
      ctx.restore();
    });
  }

  function drawStepLabel(ctx) {
    if (currentStep === 0) return;
    const labels = ['', 'SIDE BRUSH', 'ROLLER BRUSH', 'SUCTION', 'COLLECTION'];
    const colors = ['', '#00E58A', '#7B4FFF', '#7B4FFF', '#00D4FF'];

    ctx.save();
    ctx.font = `700 12px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = colors[currentStep] || '#00D4FF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.8;
    ctx.fillText(`STAGE ${currentStep}: ${labels[currentStep]}`, W * 0.5, H * 0.06);
    ctx.restore();
  }

  function updateStepHighlight(step) {
    document.querySelectorAll('.cleaning-step').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === step);
    });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  init();
})();
