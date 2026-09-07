/**
 * dock.js — Auto-Dock Sequence Animation
 * Full cinematic sequence: battery low → locate dock → navigate → dock → charge.
 */

(function () {
  const canvas  = document.getElementById('dock-canvas');
  const playBtn = document.getElementById('dock-play-btn');
  const steps   = [
    document.getElementById('dock-step-1'),
    document.getElementById('dock-step-2'),
    document.getElementById('dock-step-3'),
    document.getElementById('dock-step-4'),
  ];
  if (!canvas) return;

  let ctx, W, H, rafId;

  // Scene
  let room = {};
  let dockPos = {};
  let robotR = 0;

  // Sequence state
  const PHASE = { IDLE: 0, BATTERY_LOW: 1, LOCATE: 2, NAVIGATE: 3, DOCK: 4, CHARGING: 5 };
  let phase = PHASE.IDLE;
  let phaseT = 0;
  let phaseTimer = 0;
  let playing = false;

  // Robot state
  let robot = {};

  // IR beacon
  let beaconPulses = [];
  let beaconTimer = 0;

  // Return path
  let returnPath = [];
  let pathIdx = 0;

  // Battery
  let battery = 1.0;

  function init() {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx; W = setup.W; H = setup.H;

    const pad = W * 0.1;
    room = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };
    robotR  = Math.min(W, H) * 0.065;
    dockPos = { x: room.x + 18, y: room.y + room.h * 0.5, w: 28, h: 50 };

    resetScene();

    playBtn.addEventListener('click', () => {
      if (!playing) startSequence();
    });

    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function resetScene() {
    robot = {
      x: room.x + room.w * 0.68,
      y: room.y + room.h * 0.55,
      angle: -Math.PI / 2,
      lidarAngle: 0,
      brushAngle: 0,
      speed: 1.5,
    };
    battery = 0.95;
    phase   = PHASE.IDLE;
    phaseT  = 0;
    beaconPulses = [];
    returnPath   = [];
    pathIdx      = 0;
    playing      = false;
    setStepActive(-1);
    playBtn.textContent = 'Watch Docking Sequence';
    playBtn.disabled    = false;
  }

  function startSequence() {
    playing = true;
    setPhase(PHASE.BATTERY_LOW);
    playBtn.disabled = true;
    playBtn.textContent = 'Sequence Playing...';
  }

  function setPhase(p) {
    phase = p;
    phaseTimer = 0;
    phaseT = 0;

    if (p === PHASE.BATTERY_LOW) {
      setStepActive(0);
    } else if (p === PHASE.LOCATE) {
      setStepActive(1);
      beaconPulses = [];
    } else if (p === PHASE.NAVIGATE) {
      setStepActive(2);
      buildReturnPath();
      pathIdx = 0;
    } else if (p === PHASE.DOCK) {
      setStepActive(3);
    } else if (p === PHASE.CHARGING) {
      setStepActive(3);
      steps[3].classList.add('completed');
      setTimeout(() => {
        playBtn.textContent = 'Watch Again';
        playBtn.disabled    = false;
        playBtn.onclick = () => { resetScene(); startSequence(); };
      }, 1500);
    }
  }

  function buildReturnPath() {
    // Simple direct path: robot → dock
    const tx = dockPos.x + dockPos.w + robotR + 8;
    const ty = dockPos.y + dockPos.h / 2;
    const steps2 = 80;
    returnPath = [];
    for (let i = 0; i <= steps2; i++) {
      const t = i / steps2;
      // Bezier curve for cinematic approach
      const cp1x = robot.x, cp1y = robot.y - room.h * 0.15;
      const cp2x = tx + room.w * 0.1, cp2y = ty;
      const bx = bezierX(t, robot.x, cp1x, cp2x, tx);
      const by = bezierY(t, robot.y, cp1y, cp2y, ty);
      returnPath.push({ x: bx, y: by });
    }
  }

  function bezierX(t, p0, p1, p2, p3) {
    return Math.pow(1-t,3)*p0 + 3*Math.pow(1-t,2)*t*p1 + 3*(1-t)*t*t*p2 + t*t*t*p3;
  }
  function bezierY(t, p0, p1, p2, p3) {
    return Math.pow(1-t,3)*p0 + 3*Math.pow(1-t,2)*t*p1 + 3*(1-t)*t*t*p2 + t*t*t*p3;
  }

  function loop() {
    rafId = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);
    drawRoom(ctx);
    drawDockStation(ctx);
    drawReturnTrail(ctx);
    drawBeaconPulses(ctx);

    if (playing) {
      updatePhase();
    } else {
      // Idle: robot wanders slowly
      robot.lidarAngle += 0.04;
    }

    drawRobot(ctx, robot.x, robot.y, robotR, robot.angle, robot.lidarAngle, robot.brushAngle);
    drawBatteryIndicator(ctx);
  }

  function updatePhase() {
    phaseTimer++;
    phaseT = phaseTimer / 100;
    robot.lidarAngle += 0.05;

    if (phase === PHASE.BATTERY_LOW) {
      battery = Math.max(0.05, battery - 0.003);
      if (phaseTimer > 90) setPhase(PHASE.LOCATE);
    }

    else if (phase === PHASE.LOCATE) {
      // Beacon pulses from dock
      beaconTimer++;
      if (beaconTimer % 18 === 0) {
        beaconPulses.push({ r: 5, life: 1 });
      }
      beaconPulses.forEach(p => { p.r += 3.5; p.life -= 0.025; });
      beaconPulses = beaconPulses.filter(p => p.life > 0);

      if (phaseTimer > 120) setPhase(PHASE.NAVIGATE);
    }

    else if (phase === PHASE.NAVIGATE) {
      if (pathIdx < returnPath.length) {
        const target = returnPath[pathIdx];
        const dx = target.x - robot.x;
        const dy = target.y - robot.y;
        const dist = Math.hypot(dx, dy);
        if (dist < robot.speed + 0.5) {
          robot.x = target.x;
          robot.y = target.y;
          pathIdx++;
        } else {
          const ang = Math.atan2(dy, dx);
          let da = ang - robot.angle;
          while (da > Math.PI)  da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          robot.angle += da * 0.12;
          robot.x += (dx / dist) * robot.speed;
          robot.y += (dy / dist) * robot.speed;
        }
      } else {
        setPhase(PHASE.DOCK);
      }
    }

    else if (phase === PHASE.DOCK) {
      // Slide in precisely
      const tx = dockPos.x + dockPos.w / 2;
      const ty = dockPos.y + dockPos.h / 2;
      const dx = tx - robot.x;
      const dy = ty - robot.y;
      const dist = Math.hypot(dx, dy);
      robot.angle += (Math.PI - robot.angle) * 0.1;
      robot.x += dx * 0.08;
      robot.y += dy * 0.08;
      if (dist < 6) {
        robot.x = tx; robot.y = ty;
        setPhase(PHASE.CHARGING);
      }
    }

    else if (phase === PHASE.CHARGING) {
      battery = Math.min(1.0, battery + 0.004);
      robot.lidarAngle += 0.02;
    }
  }

  function drawBackground(ctx) {
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoom(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(13,22,38,0.85)';
    ctx.beginPath();
    _roundRect(ctx, room.x, room.y, room.w, room.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,130,180,0.45)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }

  function drawDockStation(ctx) {
    const dx = dockPos.x, dy = dockPos.y;
    const dw = dockPos.w, dh = dockPos.h;

    ctx.save();

    // Charging glow when in CHARGING phase
    if (phase === PHASE.CHARGING) {
      const t2 = (Math.sin(Date.now() / 300) + 1) / 2;
      const g = ctx.createRadialGradient(dx + dw / 2, dy + dh / 2, 0, dx + dw / 2, dy + dh / 2, 60);
      g.addColorStop(0,   `rgba(0,229,138,${0.3 * t2})`);
      g.addColorStop(1,   'rgba(0,229,138,0)');
      ctx.beginPath();
      ctx.arc(dx + dw / 2, dy + dh / 2, 60, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // Dock body
    const bg = ctx.createLinearGradient(dx, dy, dx + dw, dy);
    bg.addColorStop(0, '#1A2840');
    bg.addColorStop(1, '#0D1828');
    ctx.beginPath();
    _roundRect(ctx, dx, dy, dw, dh, 5);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = phase === PHASE.CHARGING ? '#00E58A' : 'rgba(0,212,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Charging contacts
    const cy2 = dy + dh / 2;
    for (const oy of [-12, 12]) {
      ctx.beginPath();
      ctx.rect(dx + dw - 5, cy2 + oy - 3, 8, 6);
      ctx.fillStyle = phase === PHASE.CHARGING ? '#00E58A' : '#8AACCC';
      ctx.fill();
    }

    // Dock label
    ctx.font = `700 9px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = 'rgba(0,212,255,0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('DOCK', dx + dw / 2, dy - 5);

    ctx.restore();
  }

  function drawReturnTrail(ctx) {
    if (returnPath.length === 0 || pathIdx === 0) return;
    ctx.save();
    for (let i = 1; i < Math.min(pathIdx, returnPath.length); i++) {
      const prog = i / returnPath.length;
      ctx.beginPath();
      ctx.moveTo(returnPath[i - 1].x, returnPath[i - 1].y);
      ctx.lineTo(returnPath[i].x, returnPath[i].y);
      ctx.strokeStyle = '#00D4FF';
      ctx.globalAlpha = 0.1 + prog * 0.4;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBeaconPulses(ctx) {
    if (phase !== PHASE.LOCATE && phase !== PHASE.NAVIGATE) return;
    const bx = dockPos.x + dockPos.w;
    const by = dockPos.y + dockPos.h / 2;

    ctx.save();
    beaconPulses.forEach(p => {
      ctx.beginPath();
      ctx.arc(bx, by, p.r, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.strokeStyle = `rgba(0,212,255,${p.life * 0.7})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // IR beam to robot
    if (phase === PHASE.LOCATE) {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(robot.x, robot.y);
      ctx.strokeStyle = '#00D4FF';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawBatteryIndicator(ctx) {
    const bw = 44, bh = 20;
    const bx = W - bw - room.x - 8;
    const by = room.y + 10;

    ctx.save();

    // Battery casing
    ctx.beginPath();
    _roundRect(ctx, bx, by, bw, bh, 4);
    ctx.strokeStyle = 'rgba(200,220,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Terminal nub
    ctx.beginPath();
    ctx.rect(bx + bw, by + bh * 0.3, 4, bh * 0.4);
    ctx.fillStyle = 'rgba(200,220,255,0.5)';
    ctx.fill();

    // Fill
    const fillW = (bw - 4) * battery;
    const fillColor = battery > 0.5 ? '#00E58A'
                    : battery > 0.2 ? '#FFC107'
                    : '#FF6B35';
    ctx.beginPath();
    _roundRect(ctx, bx + 2, by + 2, fillW, bh - 4, 3);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Percentage
    const pct = Math.round(battery * 100);
    ctx.font = `600 9px 'Inter', sans-serif`;
    ctx.fillStyle = '#E8EDF8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pct}%`, bx + bw / 2, by + bh / 2);

    ctx.restore();
  }

  function setStepActive(idx) {
    steps.forEach((el, i) => {
      el.classList.remove('active', 'completed');
      if (i < idx) el.classList.add('completed');
      if (i === idx) el.classList.add('active');
    });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  init();
})();
