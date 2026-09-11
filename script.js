// --- CONFIGURATION CONSTANTS ---
let CELL_SIZE = 12;
let CELL_GAP = 2;
let CELL_STEP = CELL_SIZE + CELL_GAP;

const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';
const CHARACTER_COLOR = '#FFFFFF';
const ASCII_CHARS = '@#$%=+*:-. ';
const BRIGHTNESS_THRESHOLD = 50;

// Physics settings
const PUSH_RADIUS = 12;  // Distance in grid units
const PUSH_FORCE = 0.8;
const SPRING = 0.08;
const DAMPING = 0.85;

// --- CANVAS & SETUP VARIABLES ---
const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d', { alpha: true });
const dpr = window.devicePixelRatio || 1;
const img = document.getElementById('source');

let cols = 0;
let rows = 0;
let cells = [];

let mouse = {
  col: -999,
  row: -999,
  isMoving: false
};
let mouseTimer = null;

// Adjust grid size for mobile screens
function setupCanvas() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (width < 768) {
    CELL_SIZE = 8;
    CELL_GAP = 1;
  } else {
    CELL_SIZE = 12;
    CELL_GAP = 2;
  }
  CELL_STEP = CELL_SIZE + CELL_GAP;

  cols = Math.floor(width / CELL_STEP);
  rows = Math.floor(height / CELL_STEP);

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.scale(dpr, dpr);
}

// Draw underlying static cell grid
function drawGrid() {
  ctx.fillStyle = GRID_COLOR;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(c * CELL_STEP, r * CELL_STEP, CELL_SIZE, CELL_SIZE);
    }
  }
}

// Downsample logo pixel brightness into cell array
function sampleLogoIntoCells() {
  cells = [];
  const imgRect = img.getBoundingClientRect();

  if (imgRect.width === 0 || imgRect.height === 0) return;

  const sampleCols = Math.floor(imgRect.width / CELL_STEP);
  const sampleRows = Math.floor(imgRect.height / CELL_STEP);

  const startCol = Math.floor((cols - sampleCols) / 2);
  const startRow = Math.floor((rows - sampleRows) / 2);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = sampleCols;
  offCanvas.height = sampleRows;
  const offCtx = offCanvas.getContext('2d');

  offCtx.drawImage(img, 0, 0, sampleCols, sampleRows);
  const imageData = offCtx.getImageData(0, 0, sampleCols, sampleRows).data;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let isLit = false;
      let char = ' ';

      if (r >= startRow && r < startRow + sampleRows &&
          c >= startCol && c < startCol + sampleCols) {
        
        const sampleC = c - startCol;
        const sampleR = r - startRow;
        const index = (sampleR * sampleCols + sampleC) * 4;

        const red = imageData[index];
        const green = imageData[index + 1];
        const blue = imageData[index + 2];
        const alpha = imageData[index + 3];

        if (alpha > 128) {
          // Standard luminance formula
          const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          
          if (brightness > BRIGHTNESS_THRESHOLD) {
            isLit = true;
            const charIdx = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
            char = ASCII_CHARS[charIdx];
          }
        }
      }

      cells.push({
        col: c,
        row: r,
        isLit: isLit,
        char: char,
        offsetX: 0,
        offsetY: 0,
        vx: 0,
        vy: 0
      });
    }
  }
}

// Update physics forces for grid cells
function updatePhysics() {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell.isLit) continue;

    // Mouse push effect
    if (mouse.isMoving) {
      const dx = (cell.col + cell.offsetX) - mouse.col;
      const dy = (cell.row + cell.offsetY) - mouse.row;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PUSH_RADIUS && dist > 0) {
        const force = (1 - dist / PUSH_RADIUS) * PUSH_FORCE;
        const angle = Math.atan2(dy, dx);
        cell.vx += Math.cos(angle) * force;
        cell.vy += Math.sin(angle) * force;
      }
    }

    // Spring return force
    const springFx = -cell.offsetX * SPRING;
    const springFy = -cell.offsetY * SPRING;

    cell.vx += springFx;
    cell.vy += springFy;

    cell.vx *= DAMPING;
    cell.vy *= DAMPING;

    cell.offsetX += cell.vx;
    cell.offsetY += cell.vy;

    // Snap tiny movements to rest
    if (Math.abs(cell.offsetX) < 0.001 && Math.abs(cell.vx) < 0.001) {
      cell.offsetX = 0;
      cell.vx = 0;
    }
    if (Math.abs(cell.offsetY) < 0.001 && Math.abs(cell.vy) < 0.001) {
      cell.offsetY = 0;
      cell.vy = 0;
    }
  }
}

// Render canvas frame
function renderFrame() {
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  // Pass 1: Background Grid
  drawGrid();

  // Pass 2: ASCII Characters
  ctx.font = `${CELL_SIZE}px monospace`;
  ctx.fillStyle = CHARACTER_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell.isLit) continue;

    const posX = (cell.col + cell.offsetX) * CELL_STEP + CELL_SIZE / 2;
    const posY = (cell.row + cell.offsetY) * CELL_STEP + CELL_SIZE / 2;

    ctx.fillText(cell.char, posX, posY);
  }
}

// Animation loop
function animate() {
  updatePhysics();
  renderFrame();
  requestAnimationFrame(animate);
}

// Initialize setup
function init() {
  setupCanvas();
  sampleLogoIntoCells();
}

// --- EVENT LISTENERS & INTERVALS ---

// Continuously swap characters for scrambling/flickering effect
setInterval(() => {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].isLit) {
      const randIdx = Math.floor(Math.random() * (ASCII_CHARS.length - 1));
      cells[i].char = ASCII_CHARS[randIdx];
    }
  }
}, 50);

window.addEventListener('resize', () => {
  init();
});

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  mouse.col = x / CELL_STEP;
  mouse.row = y / CELL_STEP;
  mouse.isMoving = true;

  clearTimeout(mouseTimer);
  mouseTimer = setTimeout(() => {
    mouse.isMoving = false;
  }, 100);
});

window.addEventListener('mouseleave', () => {
  mouse.col = -999;
  mouse.row = -999;
  mouse.isMoving = false;
});

// Run initialization when image is fully loaded
if (img.complete) {
  init();
  animate();
} else {
  img.addEventListener('load', () => {
    init();
    animate();
  });
}