// ===== CONFIG =====
const width = 120;
const height = 40;

// ===== MAP =====
const map = [
    "1111111111111111",
    "1000000000000001",
    "1011110111111101",
    "1000000000000001",
    "1000111111000001",
    "1000000000000001",
    "1111111111111111"
];

// ===== PLAYER =====
const player = {
    x: 2.5,
    y: 2.5,
    angle: 0
};

// ===== INPUT =====
const keys = {};

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// ===== MOVEMENT =====
function updatePlayer() {
    const moveSpeed = 0.05;
    const rotSpeed = 0.03;

    if (keys["ArrowLeft"]) player.angle -= rotSpeed;
    if (keys["ArrowRight"]) player.angle += rotSpeed;

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

    if (map[Math.floor(ny)][Math.floor(nx)] !== "1") {
        player.x = nx;
        player.y = ny;
    }
}

// ===== RAYCASTING =====
function castRay(angle) {
    for (let d = 0; d < 20; d += 0.05) {
        const x = player.x + Math.cos(angle) * d;
        const y = player.y + Math.sin(angle) * d;

        if (map[Math.floor(y)][Math.floor(x)] === "1") {
            return d;
        }
    }
    return 20;
}

// ===== FRAME RENDER =====
function renderFrame() {
    const frame = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => ({
            char: " ",
            color: "#000"
        }))
    );

    for (let x = 0; x < width; x++) {
        const rayAngle = player.angle + (x / width - 0.5) * 1.2;
        const dist = castRay(rayAngle);

        const wallHeight = Math.floor(height / (dist + 0.0001));

        const shade =
            dist < 3 ? "█" :
                dist < 6 ? "▓" :
                    dist < 10 ? "▒" : "░";

        const color =
            dist < 3 ? "#ff4444" :
                dist < 6 ? "#aa3333" :
                    "#552222";

        const start = Math.floor((height - wallHeight) / 2);

        for (let y = 0; y < wallHeight; y++) {
            const py = start + y;
            if (py >= 0 && py < height) {
                frame[py][x] = { char: shade, color };
            }
        }
    }

    return frame;
}

// ===== RENDER TO DOM =====
function draw(frame) {
    const app = document.getElementById("app");

    let output = "";

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = frame[y][x];

            output += `<span style="color:${cell.color}">${cell.char}</span>`;
        }
        output += "\n";
    }

    app.innerHTML = output;
}

// ===== GAME LOOP =====
function loop() {
    updatePlayer();
    const frame = renderFrame();
    draw(frame);

    requestAnimationFrame(loop);
}

loop();