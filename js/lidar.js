/**
 * lidar.js — LiDAR Sensing Simulation
 * Ray-casting simulation with pre-defined room + interactive furniture obstacles.
 */

(function () {
  const canvas      = document.getElementById('lidar-canvas');
  const resetBtn    = document.getElementById('lidar-reset-btn');
  const obstacleBtn = document.getElementById('lidar-obstacle-btn');
  const coverageEl  = document.getElementById('lidar-coverage');
  const pointsEl    = document.getElementById('lidar-points');
  if (!canvas) return;

  let ctx, W, H;
  let rafId;
  let lidarAngle = 0;
  let mapPoints  = [];
  let obstacles  = [];
  let furnitureVisible = false;

  // Room definition (relative, mapped to canvas on init)
  // Defined as fractions of W and H
  let walls = [];

  // Furniture pieces (toggle)
  let furniturePieces = [];

  // Robot position
  let robotX, robotY, robotR;

  // CGMS sweep rate
  const RAYS_PER_FRAME = 12;
  const RAY_SPEED      = 0.055; // radians per frame

  function init() {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx; W = setup.W; H = setup.H;

    const pad = W * 0.08;
    robotX = W * 0.5;
    robotY = H * 0.5;
    robotR = Math.min(W, H) * 0.055;

    // Room walls (rectangle)
    walls = [
      { x1: pad,     y1: pad,     x2: W - pad, y2: pad     }, // top
      { x1: W - pad, y1: pad,     x2: W - pad, y2: H - pad }, // right
      { x1: W - pad, y1: H - pad, x2: pad,     y2: H - pad }, // bottom
      { x1: pad,     y1: H - pad, x2: pad,     y2: pad     }, // left
    ];

    // Furniture pieces defined as rect [x, y, w, h] relative fractions
    const fw = W, fh = H;
    furniturePieces = [
      // Sofa (top-left area)
      { segs: rectToSegs(pad + fw * 0.03, pad + fh * 0.05, fw * 0.22, fh * 0.18), color: '#7B4FFF', label: 'Sofa' },
      // Table (center-right)
      { segs: rectToSegs(W * 0.58, H * 0.3, fw * 0.18, fh * 0.22), color: '#FF6B35', label: 'Table' },
      // Chair (bottom-left)
      { segs: rectToSegs(pad + fw * 0.06, H * 0.62, fw * 0.13, fh * 0.13), color: '#FF6B35', label: 'Chair' },
    ];

    mapPoints = [];
    furnitureVisible = false;
    lidarAngle = 0;
    updateStats();

    resetBtn.addEventListener('click', () => {
      mapPoints = [];
      lidarAngle = 0;
      updateStats();
    });

    obstacleBtn.addEventListener('click', () => {
      furnitureVisible = !furnitureVisible;
      obstacleBtn.textContent = furnitureVisible ? 'Remove Furniture' : 'Add Furniture';
      if (!furnitureVisible) {
        // Remove furniture points
        mapPoints = mapPoints.filter(p => p.type !== 'obstacle');
      }
    });

    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function rectToSegs(x, y, w, h) {
    return [
      { x1: x,     y1: y,     x2: x + w, y2: y     },
      { x1: x + w, y1: y,     x2: x + w, y2: y + h },
      { x1: x + w, y1: y + h, x2: x,     y2: y + h },
      { x1: x,     y1: y + h, x2: x,     y2: y     },
    ];
  }

  function loop() {
    rafId = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);
    drawRoom(ctx);
    if (furnitureVisible) drawFurniture(ctx);
    drawMapPoints(ctx);
    castRays();
    drawLidarBeam(ctx);
    drawRobotOnMap(ctx);
    updateStats();
  }

  function drawBackground(ctx) {
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.04)';
    ctx.lineWidth = 0.5;
    const step = 32;
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
    // Room fill
    const pad = W * 0.08;
    ctx.fillStyle = 'rgba(13, 22, 38, 0.9)';
    ctx.fillRect(pad, pad, W - pad * 2, H - pad * 2);

    // Walls
    walls.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.strokeStyle = 'rgba(100,130,180,0.55)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawFurniture(ctx) {
    furniturePieces.forEach(piece => {
      ctx.save();
      ctx.strokeStyle = piece.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = piece.color === '#7B4FFF' ? 'rgba(123,79,255,0.12)' : 'rgba(255,107,53,0.12)';

      // Draw rect fill
      if (piece.segs.length === 4) {
        const s = piece.segs;
        ctx.beginPath();
        ctx.moveTo(s[0].x1, s[0].y1);
        ctx.lineTo(s[0].x2, s[0].y2);
        ctx.lineTo(s[1].x2, s[1].y2);
        ctx.lineTo(s[2].x2, s[2].y2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,107,53,0.08)';
        ctx.fill();
      }

      piece.segs.forEach(seg => {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      });
      ctx.restore();
    });
  }

  function drawMapPoints(ctx) {
    mapPoints.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.age || 1;
      if (p.type === 'obstacle') {
        // Obstacle point
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 5);
        g.addColorStop(0, '#FF6B35');
        g.addColorStop(1, 'rgba(255,107,53,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FF6B35';
        ctx.fill();
      } else {
        // Wall point
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4);
        g.addColorStop(0, '#00D4FF');
        g.addColorStop(1, 'rgba(0,212,255,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00D4FF';
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function castRays() {
    const allSegs = [...walls];
    furniturePieces.forEach(p => { if (furnitureVisible) allSegs.push(...p.segs); });

    for (let i = 0; i < RAYS_PER_FRAME; i++) {
      lidarAngle += RAY_SPEED / RAYS_PER_FRAME;
      const dx = Math.cos(lidarAngle);
      const dy = Math.sin(lidarAngle);

      let minDist = Infinity;
      let hitX = null, hitY = null;
      let hitType = 'wall';

      for (const seg of allSegs) {
        const dist = raySegmentIntersect(robotX, robotY, dx, dy, seg.x1, seg.y1, seg.x2, seg.y2);
        if (dist !== null && dist < minDist) {
          minDist = dist;
          hitX = robotX + dx * dist;
          hitY = robotY + dy * dist;
          const isFurniture = furniturePieces.some(p => furnitureVisible && p.segs.includes(seg));
          hitType = isFurniture ? 'obstacle' : 'wall';
        }
      }

      if (hitX !== null) {
        // Don't add duplicate nearby points
        const tooClose = mapPoints.some(p => Math.hypot(p.x - hitX, p.y - hitY) < 4);
        if (!tooClose) {
          mapPoints.push({ x: hitX, y: hitY, type: hitType, age: 1 });
          // Cap points for performance
          if (mapPoints.length > 2400) mapPoints.shift();
        }
      }
    }
  }

  function drawLidarBeam(ctx) {
    // Current beam
    const allSegs = [...walls];
    furniturePieces.forEach(p => { if (furnitureVisible) allSegs.push(...p.segs); });

    const dx = Math.cos(lidarAngle);
    const dy = Math.sin(lidarAngle);

    let minDist = W * 1.5;
    for (const seg of allSegs) {
      const dist = raySegmentIntersect(robotX, robotY, dx, dy, seg.x1, seg.y1, seg.x2, seg.y2);
      if (dist !== null && dist < minDist) minDist = dist;
    }

    const hitX = robotX + dx * minDist;
    const hitY = robotY + dy * minDist;

    const beamGrad = ctx.createLinearGradient(robotX, robotY, hitX, hitY);
    beamGrad.addColorStop(0,   'rgba(0,212,255,0.8)');
    beamGrad.addColorStop(0.7, 'rgba(0,212,255,0.3)');
    beamGrad.addColorStop(1,   'rgba(0,212,255,0)');

    ctx.beginPath();
    ctx.moveTo(robotX, robotY);
    ctx.lineTo(hitX, hitY);
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawRobotOnMap(ctx) {
    const lidarA = lidarAngle;
    drawRobot(ctx, robotX, robotY, robotR, 0, lidarA, 0);

    // Proximity sensor arcs (front)
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(robotX, robotY, robotR * 3.5, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = robotR * 2.5;
    ctx.stroke();
    ctx.restore();
  }

  function updateStats() {
    const total = mapPoints.length;
    pointsEl.textContent = total;

    // Estimate coverage as ratio of unique mapped angles
    const uniqueAngles = new Set(mapPoints.map(p => {
      const a = Math.atan2(p.y - robotY, p.x - robotX);
      return Math.round(a * 180 / Math.PI);
    }));
    const pct = Math.min(100, Math.round((uniqueAngles.size / 360) * 100));
    coverageEl.textContent = `${pct}%`;
  }

  // Ray-segment intersection
  function raySegmentIntersect(rx, ry, rdx, rdy, x1, y1, x2, y2) {
    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const denom = rdx * dy - rdy * dx;
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - rx) * dy  - (y1 - ry) * dx)  / denom;
    const u = ((x1 - rx) * rdy - (y1 - ry) * rdx) / denom;
    if (t > 0.01 && u >= 0 && u <= 1) return t;
    return null;
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  init();
})();
