// =====================
// CONFIG
// =====================
const COLS = 120;
const ROWS = 40;

// =====================
// MAP
// =====================
const map = [
    "1111111111111111",
    "1000000000000001",
    "1011110111111101",
    "1000000000000001",
    "1000110000010001",
    "1000000000000001",
    "1111111111111111"
];

// =====================
// PLAYER
// =====================
const player = {
    x: 2.5,
    y: 2.5,
    angle: 0
};

// =====================
// INPUT
// =====================
const keys = {};

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// =====================
// COLLISION
// =====================
function isWall(x, y) {
    return map[Math.floor(y)][Math.floor(x)] === "1";
}

// =====================
// MOVEMENT
// =====================
function update() {
    const moveSpeed = 0.05;
    const rotSpeed = 0.04;

    if (keys["arrowleft"]) player.angle -= rotSpeed;
    if (keys["arrowright"]) player.angle += rotSpeed;

    let nx = player.x;
    let ny = player.y;

    if (keys["w"]) {
        nx += Math.cos(player.angle) * moveSpeed;
        ny += Math.sin(player.angle) * moveSpeed;
    }

    if (keys["s"]) {
        nx -= Math.cos(player.angle) * moveSpeed;
        ny -= Math.sin(player.angle) * moveSpeed;
    }

    if (!isWall(nx, player.y)) player.x = nx;
    if (!isWall(player.x, ny)) player.y = ny;
}

// =====================
// RAYCAST
// =====================
function castRay(angle) {
    for (let d = 0; d < 20; d += 0.05) {
        const x = player.x + Math.cos(angle) * d;
        const y = player.y + Math.sin(angle) * d;

        if (isWall(x, y)) return d;
    }
    return 20;
}

// =====================
// FRAME
// =====================
function render() {
    const frame = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({
            char: " ",
            color: "#000"
        }))
    );

    for (let x = 0; x < COLS; x++) {
        const rayAngle = player.angle + (x / COLS - 0.5) * 1.2;
        const dist = castRay(rayAngle);

        const wallHeight = Math.floor(ROWS / (dist + 0.001));

        const shade =
            dist < 3 ? "█" :
                dist < 6 ? "▓" :
                    dist < 10 ? "▒" : "░";

        const color =
            dist < 3 ? "#ff4444" :
                dist < 6 ? "#aa3333" :
                    "#552222";

        const start = Math.floor((ROWS - wallHeight) / 2);

        for (let y = 0; y < wallHeight; y++) {
            const py = start + y;
            if (py >= 0 && py < ROWS) {
                frame[py][x] = { char: shade, color };
            }
        }
    }

    return frame;
}

// =====================
// DRAW
// =====================
function draw(frame) {
    const app = document.getElementById("app");

    let out = "";

    for (let y = 0; y < ROWS; y++) {
        let line = "";

        for (let x = 0; x < COLS; x++) {
            const cell = frame[y][x];
            line += `<span style="color:${cell.color}">${cell.char}</span>`;
        }

        out += line + "\n";
    }

    app.innerHTML = out;
}

// =====================
// LOOP
// =====================
function loop() {
    update();
    const frame = render();
    draw(frame);
    requestAnimationFrame(loop);
}

loop();