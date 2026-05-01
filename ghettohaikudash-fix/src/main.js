import './style.css';

const app = document.querySelector('#game');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
app.appendChild(canvas);

const W = 960;
const H = 540;
canvas.width = W;
canvas.height = H;

const lanes = [250, 330, 410];
const keys = new Set();
const quotes = [
  'hot box in moonlight',
  'pedals cut through neon rain',
  'angels know the route',
  'rice steam like prayers',
  'hood poems fly tonight',
  'fortune says keep dashing'
];

let state;
let last = 0;
let quoteIndex = 0;
let gameMode = 'title';
let toast = { text: '', timer: 0 };

function reset() {
  state = {
    player: { x: 150, y: lanes[1], w: 80, h: 40, inv: 0 },
    boxes: [],
    targets: [],
    obstacles: [],
    speed: 230,
    road: 0,
    score: 0,
    combo: 0,
    lives: 3,
    targetTimer: 0,
    obstacleTimer: 0,
    shake: 0,
  };
  quoteIndex = 0;
  toast = { text: '', timer: 0 };
}

reset();

addEventListener('keydown', (e) => {
  const key = e.code;
  keys.add(key);
  if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(key)) e.preventDefault();
  if (gameMode === 'title' && key === 'Space') { reset(); gameMode = 'play'; }
  else if (gameMode === 'over' && key === 'KeyR') { reset(); gameMode = 'play'; }
  else if (gameMode === 'play' && key === 'Space') throwBox();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('resize', fitCanvas);
fitCanvas();
requestAnimationFrame(loop);

function fitCanvas() {
  const scale = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}

function loop(t) {
  const dt = Math.min(0.033, (t - last) / 1000 || 0);
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (gameMode !== 'play') return;
  const p = state.player;
  if (keys.has('KeyW')) state.speed = clamp(state.speed + 210 * dt, 150, 440);
  if (keys.has('KeyS')) state.speed = clamp(state.speed - 250 * dt, 120, 440);
  if (keys.has('KeyA')) p.y -= 300 * dt;
  if (keys.has('KeyD')) p.y += 300 * dt;
  p.y = clamp(p.y, lanes[0] - 25, lanes[2] + 25);
  if (p.inv > 0) p.inv -= dt;
  if (state.shake > 0) state.shake -= dt;

  state.road += state.speed * dt;
  state.targetTimer -= dt;
  state.obstacleTimer -= dt;
  toast.timer = Math.max(0, toast.timer - dt);

  if (state.targetTimer <= 0) {
    spawnTarget();
    state.targetTimer = rand(0.8, 1.35);
  }
  if (state.obstacleTimer <= 0) {
    spawnObstacle();
    state.obstacleTimer = rand(0.65, 1.15);
  }

  for (const obj of [...state.targets, ...state.obstacles]) obj.x -= state.speed * dt;
  for (const box of state.boxes) {
    box.x += box.vx * dt;
    box.y += box.vy * dt;
    box.vy += 350 * dt;
    box.rot += 8 * dt;
  }

  state.targets = state.targets.filter(o => o.x > -120 && !o.dead);
  state.obstacles = state.obstacles.filter(o => o.x > -120 && !o.dead);
  state.boxes = state.boxes.filter(o => o.x < W + 60 && o.y < H + 80 && !o.dead);

  for (const box of state.boxes) {
    for (const target of state.targets) {
      if (!box.dead && !target.dead && hit(box, target)) deliver(box, target);
    }
  }
  for (const obstacle of state.obstacles) {
    if (!obstacle.dead && p.inv <= 0 && hit(p, obstacle)) crash(obstacle);
  }
}

function spawnTarget() {
  const y = pick(lanes);
  state.targets.push({ type: 'house', x: W + 70, y: y - 76, w: 84, h: 92, lane: y });
}

function spawnObstacle() {
  const y = pick(lanes);
  const type = pick(['car', 'dog', 'walker']);
  const size = type === 'walker' ? [38, 68] : type === 'dog' ? [58, 42] : [96, 50];
  state.obstacles.push({ type, x: W + 95, y: y - size[1] / 2, w: size[0], h: size[1] });
}

function throwBox() {
  const p = state.player;
  state.boxes.push({ x: p.x + 65, y: p.y - 25, w: 34, h: 34, vx: 540, vy: -175, rot: 0 });
}

function deliver(box, target) {
  box.dead = true;
  target.dead = true;
  state.combo += 1;
  const points = 100 + state.combo * 25;
  state.score += points;
  flash(`+${points}  ${quotes[quoteIndex++ % quotes.length]}`);
}

function crash(obstacle) {
  obstacle.dead = true;
  state.player.inv = 1.05;
  state.combo = 0;
  state.lives -= 1;
  state.shake = 0.18;
  flash(state.lives > 0 ? 'spilled rice. keep riding.' : 'route closed. press R to retry');
  if (state.lives <= 0) gameMode = 'over';
}

function draw() {
  ctx.save();
  if (state.shake > 0) ctx.translate(rand(-8, 8), rand(-5, 5));
  drawBackground();
  drawStreet();
  for (const target of state.targets) drawHouse(target.x, target.y);
  for (const box of state.boxes) drawTakeout(box);
  for (const obstacle of state.obstacles) drawObstacle(obstacle);
  drawBike(state.player.x, state.player.y - 20, state.player.inv > 0);
  drawUI();
  if (gameMode === 'title') drawTitle();
  if (gameMode === 'over') drawGameOver();
  ctx.restore();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#120713'); grad.addColorStop(0.6, '#26101b'); grad.addColorStop(1, '#10070c');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) {
    const x = (i * 130 - (state.road * 0.18) % 130) - 40;
    ctx.fillStyle = i % 2 ? '#1d1b2d' : '#211625';
    ctx.fillRect(x, 65 + (i % 3) * 20, 85, 120);
    ctx.fillStyle = '#ffc857';
    for (let j = 0; j < 4; j++) ctx.fillRect(x + 15 + j * 16, 92, 8, 14);
  }
}

