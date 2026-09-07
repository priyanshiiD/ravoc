/**
 * obstacle.js - Obstacle Detection & Avoidance Simulation
 * Top-down room with live robot navigation, proximity sensor zones,
 * user-placeable obstacles, and pause/resume controls.
 */

(function () {
  const canvas     = document.getElementById('obstacle-canvas');
  const addBtn     = document.getElementById('obstacle-add-btn');
  const pauseBtn   = document.getElementById('obstacle-pause-btn');
  const clearBtn   = document.getElementById('obstacle-clear-btn');
  const statusDot  = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  if (!canvas) return;

  let ctx, W, H, rafId;

  // Room
  let room = {};

  // Robot state
  let robot = {
    x: 0, y: 0,
    angle: 0,
    speed: 2.2,
    lidarAngle: 0,
    brushAngle: 0,
    dir: { dx: 1, dy: 0 },
    turnTimer: 0,
  };

  // Obstacles (predefined + user-placed)
  const PREDEFINED = [
    { x: 0.22, y: 0.28, w: 0.18, h: 0.12, color: '#7B4FFF', label: 'Sofa' },
    { x: 0.58, y: 0.22, w: 0.14, h: 0.18, color: '#FF6B35', label: 'Table' },
    { x: 0.65, y: 0.65, w: 0.12, h: 0.12, color: '#FF6B35', label: 'Chair' },
    { x: 0.18, y: 0.68, w: 0.10, h: 0.10, color: '#7B4FFF', label: 'Plant' },
  ];

  let obstacles     = [];
  let isPlacingMode = false;
  let isPaused      = false;
  let lastAvoidState = false;

  const PROX_DIST = 65; // px proximity sensor range

  function init() {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx; W = setup.W; H = setup.H;

    const pad = W * 0.08;
    room = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };

    buildObstacles();

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        isPlacingMode = !isPlacingMode;
        addBtn.textContent = isPlacingMode ? 'Cancel Placement' : 'Place Obstacle';
        canvas.classList.toggle('placing', isPlacingMode);
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume Navigation' : 'Pause Navigation';
        statusText.textContent = isPaused ? 'Navigation paused' : (isNearAnyObstacle() ? 'Obstacle detected — rerouting' : 'Navigating freely');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        buildObstacles();
        isPlacingMode = false;
        if (addBtn) addBtn.textContent = 'Place Obstacle';
        canvas.classList.remove('placing');
        resetRobot();
      });
    }

    canvas.addEventListener('click', onCanvasClick);

    if (rafId) cancelAnimationFrame(rafId);
    resetRobot();
    loop();
  }

  function resetRobot() {
    robot.x = room.x + room.w * 0.5;
    robot.y = room.y + room.h * 0.5;
    const a = -Math.PI / 4 + (Math.random() - 0.5) * 0.5;
    robot.angle = a;
    robot.dir = { dx: Math.cos(a), dy: Math.sin(a) };
    robot.turnTimer = 0;
  }

  function buildObstacles() {
    obstacles = PREDEFINED.map(o => ({
      x: room.x + o.x * room.w,
      y: room.y + o.y * room.h,
      w: o.w * room.w,
      h: o.h * room.h,
      color: o.color,
      label: o.label,
      user: false,
    }));
  }

  function onCanvasClick(e) {
    if (!isPlacingMode) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    const size = Math.min(W, H) * 0.085;
    const ox = Math.max(room.x + 6, Math.min(room.x + room.w - size - 6, mx - size / 2));
    const oy = Math.max(room.y + 6, Math.min(room.y + room.h - size - 6, my - size / 2));
    
    obstacles.push({
      x: ox, y: oy,
      w: size, h: size,
      color: '#00D4FF',
      label: 'Object',
      user: true,
    });
  }

  function loop() {
    rafId = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);
    drawRoom(ctx);
    drawObstacles(ctx);

    if (!isPaused) {
      updateRobot();
    } else {
      robot.lidarAngle += 0.03;
      robot.brushAngle -= 0.04;
    }

    drawSensorZone(ctx);
    drawRobot(ctx, robot.x, robot.y, Math.min(W, H) * 0.055, robot.angle, robot.lidarAngle, robot.brushAngle);
    updateStatus();
  }

  function drawBackground(ctx) {
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.035)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
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
    ctx.strokeStyle = 'rgba(100,130,180,0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    _roundRect(ctx, room.x, room.y, room.w, room.h, 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawObstacles(ctx) {
    obstacles.forEach(obs => {
      ctx.save();
      const nearDist = nearestPointOnRect(robot.x, robot.y, obs);
      const isNear = nearDist < PROX_DIST;

      ctx.strokeStyle = obs.color;
      ctx.lineWidth = isNear ? 2.5 : 1.5;
      ctx.globalAlpha = isNear ? 1 : 0.75;

      if (isNear) {
        ctx.shadowColor = obs.color;
        ctx.shadowBlur  = 12;
      }

      ctx.beginPath();
      _roundRect(ctx, obs.x, obs.y, obs.w, obs.h, 6);
      ctx.fillStyle = obs.color === '#00D4FF'
        ? (isNear ? 'rgba(0,212,255,0.22)' : 'rgba(0,212,255,0.08)')
        : (isNear ? 'rgba(255,107,53,0.22)' : 'rgba(123,79,255,0.08)');
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.shadowBlur = 0;
      ctx.font = `600 11px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = obs.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obs.label, obs.x + obs.w / 2, obs.y + obs.h / 2);

      ctx.restore();
    });
  }

  function drawSensorZone(ctx) {
    const avoiding = isNearAnyObstacle() || isNearWall();

    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.angle);

    const arcAngle = Math.PI * 0.55;
    const arcR     = PROX_DIST;

    if (avoiding) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, arcR);
      g.addColorStop(0,   'rgba(255,107,53,0.3)');
      g.addColorStop(0.5, 'rgba(255,107,53,0.1)');
      g.addColorStop(1,   'rgba(255,107,53,0)');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, arcR, -arcAngle / 2, arcAngle / 2);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, arcR, -arcAngle / 2, arcAngle / 2);
      ctx.strokeStyle = 'rgba(255,107,53,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, arcR);
      g.addColorStop(0,   'rgba(0,212,255,0.12)');
      g.addColorStop(1,   'rgba(0,212,255,0)');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, arcR, -arcAngle / 2, arcAngle / 2);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.restore();
  }

  function updateRobot() {
    robot.lidarAngle += 0.06;
    robot.brushAngle -= 0.08;

    const robotR = Math.min(W, H) * 0.055;
    const roomCx = room.x + room.w / 2;
    const roomCy = room.y + room.h / 2;

    // Sensor ray-casting for smooth steering
    const rayAngles = [-0.5, -0.25, 0, 0.25, 0.5];
    let minLeftDist = PROX_DIST, minRightDist = PROX_DIST, minCenterDist = PROX_DIST;

    rayAngles.forEach((relA, i) => {
      const absA = robot.angle + relA;
      const dist = castRay(robot.x, robot.y, absA, PROX_DIST);
      if (i < 2) minLeftDist = Math.min(minLeftDist, dist);
      else if (i > 2) minRightDist = Math.min(minRightDist, dist);
      else minCenterDist = Math.min(minCenterDist, dist);
    });

    const isBlocked = minCenterDist < PROX_DIST || minLeftDist < PROX_DIST || minRightDist < PROX_DIST;

    if (isBlocked) {
      // Steer away from closest obstacle side
      if (minLeftDist < minRightDist) {
        robot.angle += 0.08; // Turn right
      } else if (minRightDist < minLeftDist) {
        robot.angle -= 0.08; // Turn left
      } else {
        // Equal blockage (wall ahead), turn toward room center
        const toCenter = Math.atan2(roomCy - robot.y, roomCx - robot.x);
        let da = toCenter - robot.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        robot.angle += Math.sign(da) * 0.08;
      }
    } else {
      // Occasional random wander
      robot.turnTimer++;
      if (robot.turnTimer > 120 + Math.floor(Math.random() * 80)) {
        robot.turnTimer = 0;
        robot.angle += (Math.random() - 0.5) * 0.6;
      }
    }

    robot.dir.dx = Math.cos(robot.angle);
    robot.dir.dy = Math.sin(robot.angle);

    const currSpeed = isBlocked ? robot.speed * 0.6 : robot.speed;
    let nx = robot.x + robot.dir.dx * currSpeed;
    let ny = robot.y + robot.dir.dy * currSpeed;

    // Hard collision response for room walls
    const minX = room.x + robotR + 4;
    const maxX = room.x + room.w - robotR - 4;
    const minY = room.y + robotR + 4;
    const maxY = room.y + room.h - robotR - 4;

    if (nx < minX || nx > maxX || ny < minY || ny > maxY) {
      nx = Math.max(minX, Math.min(maxX, nx));
      ny = Math.max(minY, Math.min(maxY, ny));
      // Force angle pointing inward to room center
      const toCenter = Math.atan2(roomCy - ny, roomCx - nx);
      robot.angle = toCenter + (Math.random() - 0.5) * 0.4;
    }

    // Hard collision response for obstacles
    obstacles.forEach(obs => {
      const nearDist = nearestPointOnRect(nx, ny, obs);
      if (nearDist < robotR + 2) {
        const obsCx = obs.x + obs.w / 2;
        const obsCy = obs.y + obs.h / 2;
        let pushA = Math.atan2(ny - obsCy, nx - obsCx);
        if (isNaN(pushA)) pushA = 0;
        nx = obsCx + Math.cos(pushA) * (Math.max(obs.w, obs.h) / 2 + robotR + 4);
        ny = obsCy + Math.sin(pushA) * (Math.max(obs.w, obs.h) / 2 + robotR + 4);
        robot.angle = pushA + (Math.random() - 0.5) * 0.4;
      }
    });

    robot.x = nx;
    robot.y = ny;
  }

  function castRay(x, y, angle, maxDist) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let step = 5;
    for (let d = 5; d <= maxDist; d += step) {
      const rx = x + cos * d;
      const ry = y + sin * d;
      // Check room bounds
      if (rx < room.x + 4 || rx > room.x + room.w - 4 || ry < room.y + 4 || ry > room.y + room.h - 4) {
        return d;
      }
      // Check obstacles
      for (const obs of obstacles) {
        if (rx >= obs.x && rx <= obs.x + obs.w && ry >= obs.y && ry <= obs.y + obs.h) {
          return d;
        }
      }
    }
    return maxDist;
  }

  function isNearAnyObstacle() {
    return obstacles.some(obs => nearestPointOnRect(robot.x, robot.y, obs) < PROX_DIST);
  }

  function isNearWall() {
    const m = PROX_DIST;
    return robot.x < room.x + m || robot.x > room.x + room.w - m ||
           robot.y < room.y + m || robot.y > room.y + room.h - m;
  }

  function nearestPointOnRect(px, py, rect) {
    const nx = Math.max(rect.x, Math.min(rect.x + rect.w, px));
    const ny = Math.max(rect.y, Math.min(rect.y + rect.h, py));
    return Math.hypot(px - nx, py - ny);
  }

  function updateStatus() {
    if (isPaused) return;
    const avoiding = isNearAnyObstacle() || isNearWall();
    if (avoiding !== lastAvoidState) {
      lastAvoidState = avoiding;
      if (avoiding) {
        statusDot.classList.add('warning');
        statusText.textContent = 'Obstacle detected — rerouting';
      } else {
        statusDot.classList.remove('warning');
        statusText.textContent = 'Navigating freely';
      }
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  init();
})();
