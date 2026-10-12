// --- CONFIGURATION CONSTANTS ---
let CELL_SIZE = 12;
let CELL_GAP = 2;
let CELL_STEP = CELL_SIZE + CELL_GAP;

const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';
const CHARACTER_COLOR = '#fcb000';
const ASCII_CHARS = '@#$%=+*:-. ';
const BRIGHTNESS_THRESHOLD = 50;

// Physics settings
const PUSH_RADIUS = 12;
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

let mouse = { col: -999, row: -999, isMoving: false };
let mouseTimer = null;

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

function drawGrid() {
    ctx.fillStyle = GRID_COLOR;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillRect(c * CELL_STEP, r * CELL_STEP, CELL_SIZE, CELL_SIZE);
        }
    }
}

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

                const red   = imageData[index];
                const green = imageData[index + 1];
                const blue  = imageData[index + 2];
                const alpha = imageData[index + 3];

                if (alpha > 128) {
                    const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
                    if (brightness > BRIGHTNESS_THRESHOLD) {
                        isLit = true;
                        const charIdx = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
                        char = ASCII_CHARS[charIdx];
                    }
                }
            }

            cells.push({ col: c, row: r, isLit, char, offsetX: 0, offsetY: 0, vx: 0, vy: 0 });
        }
    }
}

function updatePhysics() {
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (!cell.isLit) continue;

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

        cell.vx += -cell.offsetX * SPRING;
        cell.vy += -cell.offsetY * SPRING;
        cell.vx *= DAMPING;
        cell.vy *= DAMPING;
        cell.offsetX += cell.vx;
        cell.offsetY += cell.vy;

        if (Math.abs(cell.offsetX) < 0.001 && Math.abs(cell.vx) < 0.001) { cell.offsetX = 0; cell.vx = 0; }
        if (Math.abs(cell.offsetY) < 0.001 && Math.abs(cell.vy) < 0.001) { cell.offsetY = 0; cell.vy = 0; }
    }
}

function renderFrame() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    drawGrid();

    ctx.font = `${CELL_SIZE}px 'DM Mono', monospace`;
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

function animate() {
    updatePhysics();
    renderFrame();
    requestAnimationFrame(animate);
}

function init() {
    setupCanvas();
    sampleLogoIntoCells();
}

setInterval(() => {
    for (let i = 0; i < cells.length; i++) {
        if (cells[i].isLit) {
            cells[i].char = ASCII_CHARS[Math.floor(Math.random() * (ASCII_CHARS.length - 1))];
        }
    }
}, 50);

window.addEventListener('resize', () => { init(); });

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.col = (e.clientX - rect.left) / CELL_STEP;
    mouse.row = (e.clientY - rect.top) / CELL_STEP;
    mouse.isMoving = true;
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => { mouse.isMoving = false; }, 100);
});

window.addEventListener('mouseleave', () => {
    mouse.col = -999;
    mouse.row = -999;
    mouse.isMoving = false;
});

const ambientCanvas = document.getElementById('ambient-background');
const ambientContext = ambientCanvas.getContext('2d', { alpha: true });
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ambientWidth = 0;
let ambientHeight = 0;
let ambientDrops = [];
let ambientFrameId = null;
let ambientLastFrame = 0;
let resizeFrameId = null;
const AMBIENT_FRAME_INTERVAL = 1000 / 30;

function resizeAmbientCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    ambientWidth = window.innerWidth;
    ambientHeight = window.innerHeight;
    ambientCanvas.width = ambientWidth * pixelRatio;
    ambientCanvas.height = ambientHeight * pixelRatio;
    ambientContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const dropCount = Math.min(360, Math.max(120, Math.round(ambientWidth * ambientHeight / 4600)));
    ambientDrops = Array.from({ length: dropCount }, () => ({
        x: Math.random() * ambientWidth,
        y: Math.random() * ambientHeight,
        length: 12 + Math.random() * 16,
        speed: 4.2 + Math.random() * 3.6,
        drift: -0.2 - Math.random() * 0.48,
        gold: Math.random() < 0.14
    }));
}

