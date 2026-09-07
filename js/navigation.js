/**
 * navigation.js — Smart vs Random Path Navigation Demo
 * Demonstrates boustrophedon planned path vs. random walk coverage.
 */

(function () {
  const canvas      = document.getElementById('nav-canvas');
  const smartBtn    = document.getElementById('mode-smart');
  const randomBtn   = document.getElementById('mode-random');
  const restartBtn  = document.getElementById('nav-restart-btn');
  const coverageEl  = document.getElementById('nav-coverage-val');
  const distanceEl  = document.getElementById('nav-distance-val');
  if (!canvas) return;

  let ctx, W, H, rafId;

  const MODE = { SMART: 'smart', RANDOM: 'random' };
  let currentMode = MODE.SMART;

  // Robot state
  let robot = {};
  let trail = [];
  let waypoints = [];
  let waypointIdx = 0;
  let totalDist = 0;

  // Coverage grid
  const CELL = 22; // px per coverage cell
  let coverageGrid = {};
  let totalCells = 0;

  // Room bounds (set in init)
  let room = {};

  function init() {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx; W = setup.W; H = setup.H;

    const pad = W * 0.1;
    room = {
      x: pad,
      y: pad,
      w: W - pad * 2,
      h: H - pad * 2,
    };

    // Calculate coverage cells
    const cols = Math.floor(room.w / CELL);
    const rows = Math.floor(room.h / CELL);
    totalCells = cols * rows;

    restart();

    smartBtn.addEventListener('click', () => {
      if (currentMode !== MODE.SMART) {
        currentMode = MODE.SMART;
        smartBtn.classList.add('active');
        randomBtn.classList.remove('active');
        restart();
      }
    });

    randomBtn.addEventListener('click', () => {
      if (currentMode !== MODE.RANDOM) {
        currentMode = MODE.RANDOM;
        randomBtn.classList.add('active');
        smartBtn.classList.remove('active');
        restart();
      }
    });

    restartBtn.addEventListener('click', restart);

    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function restart() {
    trail = [];
    coverageGrid = {};
    totalDist = 0;

    if (currentMode === MODE.SMART) {
      buildSmartWaypoints();
      robot = {
        x: waypoints[0].x,
        y: waypoints[0].y,
        angle: 0,
        speed: 1.8,
        lidarAngle: 0,
        brushAngle: 0,
      };
      waypointIdx = 1;
    } else {
      waypoints = [];
      waypointIdx = 0;
      robot = {
        x: room.x + room.w * 0.5,
        y: room.y + room.h * 0.5,
        angle: Math.random() * Math.PI * 2,
        speed: 1.8,
        lidarAngle: 0,
        brushAngle: 0,
        randomDir: { dx: Math.cos(Math.random() * Math.PI * 2), dy: Math.sin(Math.random() * Math.PI * 2) },
        turnTimer: 0,
      };
    }
    updateStats();
  }

  function buildSmartWaypoints() {
    // Boustrophedon (back-and-forth) path
    waypoints = [];
    const spacing = CELL * 1.5;
    const cols    = Math.floor(room.w / spacing);

    let goRight = true;
    for (let i = 0; i <= cols; i++) {
      const x = room.x + i * spacing;
      if (goRight) {
        waypoints.push({ x, y: room.y + room.h * 0.05 });
        waypoints.push({ x, y: room.y + room.h * 0.95 });
      } else {
        waypoints.push({ x, y: room.y + room.h * 0.95 });
        waypoints.push({ x, y: room.y + room.h * 0.05 });
      }
      goRight = !goRight;
    }
  }

  function loop() {
    rafId = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);
    drawRoom(ctx);
    drawCoverage(ctx);
    drawTrail(ctx);
    moveRobot();
    drawRobot(ctx, robot.x, robot.y, Math.min(W, H) * 0.05, robot.angle, robot.lidarAngle, robot.brushAngle);
    updateStats();
  }

  function drawBackground(ctx) {
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.035)';
    ctx.lineWidth = 0.5;
    const step = 28;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoom(ctx) {
    ctx.save();
    // Room floor
    ctx.fillStyle = 'rgba(13,22,38,0.85)';
    ctx.beginPath();
    _roundRect(ctx, room.x, room.y, room.w, room.h, 8);
    ctx.fill();

    // Walls
    ctx.strokeStyle = 'rgba(100,130,180,0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    _roundRect(ctx, room.x, room.y, room.w, room.h, 8);
    ctx.stroke();

    ctx.restore();
  }

  function drawCoverage(ctx) {
    ctx.save();
    const isRandom = currentMode === MODE.RANDOM;
    Object.keys(coverageGrid).forEach(key => {
      const [ci, ri] = key.split(',').map(Number);
      const x = room.x + ci * CELL;
      const y = room.y + ri * CELL;
      ctx.fillStyle = isRandom
        ? 'rgba(255,107,53,0.12)'
        : 'rgba(0,229,138,0.12)';
      ctx.fillRect(x, y, CELL, CELL);
    });
    ctx.restore();
  }

  function drawTrail(ctx) {
    if (trail.length < 2) return;
    ctx.save();
    const isRandom = currentMode === MODE.RANDOM;
    const color = isRandom ? '#FF6B35' : '#00E58A';

    for (let i = 1; i < trail.length; i++) {
      const prog = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = color;
      ctx.globalAlpha  = 0.15 + prog * 0.45;
      ctx.lineWidth    = 1.5 + prog * 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function moveRobot() {
    robot.lidarAngle += 0.06;
    robot.brushAngle -= 0.08;

    if (currentMode === MODE.SMART) {
      moveSmartRobot();
    } else {
      moveRandomRobot();
    }

    // Mark coverage
    const ci = Math.floor((robot.x - room.x) / CELL);
    const ri = Math.floor((robot.y - room.y) / CELL);
    if (ci >= 0 && ri >= 0 && ci < Math.floor(room.w / CELL) && ri < Math.floor(room.h / CELL)) {
      coverageGrid[`${ci},${ri}`] = true;
    }

    trail.push({ x: robot.x, y: robot.y });
    if (trail.length > 800) trail.shift();
  }

  function moveSmartRobot() {
    if (waypointIdx >= waypoints.length) return;
    const target = waypoints[waypointIdx];
    const dx = target.x - robot.x;
    const dy = target.y - robot.y;
    const dist = Math.hypot(dx, dy);

    const targetAngle = Math.atan2(dy, dx);
    // Smooth angle interpolation
    let da = targetAngle - robot.angle;
    while (da > Math.PI)  da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    robot.angle += da * 0.12;

    if (dist < robot.speed + 1) {
      robot.x = target.x;
      robot.y = target.y;
      totalDist += dist;
      waypointIdx++;
    } else {
      robot.x += (dx / dist) * robot.speed;
      robot.y += (dy / dist) * robot.speed;
      totalDist += robot.speed;
    }
  }

  function moveRandomRobot() {
    robot.turnTimer++;

    // Randomly change direction occasionally
    if (robot.turnTimer > 60 + Math.random() * 80) {
      const a = Math.random() * Math.PI * 2;
      robot.randomDir = { dx: Math.cos(a), dy: Math.sin(a) };
      robot.turnTimer = 0;
    }

    let nx = robot.x + robot.randomDir.dx * robot.speed;
    let ny = robot.y + robot.randomDir.dy * robot.speed;

    // Bounce off walls
    const margin = Math.min(W, H) * 0.06;
    let bounced = false;
    if (nx < room.x + margin || nx > room.x + room.w - margin) {
      robot.randomDir.dx *= -1;
      nx = robot.x + robot.randomDir.dx * robot.speed;
      bounced = true;
    }
    if (ny < room.y + margin || ny > room.y + room.h - margin) {
      robot.randomDir.dy *= -1;
      ny = robot.y + robot.randomDir.dy * robot.speed;
      bounced = true;
    }
    if (bounced) {
      const a = Math.atan2(robot.randomDir.dy, robot.randomDir.dx) + (Math.random() - 0.5) * 1.2;
      robot.randomDir = { dx: Math.cos(a), dy: Math.sin(a) };
    }

    robot.x = nx;
    robot.y = ny;
    robot.angle += (Math.atan2(robot.randomDir.dy, robot.randomDir.dx) - robot.angle) * 0.1;
    totalDist += robot.speed;
  }

  function updateStats() {
    const covered = Object.keys(coverageGrid).length;
    const pct = Math.min(100, Math.round((covered / totalCells) * 100));
    coverageEl.textContent = `${pct}%`;

    const meters = (totalDist / (W * 0.12)).toFixed(1);
    distanceEl.textContent = `${meters}m`;
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  init();
})();
