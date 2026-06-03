const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth * 0.85;
canvas.height = window.innerHeight * 0.85;

// -------------------- MAP --------------------
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

// -------------------- WALL SENTENCES --------------------
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

// -------------------- PLAYER --------------------
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

// -------------------- MOUSE LOOK --------------------
let locked = false;
canvas.onclick = () => canvas.requestPointerLock();
document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", e => {
    if (!locked) return;
    player.a += e.movementX * 0.0022;
});

// -------------------- ENEMIES --------------------
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

    // Determine how many enemies to try and spawn in this call
    let attempts = 1;
    if (activeCount <= 1) { // If very few enemies, try to spawn more aggressively
        attempts = Math.min(MAX_ENEMIES - activeCount, 4); // Changed from 3 to 4
    }

    for (let i = 0; i < attempts; i++) {
        activeCount = enemies.filter(e => e.alive).length; // Re-check active count before each attempt
        if (activeCount >= MAX_ENEMIES) break; // Stop if max enemies reached

        // Filter spawn points: if activeCount is low, temporarily ignore cooldowns for this burst spawn
        const candidates = spawnPoints
            .filter(p => p.cooldown <= 0 || activeCount <= 1) // Allow cooldown points if activeCount is low
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
                p.cooldown = SPAWN_COOLDOWN; // Still apply cooldown after spawning
                spawnedThisAttempt = true;
                break; // Spawned one, move to next attempt
            }
        }
    }
}

// Initial populate
for (let i = 0; i < 3; i++) spawnEnemy();

// -------------------- SHOOT --------------------
canvas.addEventListener("mousedown", shoot);
function shoot() {
    if (player.reload || player.ammo <= 0) return;
    player.ammo--;

    player.flashTimer = 6;

    if (player.ammo === 0) { player.reload = true; player.reloadTimer = 150; } // Changed from 90 to 150
    for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        const dist  = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        let diff = Math.abs(angle - player.a);
        diff = Math.min(diff, Math.PI * 2 - diff);
        if (dist < 10 && diff < 0.25) {
            e.alive = false;
            player.kills++;
            if (e.spawnPoint) e.spawnPoint.cooldown = 120;
            break;
        }
    }
}

// -------------------- DDA RAYCASTER --------------------
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

    while (hit === 0) {
        if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
            hitSide = 0;
        } else {
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

    return { dist: perpWallDist, cell: map[mapY][mapX], texX, mx: mapX, my: mapY, hitSide, hitX, hitY };
}

// -------------------- DETERMINISTIC HASH --------------------
function hash2(a, b) {
    let n = Math.imul(a ^ (b << 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 15), 0x9b4e6f3d);
    return (n ^ (n >>> 13)) >>> 0;
}

// -------------------- RENDER TRACKING STATES --------------------
let lastCellId = "";
let segmentStartRayIndex = 0;

