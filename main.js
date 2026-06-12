const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth * 0.85;
canvas.height = window.innerHeight * 0.85;

// Map
const map = [
    "111111111111111111111111",
    "100000000000000000000001",
    "100020000003000000020001",
    "100000111110000001110001",
    "100000100010000001000001",
    "100000100010000001000001",
    "100000111110000000000001",
    "100000000000000000000001",
    "100030000000000000030001",
    "100000000111000000000001",
    "100000000100000200000001",
    "100020000100000000000001",
    "100000000111000000000001",
    "100000000000000000000001",
    "100000000000000000000001",
    "111111111111111111111111"
];

// Wall text
const wallSentences = {
    "1": [
        "FACILITY SECTOR SECURE CONTAINMENT ACTIVE ",
        "PERIMETER LOCK ENGAGED ALL UNITS STANDBY ",
        "ZONE ALPHA CLEAR PROCEED WITH CAUTION NOW ",
        "GRID OFFLINE REROUTING POWER SYSTEMS LINE ",
        "SCAN COMPLETE NO ANOMALIES DETECTED HERE ",
        "ACCESS DENIED UNAUTHORIZED ENTRY LOCKED ",
        "SURVEILLANCE ACTIVE MONITORING SECTORS ",
        "LOCKDOWN PROTOCOL SEVEN HOLD POSITION NOW "
    ],
    "2": [
        "TOXIC LEAK DETECTED HAZARD ZONE EVACUATE ",
        "BIOHAZARD LEVEL FOUR SEAL ALL VENTS NOW ",
        "CONTAMINATION SPREADING QUARANTINE PROTOCOL ",
        "PURGE INITIATED STAND CLEAR OF EXHAUSTS ",
        "CHEMICAL AGENT UNKNOWN DO NOT BREATHE AIR ",
        "DECONTAMINATION REQUIRED BEFORE ENTRY ",
        "EXPOSURE LIMIT EXCEEDED SEEK MEDICAL AID ",
        "AIRBORNE PATHOGEN DETECTED MASKS REQUIRED "
    ],
    "3": [
        "REACTOR CORE INSTABILITY CRITICAL FAILURE ",
        "MELTDOWN IMMINENT EVACUATE ALL PERSONNEL ",
        "THERMAL OVERLOAD DETECTED SHUTDOWN RUNNING ",
        "COOLANT LOSS IN SECTOR THREE ALERT ALERT ",
        "RADIATION LEVELS RISING BREACH IMMINENT ",
        "EMERGENCY SHUTDOWN INITIATED STAND CLEAR ",
        "CORE TEMPERATURE EXCEEDING SAFE LIMITS ",
        "FUSION CHAIN REACTION UNSTABLE EVACUATE "
    ]
};

const wallColor = {
    "1": [170, 20, 20],
    "2": [40, 180, 70],
    "3": [210, 110, 30]
};

// Player
const player = {
    x: 2.5,
    y: 2.5,
    a: 0,
    ammo: 8, // Changed from 25 to 8
    kills: 0,
    health: 50,
    reload: false,
    reloadTimer: 0,
    flashTimer: 0,
    damageIndicator: 0
};

const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup",   e => keys[e.key.toLowerCase()] = false);

// Input
let locked = false;
canvas.onclick = () => {
    if (gameRunning) {
        canvas.requestPointerLock();
    } else if (reloadReady) {
        window.location.reload();
    }
};
document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", e => {
    if (!locked) return;
    player.a += e.movementX * 0.0022;
});

// Enemies
let enemies = [];
const spawnPoints = [
    { x: 10, y: 3,  cooldown: 0 },
    { x: 18, y: 5,  cooldown: 0 },
    { x: 8,  y: 8,  cooldown: 0 },
    { x: 20, y: 10, cooldown: 0 },
    { x: 5,  y: 12, cooldown: 0 },
    { x: 14, y: 13, cooldown: 0 },
];

const SPAWN_COOLDOWN = 60;
let spawnTimer   = 0;
const MAX_ENEMIES = 8;
const ENEMY_SPEED = 0.006;