function drawAmbientRain(advanceDrops) {
    ambientContext.clearRect(0, 0, ambientWidth, ambientHeight);
    ambientContext.lineWidth = 1.15;

    for (let i = 0; i < ambientDrops.length; i++) {
        const drop = ambientDrops[i];
        if (advanceDrops) {
            drop.x += drop.drift;
            drop.y += drop.speed;
            if (drop.y > ambientHeight + drop.length) {
                drop.y = -drop.length;
                drop.x = Math.random() * ambientWidth;
            }
            if (drop.x < -12) drop.x = ambientWidth + 12;
        }
    }

    for (const gold of [false, true]) {
        ambientContext.strokeStyle = gold
            ? 'rgba(232, 200, 118, 0.48)'
            : 'rgba(220, 225, 219, 0.3)';
        ambientContext.beginPath();
        for (let i = 0; i < ambientDrops.length; i++) {
            const drop = ambientDrops[i];
            if (drop.gold !== gold) continue;
            ambientContext.moveTo(drop.x, drop.y);
            ambientContext.lineTo(drop.x + drop.drift * 3, drop.y + drop.length);
        }
        ambientContext.stroke();
    }
}

function animateAmbientRain(timestamp) {
    if (document.hidden) {
        ambientFrameId = null;
        return;
    }

    ambientFrameId = window.requestAnimationFrame(animateAmbientRain);
    if (timestamp - ambientLastFrame < AMBIENT_FRAME_INTERVAL) return;

    ambientLastFrame = timestamp;
    drawAmbientRain(true);
}

resizeAmbientCanvas();
drawAmbientRain(false);

if (!prefersReducedMotion) {
    ambientFrameId = window.requestAnimationFrame(animateAmbientRain);
}

window.addEventListener('resize', () => {
    if (resizeFrameId !== null) return;

    resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        init();
        resizeAmbientCanvas();
        drawAmbientRain(false);
    });
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (ambientFrameId !== null) window.cancelAnimationFrame(ambientFrameId);
        ambientFrameId = null;
        return;
    }

    if (!prefersReducedMotion && ambientFrameId === null) {
        ambientLastFrame = 0;
        ambientFrameId = window.requestAnimationFrame(animateAmbientRain);
    }
});

function initializeGoldenTrace(sourceId, canvasId) {
    const traceSource = document.getElementById(sourceId);
    const traceCanvas = document.getElementById(canvasId);
    const traceContext = traceCanvas.getContext('2d');
    const traceImageCanvas = document.createElement('canvas');
    traceImageCanvas.width = traceCanvas.width;
    traceImageCanvas.height = traceCanvas.height;
    const traceImageContext = traceImageCanvas.getContext('2d');

    function buildGoldenTrace() {
        const width = traceImageCanvas.width;
        const height = traceImageCanvas.height;
        const scale = Math.min(width / traceSource.naturalWidth, height / traceSource.naturalHeight);
        const imageWidth = traceSource.naturalWidth * scale;
        const imageHeight = traceSource.naturalHeight * scale;

        traceImageContext.clearRect(0, 0, width, height);
        traceImageContext.drawImage(traceSource, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);

        const sourcePixels = traceImageContext.getImageData(0, 0, width, height).data;
        const luminance = new Float32Array(width * height);
        const edges = traceImageContext.createImageData(width, height);

        for (let index = 0; index < luminance.length; index++) {
            const pixel = index * 4;
            luminance[index] = (0.2126 * sourcePixels[pixel] + 0.7152 * sourcePixels[pixel + 1] + 0.0722 * sourcePixels[pixel + 2]) / 255;
        }

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const topLeft = luminance[(y - 1) * width + x - 1];
                const top = luminance[(y - 1) * width + x];
                const topRight = luminance[(y - 1) * width + x + 1];
                const left = luminance[y * width + x - 1];
                const right = luminance[y * width + x + 1];
                const bottomLeft = luminance[(y + 1) * width + x - 1];
                const bottom = luminance[(y + 1) * width + x];
                const bottomRight = luminance[(y + 1) * width + x + 1];
                const horizontal = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
                const vertical = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
                const strength = Math.hypot(horizontal, vertical);

                if (strength < 0.48) continue;

                const pixel = (y * width + x) * 4;
                edges.data[pixel] = 232;
                edges.data[pixel + 1] = 200;
                edges.data[pixel + 2] = 118;
                edges.data[pixel + 3] = Math.min(230, 55 + (strength - 0.48) * 220);
            }
        }

        traceImageContext.clearRect(0, 0, width, height);
        traceImageContext.putImageData(edges, 0, 0);
    }

    function renderGoldenTrace() {
        traceContext.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
        traceContext.save();
        traceContext.globalAlpha = 0.8;
        traceContext.shadowColor = '#fcb000';
        traceContext.shadowBlur = 18;
        traceContext.drawImage(traceImageCanvas, 0, 0);
        traceContext.globalAlpha = 0.95;
        traceContext.shadowBlur = 0;
        traceContext.drawImage(traceImageCanvas, 0, 0);
        traceContext.restore();
    }

    let traceVisible = false;
    let traceStarted = false;

    function startGoldenTrace() {
        if (!traceVisible || traceStarted || !traceSource.naturalWidth) return;
        traceStarted = true;
        buildGoldenTrace();
        renderGoldenTrace();
    }

    function loadGoldenTrace() {
        if (traceSource.complete && traceSource.naturalWidth > 0) {
            startGoldenTrace();
            return;
        }

        traceVisible = true;
        traceSource.addEventListener('load', startGoldenTrace, { once: true });
        traceSource.addEventListener('error', () => {
            console.error('Unable to load the golden trace image.', traceSource.dataset.src);
        }, { once: true });
        traceSource.src = traceSource.dataset.src;
    }

    if ('IntersectionObserver' in window) {
        const traceObserver = new IntersectionObserver((entries, observer) => {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            loadGoldenTrace();
        }, { rootMargin: '150px' });
        traceObserver.observe(traceCanvas);
    } else {
        loadGoldenTrace();
    }
}

