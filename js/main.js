import {applyDithering} from './dither.js';

//TODO --------------------|       Constants & Globals      |--------------------

const HEADER = new Uint8Array([0xAA, 0x55, 0xAA, 0x55]);
let port, writer;
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let previewCanvas = document.getElementById('preview-canvas');
let previewctx = previewCanvas.getContext('2d');
let log = document.getElementById('log');
let currentStreamId = null;
let streamSession = 0;

//TODO --------------------| Video & Serial Input Handlers  |--------------------

document.getElementById('videoInput').onchange = e => {

    let file = e.target.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
        video.load();
    }
};

document.getElementById('connectSerial').onclick = async () => {
    try {
        const baudRate = parseInt(document.getElementById('BaudRate').value, 10);
        // Save baud rate to localStorage
        localStorage.setItem('lastBaudRate', baudRate);
        localStorage.setItem('lastWidth', document.getElementById('screenWidth').value);
        localStorage.setItem('lastHeight', document.getElementById('screenHeight').value);
        localStorage.setItem('lastDither', document.getElementById('ditherType').value);
        localStorage.setItem('lastFps', document.getElementById('framesPerSecond').value);

        port = await navigator.serial.requestPort();
        await port.open({ baudRate: baudRate });
        writer = port.writable.getWriter();
        log.textContent += "Serial connected\n";
    } catch (e) {
        log.textContent += "Serial error: " + e + "\n";
    }
};

document.getElementById('screenCapture').onclick = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 }
        });
        video.srcObject = stream;
        video.play();
        log.textContent += "Live screen capture started\n";
    } catch (err) {
        log.textContent += "Screen capture failed: " + err + "\n";
    }
};

//TODO --------------------|    Playback Control Buttons    |--------------------

document.getElementById('stop').onclick = () => {
    streamSession++; // stop any ongoing stream send loop
    if (currentStreamId !== null) {
        clearTimeout(currentStreamId);
        currentStreamId = null;
    }
    video.pause();
    log.textContent += "Stream stopped.\n";
};

document.getElementById('restart').onclick = async () => {
    // Stop current streaming cleanly
    streamSession++; 
    if (currentStreamId !== null) {
        clearTimeout(currentStreamId);
        currentStreamId = null;
    }
    video.pause();

    // Wait a tiny bit to ensure waitForAck() calls resolve & readers released
    await new Promise(r => setTimeout(r, 100));

    document.getElementById('start').click();
    log.textContent += "Stream restarted.\n";
};

//TODO --------------------|       Loop Toggle Handler      |--------------------

const checkboxContainer = document.querySelector('.checkbox-container');
const textSwitch = document.getElementById('textSwitch');
const onSpan = textSwitch.querySelector('.switch-option.on');
const offSpan = textSwitch.querySelector('.switch-option.off');

let isLooping = false;

function updateSwitchUI() {
  if (isLooping) {
    onSpan.classList.add('active');
    offSpan.classList.remove('active');
  } else {
    offSpan.classList.add('active');
    onSpan.classList.remove('active');
  }
  
  video.loop = isLooping;
  log.textContent = `Looping ${isLooping ? 'enabled' : 'disabled'}.\n`;
}

// Attach click to entire container, toggle state on click
checkboxContainer.onclick = () => {
  isLooping = !isLooping;
  updateSwitchUI();
};

// Initialize UI on load
updateSwitchUI();

//TODO --------------------| Restore Saved Settings on Load |--------------------

window.addEventListener('load', () => {
  const fields = {
    lastBaudRate: 'BaudRate',
    lastWidth: 'screenWidth',
    lastHeight: 'screenHeight',
    lastDither: 'ditherType',
    lastFps: 'framesPerSecond'
  };

  for (const [storageKey, elementId] of Object.entries(fields)) {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      document.getElementById(elementId).value = saved;
    }
  }
});

//TODO --------------------|       Serial ACK Waiter        |--------------------

async function waitForAck() {
    const reader = port.readable.getReader();
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value[0] === 0xAC) break;  // 0xAC = ACK
        }
    } finally {
        reader.releaseLock();  // release so future reads won't crash
    }
}

//TODO --------------------|  Stream Start & Frame Sending  |--------------------