function spawnEnemy() {
    let activeCount = enemies.filter(e => e.alive).length;
    if (activeCount >= MAX_ENEMIES) return;

    for (const p of spawnPoints) {
        if (p.cooldown > 0) p.cooldown--;
    }

    let attempts = 1;
    if (activeCount <= 1) {
        attempts = Math.min(MAX_ENEMIES - activeCount, 4); // Changed from 3 to 4
    }

    for (let i = 0; i < attempts; i++) {
        activeCount = enemies.filter(e => e.alive).length;
        if (activeCount >= MAX_ENEMIES) break;

        const candidates = spawnPoints
            .filter(p => p.cooldown <= 0 || activeCount <= 1)
            .sort(() => Math.random() - 0.5);

        let spawnedThisAttempt = false;
        for (const p of candidates) {
            let blocked = false;
            for (const e of enemies) {
                if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y;
                if (Math.sqrt(dx*dx + dy*dy) < 1.2) { blocked = true; break; }
            }
            const pdx = player.x - p.x, pdy = player.y - p.y;
            if (Math.sqrt(pdx*pdx + pdy*pdy) < 3.0) blocked = true;
            if (map[Math.floor(p.y)]?.[Math.floor(p.x)] !== "0") blocked = true;

            if (!blocked) {
                enemies.push({ x: p.x, y: p.y, alive: true, spawnPoint: p });
                p.cooldown = SPAWN_COOLDOWN;
                spawnedThisAttempt = true;
                break;
            }
        }
    }
}

// Initial spawn
for (let i = 0; i < 3; i++) spawnEnemy();

// Shooting
canvas.addEventListener("mousedown", shoot);
function shoot() {
    if (!gameRunning) return; // Prevent shooting when game is over
    if (player.reload || player.ammo <= 0) return;
    player.ammo--;

    player.flashTimer = 6;

    if (player.ammo === 0) { player.reload = true; player.reloadTimer = 150; } // Changed from 90 to 150
    
    let shotHit = false;
    for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist  = Math.sqrt(dx*dx + dy*dy);
        const angleToEnemy = Math.atan2(dy, dx);

        let diff = Math.abs(angleToEnemy - player.a);
        diff = Math.min(diff, Math.PI * 2 - diff);

        // Check if enemy is within the shooting cone
        if (dist < 10 && diff < 0.25) {
            // Perform a raycast from player to enemy to check for wall obstruction
            const rayToEnemy = cast(angleToEnemy);
            
            // If the ray hits a wall before reaching the enemy, the shot is blocked
            if (rayToEnemy.cell !== "0" && rayToEnemy.dist < dist) {
                continue; // Wall is in the way, enemy not hit
            }

            // Enemy is hit
            e.alive = false;
            player.kills++;
            if (e.spawnPoint) e.spawnPoint.cooldown = 120;
            shotHit = true;
            break; // Only hit one enemy per shot
        }
    }
}

// Raycast
function cast(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = Math.abs(1 / cos);
    const deltaDistY = Math.abs(1 / sin);

    let sideDistX, sideDistY;
    let stepX, stepY;

    if (cos < 0) {
        stepX = -1;
        sideDistX = (player.x - mapX) * deltaDistX;
    } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
    }
    if (sin < 0) {
        stepY = -1;
        sideDistY = (player.y - mapY) * deltaDistY;
    } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
    }

    let hit = 0;
    let hitSide = 0;
    let currentDist = 0; // Track distance for raycast

    const MAX_RAY_DIST = 20; // Max distance for raycast

    while (hit === 0 && currentDist < MAX_RAY_DIST) {
        if (sideDistX < sideDistY) {
            currentDist = sideDistX;
            sideDistX += deltaDistX;
            mapX += stepX;
            hitSide = 0;
        } else {
            currentDist = sideDistY;
            sideDistY += deltaDistY;
            mapY += stepY;
            hitSide = 1;
        }
        if (map[mapY]?.[mapX] && map[mapY][mapX] !== "0") {
            hit = 1;
        }
    }

    let perpWallDist;
    if (hitSide === 0) perpWallDist = (sideDistX - deltaDistX);
    else              perpWallDist = (sideDistY - deltaDistY);

    const hitX = player.x + perpWallDist * cos;
    const hitY = player.y + perpWallDist * sin;
    const texX = (hitSide === 0) ? hitY % 1.0 : hitX % 1.0;

    // Return currentDist if hit is 0 (no wall hit within MAX_RAY_DIST)
    return { dist: hit ? perpWallDist : MAX_RAY_DIST, cell: hit ? map[mapY][mapX] : "0", texX, mx: mapX, my: mapY, hitSide, hitX, hitY };
}