initializeGoldenTrace('gold-trace-source', 'gold-trace-canvas');
initializeGoldenTrace('skills-trace-source', 'skills-trace-canvas');

function initializeProjectVideo(video) {
    const source = video.querySelector('source');
    const clipStart = 1;
    const configuredClipEnd = Number(video.dataset.clipEnd);
    video.playbackRate = 1.5;
    video.controls = prefersReducedMotion;
    const startClip = () => { video.currentTime = clipStart; };

    video.addEventListener('loadedmetadata', startClip, { once: true });
    video.addEventListener('error', () => {
        console.error('Unable to load the project demo video.', video.error);
    }, { once: true });
    video.addEventListener('timeupdate', () => {
        const clipEnd = configuredClipEnd || video.duration;
        const loopThreshold = configuredClipEnd ? clipEnd : clipEnd - 0.25;
        if (video.currentTime >= loopThreshold) startClip();
    });

    const loadAndPlay = () => {
        if (!source.src) {
            source.src = source.dataset.src;
            video.load();
        }
        if (prefersReducedMotion) return;

        const playback = video.play();
        if (playback) {
            playback.catch((error) => {
                if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
                    console.error('Unable to play the project demo video.', error);
                }
            });
        }
    };

    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            if (entries[0].intersectionRatio >= 0.2) loadAndPlay();
            else video.pause();
        }, { threshold: [0, 0.2] });
        videoObserver.observe(video);
    } else {
        loadAndPlay();
    }
}

function enableRevealAnimations() {
    document.body.classList.add('motion-ready');

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const revealObserver = prefersReducedMotion || !('IntersectionObserver' in window)
        ? null
        : new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                entry.target.classList.toggle('is-visible', entry.isIntersecting);
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -6% 0px'
        });

    revealElements.forEach((element, index) => {
        element.style.setProperty('--reveal-delay', `${Math.min(index * 80, 360)}ms`);
        if (!revealObserver) {
            element.classList.add('is-visible');
            return;
        }

        revealObserver.observe(element);
    });
}

document.querySelectorAll('.featured-project-media video').forEach(initializeProjectVideo);

if (img.complete) {
    init();
    animate();
    enableRevealAnimations();
} else {
    img.addEventListener('load', () => { init(); animate(); enableRevealAnimations(); });
}