document.getElementById('start').onclick = async () => {
    if (!video.src && !video.srcObject) return alert("Load a video or capture screen first!");


    if (!writer) {
        log.textContent += "No serial connected, running preview only!\n";
    }

    // Cancel old stream
    streamSession++;
    if (currentStreamId !== null) {
        clearTimeout(currentStreamId);
        currentStreamId = null;
        video.pause();
    }

    let width = parseInt(document.getElementById('screenWidth').value, 10);
    let height = parseInt(document.getElementById('screenHeight').value, 10);

    canvas.width = width;
    canvas.height = height;
    previewCanvas.width = width;
    previewCanvas.height = height;

    video.currentTime = 0;
    video.play();

    log.textContent = `Starting stream...\n`;

    let frameCount = 0;
    let lastFrameTime = performance.now();
    const sendFrame = async () => {
        const thisSession = streamSession;
        if (thisSession !== streamSession) return;

        const fps = parseInt(document.getElementById('framesPerSecond').value, 10);
        let ditherType = document.getElementById('ditherType').value;
        const frameInterval = 1000 / fps;
        const now = performance.now();
        let nextDelay = frameInterval - (now - lastFrameTime);
        if (nextDelay < 0) nextDelay = 0;

        let videoAspect = video.videoWidth / video.videoHeight;
        let targetAspect = width / height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoAspect > targetAspect) {
            drawWidth = width;
            drawHeight = Math.floor(width / videoAspect);
            offsetX = 0;
            offsetY = Math.floor((height - drawHeight) / 2);
        } else {
            drawHeight = height;
            drawWidth = Math.floor(height * videoAspect);
            offsetY = 0;
            offsetX = Math.floor((width - drawWidth) / 2);
        }

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        let imageData = ctx.getImageData(0, 0, width, height);
        imageData = applyDithering(imageData, ditherType);
        previewctx.putImageData(imageData, 0, 0);

        let bytes = frameToSSD1306Bytes(imageData, width, height);
        if (writer && port && port.readable && port.writable) {
            try {
                let out = new Uint8Array(HEADER.length + bytes.length);
                out.set(HEADER, 0);
                out.set(bytes, HEADER.length);
                await writer.write(out);
                await waitForAck(); // wait for Arduino to finish processing frame
                frameCount++;
            } catch (err) {
                log.textContent += `\nSerial disconnected or error: ${err}`;
                streamSession++;
                if (currentStreamId !== null) {
                    clearTimeout(currentStreamId);
                    currentStreamId = null;
                }
                video.pause();
                writer = null;
                port = null;
                return;
            }
        } else {
            log.textContent = `\nNo serial connected, running preview only!`;
        }

        if (!video.paused && (isLooping || !video.ended) && thisSession === streamSession) {
            currentStreamId = setTimeout(() => {
                lastFrameTime = performance.now();
                sendFrame();
            }, nextDelay);
        } else {
            if (video.ended && !isLooping) {
                log.textContent += "Video ended, stopping stream.\n";
            }
        }
    };

    sendFrame();
};

//TODO --------------------|     Cleanup on Page Unload     |--------------------

window.addEventListener('beforeunload', (e) => {
    try {
        streamSession++;
        if (currentStreamId !== null) {
            clearTimeout(currentStreamId);
            currentStreamId = null;
        }
        video.pause();

        if (writer) {
            writer.releaseLock();
        }
        if (port && port.readable && port.writable) {
            port.close();
            log.textContent += "Serial closed on refresh\n";
        }
    } catch (err) {
        console.warn("Cleanup error:", err);
    }
});

//TODO --------------------|       Frame Data Packing       |--------------------

function frameToSSD1306Bytes(imageData, width, height) {
    const pages = height >> 3;
    const packed = new Uint8Array(width * pages);
    let i = 0;
    for (let page = 0; page < pages; page++) {
        for (let x = 0; x < width; x++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                let y = (page << 3) + bit;
                let idx = (y * width + x) * 4;
                let pixel = imageData.data[idx];
                byte |= ((pixel > 127 ? 1 : 0) << bit);
            }
            packed[i++] = byte;
        }
    }
    return packed;
}