// Hash
function hash2(a, b) {
    let n = Math.imul(a ^ (b << 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 15), 0x9b4e6f3d);
    return (n ^ (n >>> 13)) >>> 0;
}

// Wall renderer
let currentWallSegment = null; // Stores info about the current continuous visual wall segment

function drawWallColumn(rayIndex, hit, w, h, rays) {
    // Determine if a new visual segment should start
    const isNewSegment = (
        rayIndex === 0 || // Always a new segment for the first ray
        hit.cell === "0" || // If we hit empty space, the segment is broken
        (currentWallSegment && hit.hitSide !== currentWallSegment.initialHitSide) || // If hit side changes, it's a new segment (e.g., corner)
        (currentWallSegment && hit.cell !== currentWallSegment.lastHitCell && hit.cell !== "0") // If wall type changes but it's still a wall
    );

    if (isNewSegment) {
        currentWallSegment = null; // Reset the segment
    }

    // If we hit a wall and don't have an active segment, start a new one
    if (hit.cell !== "0" && !currentWallSegment) {
        currentWallSegment = {
            startRayIndex: rayIndex,
            startMx: hit.mx,
            startMy: hit.my,
            initialCellType: hit.cell,
            initialHitSide: hit.hitSide,
            lastHitCell: hit.cell // Track the last hit cell type for continuity check
        };
    } else if (currentWallSegment && hit.cell !== "0") {
        // Update lastHitCell for existing segment if it's a wall
        currentWallSegment.lastHitCell = hit.cell;
    }


    if (hit.cell === "0" || !currentWallSegment) {
        // If it's empty space or no active segment, nothing to draw for text
        return;
    }

    const viewAngle = player.a - (player.a + (rayIndex / rays - 0.5) * 1.2);
    const correctedDist = hit.dist * Math.cos(viewAngle);
    const dist = Math.max(correctedDist, 0.1);

    const wallHeight = h / dist;
    const screenX = (rayIndex / rays) * w;
    const top = h / 2 - wallHeight / 2;
    const bottom = h / 2 + wallHeight / 2;

    const color = wallColor[hit.cell] || [180, 180, 180]; // Wall color still based on current hit.cell
    const shade = 1 / (1 + dist * dist * 0.05);
    const bright = Math.min(1, shade * 2.2);

    const r = (color[0] * bright) | 0;
    const g = (color[1] * bright) | 0;
    const b = (color[2] * bright) | 0;

    const minFontSize = 8; // Minimum legible font size
    const maxFontSize = 24; // Maximum font size
    const verticalScaleFactor = 8; // How much wallHeight influences font size

    // Reverted font size calculation to the "good" version
    const fontSize = Math.max(6, Math.min(24, wallHeight / 8));
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgb(${r},${g},${b})`;

    // Use the initialCellType of the current continuous segment for sentence selection
    const sentences = wallSentences[currentWallSegment.initialCellType] || wallSentences["1"];
    const rowStepHeight = Math.max(8, fontSize + 1);

    // Reintroduced raysPerCharacter logic
    const charWidthPixels = ctx.measureText("M").width;
    const rayColumnWidth = w / rays;
    const raysPerCharacter = Math.max(1, Math.round(charWidthPixels / rayColumnWidth));

    if ((rayIndex - currentWallSegment.startRayIndex) % raysPerCharacter !== 0) {
        return; // Only draw a character every `raysPerCharacter` rays
    }

    // Centered character drawing
    const charScreenX = ((rayIndex + raysPerCharacter / 2) / rays) * w;

    const startRowIdx = Math.floor((-wallHeight / 2) / rowStepHeight);
    const endRowIdx   = Math.ceil((wallHeight / 2) / rowStepHeight);

    // Character index relative to the start of the current continuous visual segment, adjusted for raysPerCharacter
    const charIndexInSegment = Math.floor((rayIndex - currentWallSegment.startRayIndex) / raysPerCharacter);

    for (let rowNum = startRowIdx; rowNum <= endRowIdx; rowNum++) {
        const y = h / 2 + rowNum * rowStepHeight;
        if (y < top || y > bottom) continue;

        // Use the startMx and startMy of the current continuous segment for tileSeed
        const tileSeed = hash2(currentWallSegment.startMx, currentWallSegment.startMy);
        const sentenceIndex = Math.abs(tileSeed + rowNum) % sentences.length;
        const currentSentence = sentences[sentenceIndex];

        const character = currentSentence[charIndexInSegment % currentSentence.length];

        if (character) {
            ctx.fillText(character, charScreenX, y);
        }
    }
}

// Game state
let gameRunning = true;
let reloadReady = false;
let gameOverDelay = 0;
const GAME_OVER_RELOAD_DELAY = 60*3; // 60 frames = 1 second at 60fps

// Mobile Input Variables
let touchStartX = 0;
let touchStartY = 0;
let touchMoveX = 0;
let touchMoveY = 0;
let isTouching = false;
let touchMovementInterval;

// Create on-screen controls for mobile
const mobileControls = document.createElement('div');
mobileControls.id = 'mobile-controls';
mobileControls.style.position = 'absolute';
mobileControls.style.bottom = '10px';
mobileControls.style.left = '10px';
mobileControls.style.zIndex = '1000';
mobileControls.style.display = 'grid';
mobileControls.style.gridTemplateColumns = 'repeat(3, 50px)';
mobileControls.style.gridTemplateRows = 'repeat(3, 50px)';
mobileControls.style.gap = '5px';

const createButton = (text, id, gridArea) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.id = id;
    button.style.width = '50px';
    button.style.height = '50px';
    button.style.background = 'rgba(255, 255, 255, 0.3)';
    button.style.color = 'white';
    button.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    button.style.borderRadius = '5px';
    button.style.fontSize = '16px';
    button.style.gridArea = gridArea;
    return button;
};

const btnW = createButton('W', 'btn-w', '1 / 2 / 2 / 3');
const btnA = createButton('A', 'btn-a', '2 / 1 / 3 / 2');
const btnS = createButton('S', 'btn-s', '2 / 2 / 3 / 3');
const btnD = createButton('D', 'btn-d', '2 / 3 / 3 / 4');

mobileControls.appendChild(btnW);
mobileControls.appendChild(btnA);
mobileControls.appendChild(btnS);
mobileControls.appendChild(btnD);

document.body.appendChild(mobileControls);

// Mobile Movement Logic
const handleTouchMoveStart = (key) => {
    keys[key] = true;
    if (!touchMovementInterval) {
        touchMovementInterval = setInterval(() => {
            // Movement is handled in the main loop based on `keys` state
        }, 1000 / 60); // Simulate 60 FPS update for movement
    }
};

const handleTouchMoveEnd = (key) => {
    keys[key] = false;
    // Check if all movement keys are released, then clear interval
    if (!keys['w'] && !keys['a'] && !keys['s'] && !keys['d']) {
        clearInterval(touchMovementInterval);
        touchMovementInterval = null;
    }
};

btnW.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchMoveStart('w'); });
btnW.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchMoveEnd('w'); });
btnA.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchMoveStart('a'); });
btnA.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchMoveEnd('a'); });
btnS.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchMoveStart('s'); });
btnS.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchMoveEnd('s'); });
btnD.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchMoveStart('d'); });
btnD.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchMoveEnd('d'); });

// Mobile Look and Shoot Logic
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior like scrolling
    if (!gameRunning && reloadReady) {
        window.location.reload();
        return;
    }
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isTouching = true;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isTouching && e.touches.length === 1) {
        touchMoveX = e.touches[0].clientX;
        touchMoveY = e.touches[0].clientY;
        const deltaX = touchMoveX - touchStartX;
        // const deltaY = touchMoveY - touchStartY; // Not using vertical look for now

        player.a += deltaX * 0.005; // Adjust sensitivity as needed

        touchStartX = touchMoveX;
        touchStartY = touchMoveY;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameRunning && reloadReady) {
        // Already handled in touchstart for game over reload
        return;
    }
    if (isTouching) {
        isTouching = false;
        // If it was a tap (no significant movement), consider it a shot
        // A small threshold to differentiate tap from drag
        const tapThreshold = 10; 
        if (Math.abs(touchMoveX - touchStartX) < tapThreshold && Math.abs(touchMoveY - touchStartY) < tapThreshold) {
            shoot();
        }
    }
});


// Main loop
function loop() {
    const w = canvas.width;
    const h = canvas.height;

    if (gameRunning) {
        spawnTimer++;
        if (spawnTimer > 20) {
            spawnEnemy();
            spawnTimer = 0;
        }

        enemies = enemies.filter(e => e.alive || (!e.alive && e.spawnPoint?.cooldown > 0));

        if (player.reload) {
            player.reloadTimer--;
            if (player.reloadTimer <= 0) { player.ammo = 8; player.reload = false; }
        }

        if (player.flashTimer > 0) player.flashTimer--;
        if (player.damageIndicator > 0) player.damageIndicator--;

        // Movement keybinds
        const move = 0.025;
        if (keys["w"]) {
            const nx = player.x + Math.cos(player.a) * move;
            const ny = player.y + Math.sin(player.a) * move;
            if (map[Math.floor(player.y)]?.[Math.floor(nx)] === "0") player.x = nx;
            if (map[Math.floor(ny)]?.[Math.floor(player.x)] === "0") player.y = ny;
        }
        if (keys["s"]) {
            const nx = player.x - Math.cos(player.a) * move;
            const ny = player.y - Math.sin(player.a) * move;
            if (map[Math.floor(player.y)]?.[Math.floor(nx)] === "0") player.x = nx;
            if (map[Math.floor(ny)]?.[Math.floor(player.x)] === "0") player.y = ny;
        }
        if (keys["a"]) {
            const nx = player.x + Math.cos(player.a - Math.PI / 2) * move;
            const ny = player.y + Math.sin(player.a - Math.PI / 2) * move;
            if (map[Math.floor(player.y)]?.[Math.floor(nx)] === "0") player.x = nx;
            if (map[Math.floor(ny)]?.[Math.floor(player.x)] === "0") player.y = ny;
        }
        if (keys["d"]) {
            const nx = player.x + Math.cos(player.a + Math.PI / 2) * move;
            const ny = player.y + Math.sin(player.a + Math.PI / 2) * move;
            if (map[Math.floor(player.y)]?.[Math.floor(nx)] === "0") player.x = nx;
            if (map[Math.floor(ny)]?.[Math.floor(player.x)] === "0") player.y = ny;
        }

        const alive = enemies.filter(e => e.alive);
        for (const e of alive) {
            const edx = player.x - e.x;
            const edy = player.y - e.y;
            const edist = Math.sqrt(edx * edx + edy * edy);

            if (edist > 0.45) {
                const moveX = (edx / edist) * ENEMY_SPEED;
                const moveY = (edy / edist) * ENEMY_SPEED;

                if (map[Math.floor(e.y)]?.[Math.floor(e.x + moveX)] === "0") e.x += moveX;
                if (map[Math.floor(e.y + moveY)]?.[Math.floor(e.x)] === "0") e.y += moveY;
            } else {
                if (player.health > 0) {
                    player.health -= 0.012;
                    if (Math.random() < 0.05) player.damageIndicator = 3;
                }
            }
        }

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        const rays = 140;
        const zBuffer = new Float32Array(rays);
        const fov = 1.2;

        currentWallSegment = null; // Reset for each frame

        for (let i = 0; i < rays; i++) {
            const angle = player.a + (i / rays - 0.5) * fov;
            const hit = cast(angle);
            zBuffer[i] = hit.dist;
            drawWallColumn(i, hit, w, h, rays);
        }

        alive.sort((a, b) => {
            const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
            const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
            return db - da;
        });

        for (const e of alive) {
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let relAngle = Math.atan2(dy, dx) - player.a;
            while (relAngle >  Math.PI) relAngle -= Math.PI * 2;
            while (relAngle < -Math.PI) relAngle += Math.PI * 2;

            if (Math.abs(relAngle) > fov / 2 + 0.2) continue;

            const size = Math.min(h, 240 / dist);
            const sx = w / 2 + (relAngle / fov) * w;

            const x0 = Math.max(0,      Math.floor(sx - size / 2));
            const x1 = Math.min(w - 1,  Math.floor(sx + size / 2));
            let visible = false;
            for (let px = x0; px <= x1; px++) {
                const ri = Math.min(rays - 1, Math.floor((px / w) * rays));
                if (zBuffer[ri] > dist) { visible = true; break; }
            }
            if (!visible) continue;

            const maxDistDistance = 12;
            const proximityFactor = Math.max(0, Math.min(1, dist / maxDistDistance));
            const finalRed = Math.floor(75 + (proximityFactor * 180));

            ctx.fillStyle = `rgb(${finalRed}, 15, 15)`;
            ctx.font = `${size}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("▲", sx, h / 2);
        }

        // Crosshair
        ctx.fillStyle = "rgba(220, 30, 30, 0.8)";
        ctx.fillRect(w / 2 - 2, h / 2 - 2, 4, 4);

        // Gun and Flash
        const gunY = h - 80;
        if (player.flashTimer > 0) {
            const particles = ["*FLASH*", "##BANG##", "!!!!", "💥"];
            ctx.fillStyle = "rgb(255, 230, 40)";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            for (let k = 0; k < 3; k++) {
                const str = particles[Math.floor(Math.random() * particles.length)];
                const size = Math.floor(Math.random() * 12) + 16;
                const offsetX = (Math.random() - 0.5) * 50;
                const offsetY = (Math.random() - 0.5) * 30;

                ctx.font = `bold ${size}px monospace`;
                ctx.fillText(str, w / 2 + offsetX, (gunY - 35) + offsetY);
            }
        }

        ctx.strokeStyle = "#555";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 15, h - 60);
        ctx.lineTo(w / 2 - 15, gunY);
        ctx.lineTo(w / 2 + 15, gunY);
        ctx.lineTo(w / 2 + 15, h - 60);
        ctx.stroke();

        if (player.damageIndicator > 0) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.12)";
            ctx.fillRect(0, 0, w, h);
        }

        const s = 6;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(10, 10, map[0].length * s + 10, map.length * s + 10);

        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x] !== "0") {
                    ctx.fillStyle = "#333";
                    ctx.fillRect(15 + x * s, 15 + y * s, s - 1, s - 1);
                }
            }
        }

        ctx.fillStyle = "rgb(200, 40, 40)";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const e of enemies.filter(e => e.alive)) {
            ctx.fillText("▲", 15 + e.x * s, 15 + e.y * s);
        }

        ctx.fillStyle = "white";
        ctx.fillRect(15 + player.x * s - 1, 15 + player.y * s - 1, 3, 3);

        ctx.fillStyle = "#a02020";
        ctx.font = "14px monospace";
        ctx.textBaseline = "middle";

        ctx.textAlign = "left";
        ctx.fillText(`♥ HEALTH ${Math.max(0, Math.floor(player.health))}`, 30, h - 25);

        ctx.textAlign = "center";
        ctx.fillText(`☠ KILLS ${player.kills}`, w / 2, h - 25);

        ctx.textAlign = "right";
        ctx.fillText(`⚡ AMMO ${player.ammo}${player.reload ? " (RELOADING)" : ""}`, w - 30, h - 25);

        if (player.health <= 0) {
            gameRunning = false;
            document.exitPointerLock();
            gameOverDelay = GAME_OVER_RELOAD_DELAY; // Start delay for reload
            reloadReady = false;
        }
    } else {
        // Game Over screen
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#a02020";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", w / 2, h / 2 - 50);

        ctx.font = "bold 30px monospace";
        ctx.fillText(`KILLS: ${player.kills}`, w / 2, h / 2 + 10);

        if (gameOverDelay > 0) {
            gameOverDelay--;
        } else {
            reloadReady = true;
            ctx.font = "24px monospace";
            ctx.fillText("PRESS SPACE OR TAP TO PLAY AGAIN", w / 2, h / 2 + 80);
        }

        if (reloadReady && keys[" "]) {
            window.location.reload();
        }
    }
    requestAnimationFrame(loop);
}
loop();