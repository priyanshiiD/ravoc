/**
 * robot.js — Core ROVAC™ robot drawing utility
 * Shared across all canvas sections.
 * Draws a detailed top-down view of the robot vacuum.
 */

const ROVAC_COLORS = {
  bodyGradInner: '#1E2D48',
  bodyGradOuter: '#080E1C',
  rim:           'rgba(0, 212, 255, 0.7)',
  rimGlow:       'rgba(0, 212, 255, 0.15)',
  wheel:         '#111824',
  wheelRim:      'rgba(0, 212, 255, 0.25)',
  bumper:        'rgba(255, 107, 53, 0.55)',
  sideBrush:     '#00E58A',
  mainBrush:     'rgba(123, 79, 255, 0.75)',
  mainBrushFill: 'rgba(123, 79, 255, 0.18)',
  panel:         'rgba(0, 212, 255, 0.1)',
  lidarDome:     '#00D4FF',
  lidarDomeFill: 'rgba(0, 212, 255, 0.22)',
  sensor:        '#FF6B35',
  contacts:      'rgba(180, 200, 230, 0.6)',
  suction:       'rgba(123, 79, 255, 0.5)',
};

/**
 * Draw the complete robot vacuum from above.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} R  - Body radius
 * @param {number} angle       - Robot facing angle (radians, 0 = right)
 * @param {number} lidarAngle  - LiDAR dome spin angle
 * @param {number} brushAngle  - Side brush rotation angle
 * @param {number} [alpha=1]   - Overall opacity
 */
function drawRobot(ctx, cx, cy, R, angle, lidarAngle, brushAngle, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  _drawGlow(ctx, R);
  _drawBody(ctx, R);
  _drawWheels(ctx, R);
  _drawCasterWheel(ctx, R);
  _drawBumper(ctx, R);
  _drawPanelDetails(ctx, R);
  _drawMainBrush(ctx, R);
  _drawSideBrush(ctx, R, brushAngle);
  _drawSuctionPort(ctx, R);
  _drawChargingContacts(ctx, R);
  _drawSensors(ctx, R);
  _drawLidarDome(ctx, R, lidarAngle);

  ctx.restore();
}

function _drawGlow(ctx, R) {
  const g = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, R * 1.8);
  g.addColorStop(0,   'rgba(0, 212, 255, 0.0)');
  g.addColorStop(0.4, 'rgba(0, 212, 255, 0.06)');
  g.addColorStop(1,   'rgba(0, 212, 255, 0.0)');
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

function _drawBody(ctx, R) {
  // Main body gradient
  const g = ctx.createRadialGradient(-R * 0.25, -R * 0.25, 0, 0, 0, R);
  g.addColorStop(0,   '#253354');
  g.addColorStop(0.55,'#141E32');
  g.addColorStop(1,   '#07090F');
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // Outer rim glow
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.strokeStyle = ROVAC_COLORS.rimGlow;
  ctx.lineWidth = R * 0.1;
  ctx.stroke();

  // Outer rim crisp
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.strokeStyle = ROVAC_COLORS.rim;
  ctx.lineWidth = R * 0.025;
  ctx.stroke();
}

function _drawWheels(ctx, R) {
  const wW = R * 0.25, wH = R * 0.60;
  const wx = R * 0.88;

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * wx, 0);

    // Wheel body
    ctx.beginPath();
    _roundRect(ctx, -wW / 2, -wH / 2, wW, wH, wW * 0.3);
    ctx.fillStyle = ROVAC_COLORS.wheel;
    ctx.fill();
    ctx.strokeStyle = ROVAC_COLORS.wheelRim;
    ctx.lineWidth = R * 0.02;
    ctx.stroke();

    // Tread lines
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let t = -2; t <= 2; t++) {
      const ty = t * wH * 0.2;
      ctx.beginPath();
      ctx.moveTo(-wW / 2 + 2, ty);
      ctx.lineTo(wW / 2 - 2, ty);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function _drawCasterWheel(ctx, R) {
  ctx.save();
  ctx.translate(0, R * 0.78);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#0D1525';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
  ctx.lineWidth = R * 0.02;
  ctx.stroke();
  ctx.restore();
}

function _drawBumper(ctx, R) {
  // Front bumper arc (front = negative Y after rotation)
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.96, -Math.PI * 0.68, Math.PI * 0.68);
  ctx.strokeStyle = ROVAC_COLORS.bumper;
  ctx.lineWidth = R * 0.055;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Inner bumper highlight
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.96, -Math.PI * 0.68, Math.PI * 0.68);
  ctx.strokeStyle = 'rgba(255,107,53,0.15)';
  ctx.lineWidth = R * 0.12;
  ctx.stroke();
}

