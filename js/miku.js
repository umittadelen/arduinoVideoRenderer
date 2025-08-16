const canvas = document.getElementById("mikuCanvas");
const ctx = canvas.getContext("2d");
const basePath = "./resources/miku/output/";

// Animations
const animations = {
    enter: { frames: ["enter_0.png", "enter_1.png", "enter_2.png", "enter_3.png", "enter_4.png", "enter_5.png", "enter_6.png", "enter_7.png"], duration: [40, 8, 8, 8, 8, 8, 8, 40] },
    blink: { frames: ["blink_0.png", "blink_1.png", "blink_2.png", "blink_3.png", "blink_4.png"], duration: [20, 8, 16, 8, 20] },
    idle: { frames: ["miku_idle.png"], duration: [0] },
    leave: { frames: ["leave_0.png", "leave_1.png", "leave_2.png", "leave_3.png", "leave_4.png", "leave_5.png", "leave_6.png"], duration: [8, 80, 8, 8, 8, 8, 8] },
    out: { frames: ["miku_out.png"], duration: [0] }
};

// Preload frames
const images = {};
let total = Object.values(animations).reduce((a, v) => a + v.frames.length, 0);
let loaded = 0;

for (const key in animations) {
    images[key] = animations[key].frames.map(src => {
        const img = new Image();
        img.src = basePath + src;
        img.onload = () => (++loaded === total && scheduleMiku());
        return img;
    });
}

function drawFrame(anim, i) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[anim][i], 0, 0, canvas.width, canvas.height);
}

function playAnimation(anim, done) {
    const a = animations[anim];
    let i = 0;
    (function next() {
        drawFrame(anim, i);
        if (++i < a.frames.length) setTimeout(next, a.duration[i - 1] * 10);
        else done && done();
    })();
}

// Random timing config
const minBlink = 2000, maxBlink = 6000;
const minRe = 10000, maxRe = 50000;
const idleChance = 0.8, dblBlinkChance = 0.25;
const dblMinGap = 200, dblMaxGap = 600;

function idleLoop() {
    setTimeout(() => {
        doBlink(() => Math.random() < idleChance ? idleLoop() : leaveMiku());
    }, Math.random() * (maxBlink - minBlink) + minBlink);
}

function doBlink(cb) {
    playAnimation("blink", () => {
        if (Math.random() < dblBlinkChance) {
            const gap = Math.random() * (dblMaxGap - dblMinGap) + dblMinGap;
            setTimeout(() => playAnimation("blink", cb), gap);
        } else cb();
    });
}

function showMiku() {
    playAnimation("enter", () => {
        drawFrame("idle", 0);
        idleLoop();
    });
}

function leaveMiku() {
    playAnimation("leave", () => {
        drawFrame("out", 0);
        scheduleMiku();
    });
}

function scheduleMiku() {
    setTimeout(() => {
        placeMiku();
        showMiku();
    }, Math.random() * (maxRe - minRe) + minRe);
}

function placeMiku() {
    const side = Math.random() < 0.5 ? "left" : "right"; // pick side

    // figure out how tall she is in pixels
    const mikuHeight = canvas.offsetHeight;
    const windowHeight = window.innerHeight;

    // safe range for top position (so she never goes off screen)
    const minTop = mikuHeight / 2;
    const maxTop = windowHeight - mikuHeight / 2;

    // pick a random Y within safe range
    const y = Math.random() * (maxTop - minTop) + minTop;

    // Reset positioning
    canvas.style.left = "";
    canvas.style.right = "";
    canvas.style.top = "";
    canvas.style.bottom = "";

    // Apply side + flipping
    if (side === "left") {
        canvas.style.left = "0";
        canvas.style.transform = "translateY(-50%) scaleX(-1)";
    } else {
        canvas.style.right = "0";
        canvas.style.transform = "translateY(-50%) scaleX(1)";
    }

    // Apply vertical placement in px (instead of %)
    canvas.style.top = y + "px";
}

// Start out of screen
drawFrame("out", 0);

// Responsive resize
function resizeCanvas() {
    const scale = Math.min(window.innerWidth, window.innerHeight) * 0.2;
    canvas.style.width = scale + "px";
    canvas.style.height = scale * (105 / 112) + "px";
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();