function drawWallColumn(rayIndex, hit, w, h, rays) {
    if (hit.cell === "0") return;

    // Track when we transition into a brand new wall segment face
    const currentCellId = `${hit.mx},${hit.my},${hit.hitSide}`;
    if (rayIndex === 0 || currentCellId !== lastCellId) {
        segmentStartRayIndex = rayIndex;
        lastCellId = currentCellId;
    }

    const viewAngle = player.a - (player.a + (rayIndex / rays - 0.5) * 1.2);
    const correctedDist = hit.dist * Math.cos(viewAngle);
    const dist = Math.max(correctedDist, 0.1);

    const wallHeight = h / dist;
    const screenX = (rayIndex / rays) * w;
    const top = h / 2 - wallHeight / 2;
    const bottom = h / 2 + wallHeight / 2;

    const color = wallColor[hit.cell] || [180, 180, 180];
    const shade = 1 / (1 + dist * dist * 0.05);
    const bright = Math.min(1, shade * 2.2);

    const r = (color[0] * bright) | 0;
    const g = (color[1] * bright) | 0;
    const b = (color[2] * bright) | 0;

    // Fluid height adjustments
    const fontSize = Math.max(6, Math.min(24, wallHeight / 8));
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgb(${r},${g},${b})`;

    const sentences = wallSentences[hit.cell] || wallSentences["1"];
    const rowStepHeight = Math.max(8, fontSize + 1);

    // FIX: Character index tracking scales based directly on screen pixel spacing
    const charWidthPixels = fontSize * 0.62;
    const totalScreenPixelsFromWallStart = (rayIndex - segmentStartRayIndex) * (w / rays);
    const textColumnIndex = Math.floor(totalScreenPixelsFromWallStart / charWidthPixels);

    const startRowIdx = Math.floor((-wallHeight / 2) / rowStepHeight);
    const endRowIdx   = Math.ceil((wallHeight / 2) / rowStepHeight);

    for (let rowNum = startRowIdx; rowNum <= endRowIdx; rowNum++) {
        const y = h / 2 + rowNum * rowStepHeight;
        if (y < top || y > bottom) continue;

        const tileSeed = hash2(hit.mx, hit.my);
        const sentenceIndex = Math.abs(tileSeed + rowNum) % sentences.length;
        const currentSentence = sentences[sentenceIndex];

        // Safe loop layout bounding limits
        const finalCharIdx = ((textColumnIndex % currentSentence.length) + currentSentence.length) % currentSentence.length;
        const character = currentSentence[finalCharIdx];

        ctx.fillText(character, screenX, y);
    }
}

// -------------------- GAME STATE --------------------
let gameRunning = true;

// -------------------- MAIN LOOP --------------------
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
            if (player.reloadTimer <= 0) { player.ammo = 8; player.reload = false; } // Ammo reset to 8
        }

        if (player.flashTimer > 0) player.flashTimer--;
        if (player.damageIndicator > 0) player.damageIndicator--;

        // Movement Triggers
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
                // Balanced entity damage calculation profiles
                if (player.health > 0) {
                    player.health -= 0.012;
                    if (Math.random() < 0.05) player.damageIndicator = 3;
                }
            }
        }

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        // ---- RAYCASTING RENDER PASS ----
        const rays = 140;
        const zBuffer = new Float32Array(rays);
        const fov = 1.2;

        lastCellId = ""; // Reset frame boundary caching state keys before loop execution

        for (let i = 0; i < rays; i++) {
            const angle = player.a + (i / rays - 0.5) * fov;
            const hit = cast(angle);
            zBuffer[i] = hit.dist;
            drawWallColumn(i, hit, w, h, rays);
        }

        // Depth Sorting
        alive.sort((a, b) => {
            const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
            const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
            return db - da;
        });

        // ---- ENEMY RENDERING PASS ----
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

        // ---- GUN & MUZZLE FLASH ----
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

        // Render Gun Placeholder Outline
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

        // ---- FIX: RE-ESTABLISHED STATIC RENDERING FOR THE MINIMAP ----
        const s = 6; // Grid Scale Dimension
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
        for (const e of enemies.filter(e => e.alive)) { // Only show alive enemies on minimap
            ctx.fillText("▲", 15 + e.x * s, 15 + e.y * s);
        }

        ctx.fillStyle = "white";
        ctx.fillRect(15 + player.x * s - 1, 15 + player.y * s - 1, 3, 3);

        // ---- FIX: RE-ESTABLISHED STATIC HUD LAYOUT ----
        ctx.fillStyle = "#a02020";
        ctx.font = "14px monospace";
        ctx.textBaseline = "middle";

        ctx.textAlign = "left";
        ctx.fillText(`♥ HEALTH ${Math.max(0, Math.floor(player.health))}`, 30, h - 25);

        ctx.textAlign = "center";
        ctx.fillText(`☠ KILLS ${player.kills}`, w / 2, h - 25);

        ctx.textAlign = "right";
        ctx.fillText(`⚡ AMMO ${player.ammo}${player.reload ? " (RELOADING)" : ""}`, w - 30, h - 25);

        // Death condition check
        if (player.health <= 0) {
            gameRunning = false;
            document.exitPointerLock();
        }
    } else {
        // Game Over Screen
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#a02020";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", w / 2, h / 2 - 50);

        ctx.font = "bold 30px monospace";
        ctx.fillText(`KILLS: ${player.kills}`, w / 2, h / 2 + 10);

        ctx.font = "24px monospace";
        ctx.fillText("PRESS SPACE TO PLAY AGAIN", w / 2, h / 2 + 80);

        if (keys[" "]) { // Check for spacebar press
            window.location.reload(); // Hard reset
        }
    }

    requestAnimationFrame(loop);
}

loop();