function drawStreet() {
  ctx.fillStyle = '#252532'; ctx.fillRect(0, 202, W, 272);
  ctx.fillStyle = '#372026'; ctx.fillRect(0, 176, W, 26); ctx.fillRect(0, 474, W, 28);
  ctx.strokeStyle = 'rgba(255,200,87,.45)'; ctx.lineWidth = 3;
  for (const y of lanes) line(0, y + 38, W, y + 38);
  ctx.strokeStyle = 'rgba(248,241,213,.8)'; ctx.lineWidth = 4;
  for (let x = -80 + (state.road % 120); x < W + 120; x += 120) line(x, 338, x + 54, 338);
  ctx.fillStyle = 'rgba(230,57,70,.55)';
  for (let x = -80 + (state.road % 150); x < W + 150; x += 150) { ctx.fillRect(x, 180, 68, 8); ctx.fillRect(x + 42, 488, 60, 8); }
}

function drawBike(x, y, hitFlash) {
  ctx.save(); ctx.translate(x, y);
  if (hitFlash && Math.floor(performance.now() / 80) % 2) ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ef233c'; roundRect(0, 0, 76, 34, 8); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 4;
  circle(20, 28, 12, '#f8f1d5', true); circle(58, 28, 12, '#f8f1d5', true);
  ctx.strokeStyle = '#f8f1d5'; ctx.lineWidth = 5; line(20, 28, 39, 8); line(39, 8, 58, 28); line(39, 8, 40, 28);
  circle(40, 12, 4, '#111');
  ctx.restore();
}

