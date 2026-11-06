// ============================================
// JUEGO MATA PATO - Lógica completa
// ============================================

// --- Variables de estado ---
let score = 0;
let level = 1;
let lives = 3;
let ducksHit = 0;
let ducksEscaped = 0;
let isPlaying = false;
let isPaused = false;
let soundEnabled = true;
let gameLoop = null;
let spawnTimer = null;
let activeDucks = [];
let audioCtx = null;

// Configuración
const CONFIG = {
    baseSpawnInterval: 1200,     // ms entre patos
    minSpawnInterval: 400,       // mínimo en nivel alto
    duckSpeed: 1.8,              // velocidad base
    speedIncrement: 0.3,         // aumento por nivel
    ducksPerLevel: 5,            // patos para subir de nivel
    maxDucksOnScreen: 6
};

// --- Referencias DOM ---
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const finalMessageEl = document.getElementById('finalMessage');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resumeBtn = document.getElementById('resumeBtn');
const soundBtn = document.getElementById('soundBtn');

// ============================================
// SISTEMA DE AUDIO (Web Audio API - sin archivos)
// ============================================
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Sonido de disparo
function playShootSound() {
    if (!soundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

// Sonido de pato impactado
function playHitSound() {
    if (!soundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

// Sonido de pato escapando (error)
function playEscapeSound() {
    if (!soundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
}

// Sonido de subir de nivel
function playLevelUpSound() {
    if (!soundEnabled || !audioCtx) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        }, i * 100);
    });
}

// Sonido de game over
function playGameOverSound() {
    if (!soundEnabled || !audioCtx) return;
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }, i * 200);
    });
}

// ============================================
// IMAGEN DEL PATO (SVG inline)
// ============================================
function getDuckSVG() {
    return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <!-- Cuerpo -->
        <ellipse cx="50" cy="60" rx="30" ry="22" fill="#FFD93D"/>
        <ellipse cx="50" cy="60" rx="30" ry="22" fill="url(#bodyGrad)"/>
        <!-- Ala -->
        <ellipse cx="55" cy="58" rx="18" ry="12" fill="#FFC107"/>
        <!-- Cabeza -->
        <circle cx="38" cy="38" r="18" fill="#FFD93D"/>
        <circle cx="38" cy="38" r="18" fill="url(#headGrad)"/>
        <!-- Ojo -->
        <circle cx="33" cy="35" r="4" fill="white"/>
        <circle cx="32" cy="35" r="2.5" fill="#1a1a1a"/>
        <circle cx="31" cy="34" r="0.8" fill="white"/>
        <!-- Pico -->
        <path d="M 20 40 L 8 44 L 20 48 Z" fill="#FF8C00"/>
        <path d="M 20 40 L 8 44 L 20 48 Z" fill="url(#beakGrad)"/>
        <!-- Cola -->
        <path d="M 75 55 L 90 50 L 88 58 L 92 62 L 75 65 Z" fill="#FFC107"/>
        <!-- Patas -->
        <line x1="42" y1="80" x2="42" y2="90" stroke="#FF8C00" stroke-width="3"/>
        <line x1="58" y1="80" x2="58" y2="90" stroke="#FF8C00" stroke-width="3"/>
        <path d="M 36 90 L 48 90 M 38 90 L 42 94 M 42 90 L 42 94 M 46 90 L 42 94" stroke="#FF8C00" stroke-width="2" fill="none"/>
        <path d="M 52 90 L 64 90 M 54 90 L 58 94 M 58 90 L 58 94 M 62 90 L 58 94" stroke="#FF8C00" stroke-width="2" fill="none"/>
        
        <defs>
            <radialGradient id="bodyGrad" cx="30%" cy="30%">
                <stop offset="0%" stop-color="#FFE87C"/>
                <stop offset="100%" stop-color="#FFC107"/>
            </radialGradient>
            <radialGradient id="headGrad" cx="30%" cy="30%">
                <stop offset="0%" stop-color="#FFE87C"/>
                <stop offset="100%" stop-color="#FFB300"/>
            </radialGradient>
            <linearGradient id="beakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FF6D00"/>
                <stop offset="100%" stop-color="#FF8C00"/>
            </linearGradient>
        </defs>
    </svg>
    `;
}

// ============================================
// LÓGICA DEL JUEGO
// ============================================

function updateHUD() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
}

function resetGame() {
    score = 0;
    level = 1;
    lives = 3;
    ducksHit = 0;
    ducksEscaped = 0;
    isPlaying = true;
    isPaused = false;
    activeDucks.forEach(d => d.el.remove());
    activeDucks = [];
    updateHUD();
}

function getSpawnInterval() {
    return Math.max(
        CONFIG.minSpawnInterval,
        CONFIG.baseSpawnInterval - (level - 1) * 100
    );
}

function getDuckSpeed() {
    return CONFIG.duckSpeed + (level - 1) * CONFIG.speedIncrement;
}

// Crear un pato
function spawnDuck() {
    if (!isPlaying || isPaused) return;
    if (activeDucks.length >= CONFIG.maxDucksOnScreen) return;

    const duckEl = document.createElement('div');
    duckEl.className = 'duck';
    duckEl.innerHTML = getDuckSVG();

    const gameRect = gameArea.getBoundingClientRect();
    const duckSize = 90;
    const maxY = gameRect.height - duckSize - 40;
    const startY = Math.random() * (maxY - 80) + 40;

    // Dirección aleatoria (izq o der)
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -duckSize : gameRect.width + duckSize;
    const speed = getDuckSpeed();
    const vx = fromLeft ? speed : -speed;

    duckEl.style.left = startX + 'px';
    duckEl.style.top = startY + 'px';
    duckEl.style.transform = fromLeft ? 'scaleX(1)' : 'scaleX(-1)';

    gameArea.appendChild(duckEl);

    const duckObj = {
        el: duckEl,
        x: startX,
        y: startY,
        vx: vx,
        hit: false
    };
    activeDucks.push(duckObj);

    // Click para disparar
    duckEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (duckObj.hit || !isPlaying || isPaused) return;
        duckObj.hit = true;
        onDuckHit(duckObj);
    });
}

function onDuckHit(duckObj) {
    // Sonido
    playShootSound();
    setTimeout(playHitSound, 50);

    // Efecto visual
    createShotEffect(duckObj.x + 45, duckObj.y + 45);
    createFloatingScore(duckObj.x + 45, duckObj.y + 30, '+10');

    // Actualizar puntuación
    score += 10;
    ducksHit++;
    updateHUD();

    // Animación del pato
    duckObj.el.classList.add('hit');

    // Remover pato
    setTimeout(() => {
        duckObj.el.remove();
        activeDucks = activeDucks.filter(d => d !== duckObj);
    }, 500);

    // Subir de nivel
    if (ducksHit > 0 && ducksHit % CONFIG.ducksPerLevel === 0) {
        levelUp();
    }
}

function onDuckEscape(duckObj) {
    if (duckObj.hit) return;
    duckObj.hit = true;
    playEscapeSound();
    ducksEscaped++;
    lives--;
    updateHUD();

    // Efecto visual
    createFloatingScore(
        Math.min(Math.max(duckObj.x + 45, 40), gameArea.clientWidth - 40),
        80,
        '-1 ❤️'
    );

    duckObj.el.remove();
    activeDucks = activeDucks.filter(d => d !== duckObj);

    if (lives <= 0) {
        gameOver();
    }
}

function levelUp() {
    level++;
    updateHUD();
    playLevelUpSound();
    showBanner('¡NIVEL ' + level + '!', '#ffd700');
}

function showBanner(text, color) {
    const banner = document.createElement('div');
    banner.textContent = text;
    banner.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Press Start 2P', cursive;
        font-size: 3rem;
        color: ${color};
        text-shadow: 0 0 20px ${color}, 0 0 40px ${color};
        z-index: 100;
        pointer-events: none;
        animation: levelBanner 1.5s ease-out forwards;
    `;
    gameArea.appendChild(banner);
    setTimeout(() => banner.remove(), 1500);
}

function createShotEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'shot-effect';
    effect.style.left = (x - 50) + 'px';
    effect.style.top = (y - 50) + 'px';
    gameArea.appendChild(effect);
    setTimeout(() => effect.remove(), 400);
}

function createFloatingScore(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floating-score';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    gameArea.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// Bucle principal del juego
function gameLoopFn() {
    if (!isPlaying || isPaused) {
        gameLoop = requestAnimationFrame(gameLoopFn);
        return;
    }

    const gameRect = gameArea.getBoundingClientRect();

    activeDucks.forEach(duck => {
        if (duck.hit) return;
        duck.x += duck.vx;
        duck.el.style.left = duck.x + 'px';

        // Pato escapó
        if (duck.vx > 0 && duck.x > gameRect.width + 100) {
            onDuckEscape(duck);
        } else if (duck.vx < 0 && duck.x < -150) {
            onDuckEscape(duck);
        }
    });

    gameLoop = requestAnimationFrame(gameLoopFn);
}

function startGameLoop() {
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(gameLoopFn);
}

function startSpawner() {
    if (spawnTimer) clearInterval(spawnTimer);
    spawnTimer = setInterval(() => {
        if (isPlaying && !isPaused) {
            spawnDuck();
        }
    }, getSpawnInterval());
}

function gameOver() {
    isPlaying = false;
    if (spawnTimer) clearInterval(spawnTimer);
    if (gameLoop) cancelAnimationFrame(gameLoop);
    activeDucks.forEach(d => d.el.remove());
    activeDucks = [];

    finalScoreEl.textContent = score;

    let msg = '';
    if (score >= 300) msg = '🏆 ¡Eres un maestro cazador de patos!';
    else if (score >= 200) msg = '🎯 ¡Excelente puntería!';
    else if (score >= 100) msg = '👍 ¡Buen trabajo!';
    else if (score >= 50) msg = '💪 ¡Sigue practicando!';
    else msg = '🦆 ¡Los patos ganaron esta vez!';

    finalMessageEl.textContent = msg;

    playGameOverSound();

    setTimeout(() => {
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
    }, 300);
}

function startGame() {
    initAudio();
    resetGame();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    startGameLoop();
    startSpawner();
    // Mostrar pato inmediatamente
    setTimeout(spawnDuck, 500);
}

function pauseGame() {
    if (!isPlaying) return;
    isPaused = true;
    pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    isPaused = false;
    pauseScreen.classList.add('hidden');
    startSpawner();
}

// ============================================
// EVENT LISTENERS
// ============================================

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', resumeGame);

// Botón de sonido
soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    if (soundEnabled) initAudio();
});

// ESC para pausar
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPlaying) {
        if (isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
});

// Click en el área (efecto visual + sonido)
gameArea.addEventListener('click', (e) => {
    if (!isPlaying || isPaused) return;
    playShootSound();
    const rect = gameArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    createShotEffect(x, y);
    createFloatingScore(x, y, '¡Fallo!');
});

// Reajustar spawn al subir de nivel
const originalLevelUp = levelUp;
levelUp = function() {
    originalLevelUp();
    startSpawner();
};

// Animación de banner (inyectar keyframes)
const style = document.createElement('style');
style.textContent = `
    @keyframes levelBanner {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5) translateY(-50px); }
    }
`;
document.head.appendChild(style);

// ============================================
// INICIALIZACIÓN
// ============================================
console.log('🦆 Mata Pato - ¡Listo para jugar!');