function _drawPanelDetails(ctx, R) {
  // Inner concentric rings (panel aesthetics)
  const rings = [0.62, 0.42, 0.22];
  rings.forEach((f, i) => {
    ctx.beginPath();
    ctx.arc(0, 0, R * f, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 - i * 0.015})`;
    ctx.lineWidth = R * 0.015;
    ctx.stroke();
  });

  // Panel cross-hatch lines
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.58, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
  ctx.lineWidth = 0.5;
  for (let x = -R; x <= R; x += R * 0.18) {
    ctx.beginPath();
    ctx.moveTo(x, -R);
    ctx.lineTo(x, R);
    ctx.stroke();
  }
  ctx.restore();
}

function _drawMainBrush(ctx, R) {
  // Rectangular main brush slot (front bottom of robot)
  const bW = R * 0.78, bH = R * 0.16;
  const bY = R * 0.45;

  ctx.save();
  ctx.translate(0, bY);

  ctx.beginPath();
  _roundRect(ctx, -bW / 2, -bH / 2, bW, bH, bH * 0.4);
  ctx.fillStyle = ROVAC_COLORS.mainBrushFill;
  ctx.fill();
  ctx.strokeStyle = ROVAC_COLORS.mainBrush;
  ctx.lineWidth = R * 0.02;
  ctx.stroke();

  // Brush pattern lines
  const lines = 8;
  for (let i = 0; i <= lines; i++) {
    const x = -bW / 2 + (bW / lines) * i;
    ctx.beginPath();
    ctx.moveTo(x, -bH / 2 + 2);
    ctx.lineTo(x, bH / 2 - 2);
    ctx.strokeStyle = `rgba(123,79,255,${0.3 - i * 0.015})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function _drawSideBrush(ctx, R, brushAngle) {
  ctx.save();
  ctx.translate(-R * 0.68, R * 0.55);
  ctx.rotate(brushAngle);

  const arms = 3, armLen = R * 0.32;
  for (let i = 0; i < arms; i++) {
    ctx.save();
    ctx.rotate((i / arms) * Math.PI * 2);

    // Arm line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -armLen);
    ctx.strokeStyle = ROVAC_COLORS.sideBrush;
    ctx.lineWidth = R * 0.04;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Tip dot
    ctx.beginPath();
    ctx.arc(0, -armLen, R * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = ROVAC_COLORS.sideBrush;
    ctx.fill();

    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#1A2D40';
  ctx.fill();
  ctx.strokeStyle = ROVAC_COLORS.sideBrush;
  ctx.lineWidth = R * 0.025;
  ctx.stroke();

  ctx.restore();
}

function _drawSuctionPort(ctx, R) {
  ctx.save();
  ctx.translate(0, R * 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.15, R * 0.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(123,79,255,0.3)';
  ctx.fill();
  ctx.strokeStyle = ROVAC_COLORS.suction;
  ctx.lineWidth = R * 0.025;
  ctx.stroke();
  ctx.restore();
}

function _drawChargingContacts(ctx, R) {
  const positions = [-R * 0.18, R * 0.18];
  const contactY = -R * 0.8;
  positions.forEach(x => {
    ctx.beginPath();
    _roundRect(ctx, x - R * 0.05, contactY - R * 0.07, R * 0.1, R * 0.14, R * 0.03);
    ctx.fillStyle = ROVAC_COLORS.contacts;
    ctx.fill();
  });
}

function _drawSensors(ctx, R) {
  const numSensors = 5;
  for (let i = 0; i < numSensors; i++) {
    const t = (i / (numSensors - 1)) - 0.5;
    const ang = t * Math.PI * 0.55 - Math.PI / 2;
    const sx = Math.cos(ang) * R * 0.88;
    const sy = Math.sin(ang) * R * 0.88;

    // Glow
    ctx.beginPath();
    ctx.arc(sx, sy, R * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,107,53,0.2)';
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(sx, sy, R * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = ROVAC_COLORS.sensor;
    ctx.fill();
  }
}

function _drawLidarDome(ctx, R, lidarAngle) {
  const domeR = R * 0.19;
  const domeY = -R * 0.08;

  // Dome glow
  const g = ctx.createRadialGradient(0, domeY, 0, 0, domeY, domeR * 1.6);
  g.addColorStop(0,   'rgba(0,212,255,0.22)');
  g.addColorStop(0.5, 'rgba(0,212,255,0.08)');
  g.addColorStop(1,   'rgba(0,212,255,0)');
  ctx.beginPath();
  ctx.arc(0, domeY, domeR * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // Dome body
  const dg = ctx.createRadialGradient(-domeR * 0.3, domeY - domeR * 0.3, 0, 0, domeY, domeR);
  dg.addColorStop(0, 'rgba(0,220,255,0.45)');
  dg.addColorStop(1, 'rgba(0,100,180,0.2)');
  ctx.beginPath();
  ctx.arc(0, domeY, domeR, 0, Math.PI * 2);
  ctx.fillStyle = dg;
  ctx.fill();
  ctx.strokeStyle = ROVAC_COLORS.lidarDome;
  ctx.lineWidth = R * 0.025;
  ctx.stroke();

  // Spinning LiDAR indicator
  ctx.save();
  ctx.translate(0, domeY);
  ctx.rotate(lidarAngle);
  const beam = ctx.createLinearGradient(0, 0, 0, -domeR * 0.72);
  beam.addColorStop(0,   '#00D4FF');
  beam.addColorStop(1,   'rgba(0,212,255,0)');
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -domeR * 0.72);
  ctx.strokeStyle = beam;
  ctx.lineWidth = R * 0.025;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // Center pivot dot
  ctx.beginPath();
  ctx.arc(0, domeY, R * 0.03, 0, Math.PI * 2);
  ctx.fillStyle = '#00D4FF';
  ctx.fill();
}

// ─── Utility: Rounded rect path helper ──────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Utility: Setup canvas with DPR ─────────────────────────
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || canvas.parentElement.clientWidth || 500;
  const H = canvas.clientHeight || canvas.parentElement.clientHeight || W;
  
  canvas.width  = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  return { ctx, W, H, dpr };
}