function drawTakeout(b) {
  ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate(b.rot); ctx.translate(-b.w / 2, -b.h / 2);
  ctx.fillStyle = '#f7efe0'; roundRect(0, 10, 34, 24, 4); ctx.fill();
  ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(17, 0); ctx.lineTo(34, 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#b21f2d'; ctx.lineWidth = 2; roundRect(1, 11, 32, 22, 4); ctx.stroke();
  ctx.restore();
}

function drawHouse(x, y) {
  ctx.fillStyle = '#111827'; roundRect(x, y, 84, 90, 8); ctx.fill();
  ctx.fillStyle = '#ffc857'; ctx.fillRect(x + 8, y + 12, 20, 18); ctx.fillRect(x + 56, y + 12, 20, 18);
  ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(x + 18, y + 50); ctx.lineTo(x + 42, y + 24); ctx.lineTo(x + 66, y + 50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f8f1d5'; ctx.fillRect(x + 28, y + 48, 28, 42);
}

function drawObstacle(o) {
  if (o.type === 'car') {
    ctx.fillStyle = '#2d3142'; roundRect(o.x, o.y, 92, 42, 12); ctx.fill();
    ctx.fillStyle = '#ffc857'; ctx.fillRect(o.x + 12, o.y + 8, 20, 12); ctx.fillRect(o.x + 58, o.y + 8, 20, 12);
    circle(o.x + 22, o.y + 40, 8, '#111'); circle(o.x + 70, o.y + 40, 8, '#111');
  } else if (o.type === 'dog') {
    ctx.fillStyle = '#8b5e34'; ellipse(o.x + 25, o.y + 22, 42, 24);
    circle(o.x + 44, o.y + 14, 13, '#5a3825'); circle(o.x + 47, o.y + 13, 2, '#111');
  } else {
    ctx.fillStyle = '#0f172a'; roundRect(o.x, o.y, 34, 62, 14); ctx.fill();
    circle(o.x + 17, o.y + 10, 8, '#ffc857'); ctx.strokeStyle = '#f8f1d5'; ctx.lineWidth = 4; line(o.x + 16, o.y + 26, o.x + 6, o.y + 44); line(o.x + 18, o.y + 26, o.x + 28, o.y + 44);
  }
}

function drawUI() {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, 84);
  text(`Score ${state.score}`, 24, 31, '24px Arial Black', '#f8f1d5', 'left');
  text(`Combo x${state.combo}`, 24, 62, '18px Arial', '#ffc857', 'left');
  text(`Speed ${Math.round(state.speed)}`, W / 2, 31, '18px Arial Black', '#f8f1d5', 'center');
  text(`Lives ${state.lives}`, W - 24, 31, '24px Arial Black', '#f8f1d5', 'right');
  if (toast.timer > 0) text(toast.text, W / 2, 105, '24px Georgia', '#ffc857', 'center', '#000');
}

function drawTitle() {
  ctx.fillStyle = 'rgba(16,7,12,.87)'; ctx.fillRect(0, 0, W, H);
  text('GHETTO', W/2, 85, '36px Georgia', '#ffc857', 'center');
  text('HAIKU DASH', W/2, 145, '74px Impact', '#f8f1d5', 'center', '#e63946');
  text('Chinese takeout delivery on a bicycle through neon block poetry.', W/2, 210, '20px Arial', '#f3d7a4', 'center');
  drawBike(W/2 - 40, 265, false);
  text('W/S speed • A/D move • SPACE throw box', W/2, 382, '22px Arial', '#fff', 'center');
  text('PRESS SPACE TO START', W/2, 438, '28px Arial Black', '#ffc857', 'center');
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,.66)'; ctx.fillRect(0, 0, W, H);
  text('GAME OVER', W/2, 230, '72px Impact', '#e63946', 'center');
  text(`Final Score: ${state.score}`, W/2, 305, '30px Arial Black', '#f8f1d5', 'center');
  text('Press R to run it back', W/2, 365, '24px Arial', '#ffc857', 'center');
}

function flash(textValue) { toast = { text: textValue, timer: 1.3 }; }
function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function circle(x, y, r, fill, stroke = false) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) ctx.stroke(); }
function ellipse(x, y, w, h) { ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function text(value, x, y, font, fill, align = 'left', stroke = null) { ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle'; if (stroke) { ctx.lineWidth = 6; ctx.strokeStyle = stroke; ctx.strokeText(value, x, y); } ctx.fillStyle = fill; ctx.fillText(value, x, y); }
