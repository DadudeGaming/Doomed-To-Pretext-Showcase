import * as Pretext from "@chenglou/pretext";

const {
    prepare,
    layoutWithLines,
    prepareWithSegments,
    layoutNextLineRange,
    materializeLineRange
} = Pretext;

const app = document.getElementById("app");

let raf = null;

// ---------------------
// GLOBAL STOP
// ---------------------
function stopAll() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;

    app.innerHTML = "";
}

// ---------------------
// FLOW DEMO
// ---------------------
function flow() {
    stopAll();

    const text = `
Pretext Flow Demo
Move mouse to change width
`;

    const prepared = prepare(text, "18px system-ui");

    let mouseX = 400;
    window.onmousemove = e => mouseX = e.clientX;

    function loop() {
        const width = Math.max(200, mouseX);

        const { lines } = layoutWithLines(prepared, width, 24);

        app.innerHTML = lines.map(l => l.text).join("<br>");

        raf = requestAnimationFrame(loop);
    }

    loop();
}

// ---------------------
// GRAVITY DEMO
// ---------------------
function gravity() {
    stopAll();

    const text = `
Gravity text demo.
Layout reacts to cursor.
`;

    const prepared = prepareWithSegments(text, "18px monospace");

    let mouse = 400;
    window.onmousemove = e => mouse = e.clientX;

    function loop() {
        let cursor = { segmentIndex: 0, graphemeIndex: 0 };
        let out = "";

        while (true) {
            const width = Math.max(200, 600 - Math.abs(mouse - 400));

            const range = layoutNextLineRange(prepared, cursor, width);
            if (!range) break;

            out += materializeLineRange(prepared, range).text + "\n";
            cursor = range.end;
        }

        app.textContent = out;

        raf = requestAnimationFrame(loop);
    }

    loop();
}

// ---------------------
// EDITOR DEMO
// ---------------------
function editor() {
    stopAll();

    app.innerHTML = `
<textarea id="t" style="width:100%;height:120px;">Type here...</textarea>
<input id="w" type="range" min="200" max="800" value="400"/>
<pre id="out"></pre>
`;

    const t = document.getElementById("t");
    const w = document.getElementById("w");
    const out = document.getElementById("out");

    function update() {
        const prepared = prepareWithSegments(t.value, "16px monospace");

        const { lines } = layoutWithLines(prepared, Number(w.value), 20);

        out.textContent = lines.map(l => l.text).join("\n");
    }

    t.oninput = update;
    w.oninput = update;

    update();
}

// ---------------------
// WALL DEMO
// ---------------------
function wall() {
    stopAll();

    function loop() {
        let out = "";

        for (let y = 0; y < 30; y++) {
            let line = "";

            for (let x = 0; x < 80; x++) {
                line += Math.sin((x + Date.now() * 0.003)) > 0 ? "█" : "░";
            }

            out += line + "\n";
        }

        app.textContent = out;

        raf = requestAnimationFrame(loop);
    }

    loop();
}

// ---------------------
// MINI DOOM (SAFE)
// ---------------------
function doom() {
    stopAll();

    const map = [
        "1111111111",
        "1000000001",
        "1011100001",
        "1000100001",
        "1000000001",
        "1111111111"
    ];

    const player = { x: 2, y: 2, a: 0 };

    const keys = {};
    window.onkeydown = e => keys[e.key.toLowerCase()] = true;
    window.onkeyup = e => keys[e.key.toLowerCase()] = false;

    function wall(x, y) {
        return map[Math.floor(y)][Math.floor(x)] === "1";
    }

    function cast(angle) {
        for (let d = 0; d < 20; d += 0.05) {
            const x = player.x + Math.cos(angle) * d;
            const y = player.y + Math.sin(angle) * d;
            if (wall(x, y)) return d;
        }
        return 20;
    }

    function loop() {
        const COLS = 120;
        const ROWS = 40;

        let frame = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => " ")
        );

        if (keys["arrowleft"]) player.a -= 0.04;
        if (keys["arrowright"]) player.a += 0.04;

        let nx = player.x;
        let ny = player.y;

        if (keys["w"]) {
            nx += Math.cos(player.a) * 0.05;
            ny += Math.sin(player.a) * 0.05;
        }

        if (keys["s"]) {
            nx -= Math.cos(player.a) * 0.05;
            ny -= Math.sin(player.a) * 0.05;
        }

        if (!wall(nx, player.y)) player.x = nx;
        if (!wall(player.x, ny)) player.y = ny;

        for (let x = 0; x < COLS; x++) {
            const angle = player.a + (x / COLS - 0.5) * 1.2;
            const dist = cast(angle);

            const h = Math.floor(ROWS / (dist + 0.001));
            const shade = dist < 4 ? "█" : dist < 8 ? "▓" : "▒";

            const start = Math.floor((ROWS - h) / 2);

            for (let y = 0; y < h; y++) {
                const py = start + y;
                if (py >= 0 && py < ROWS) frame[py][x] = shade;
            }
        }

        app.textContent = frame.map(r => r.join("")).join("\n");

        raf = requestAnimationFrame(loop);
    }

    loop();
}

// ---------------------
// ROUTER
// ---------------------
function switchDemo(name) {
    stopAll();

    if (name === "flow") flow();
    if (name === "gravity") gravity();
    if (name === "editor") editor();
    if (name === "wall") wall();
    if (name === "doom") doom();
}

// ---------------------
// INIT
// ---------------------
window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
            switchDemo(btn.dataset.demo);
        });
    });

    flow();
});