import {thresholdDither, floydSteinbergDither, bayerDither, atkinsonDither, randomDither, lineDither} from './dither.js';

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

        port = await navigator.serial.requestPort();
        await port.open({ baudRate: baudRate });
        writer = port.writable.getWriter();
        log.textContent += "Serial connected\n";
    } catch (e) {
        log.textContent += "Serial error: " + e + "\n";
    }
};

// On page load, restore saved baud rate:
window.addEventListener('load', () => {
    const savedBaudRate = localStorage.getItem('lastBaudRate');
    if (savedBaudRate) {
        document.getElementById('BaudRate').value = savedBaudRate;
    }
});

function applyDithering(imageData, type) {
    let width = imageData.width;
    let height = imageData.height;
    if (type === "threshold") return thresholdDither(imageData);
    if (type === "floyd") return floydSteinbergDither(imageData, width, height);
    if (type === "bayer") return bayerDither(imageData, width, height);
    if (type === "atkinson") return atkinsonDither(imageData, width, height);
    if (type === "random") return randomDither(imageData, width, height);
    if (type === "line") return lineDither(imageData, width, height);
    return thresholdDither(imageData);
}

document.getElementById('start').onclick = async () => {
    if (!video.src) return alert("Select a video first!");

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

    let ditherType = document.getElementById('ditherType').value;
    let width = parseInt(document.getElementById('screenWidth').value, 10);
    let height = parseInt(document.getElementById('screenHeight').value, 10);

    canvas.width = width;
    canvas.height = height;
    previewCanvas.width = width;
    previewCanvas.height = height;

    video.currentTime = 0;
    video.play();

    const sendFrame = async () => {
        const thisSession = streamSession;
        if (thisSession !== streamSession) return;

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

        let bytes = frameToSSD1309Bytes(imageData, width, height);
        if (writer) {
            await writer.write(HEADER);
            await writer.write(bytes);
            log.textContent = `${HEADER}\n${bytes}`;
        } else {
            log.textContent = `Preview only mode\n`;
        }

        if (!video.paused && !video.ended && thisSession === streamSession) {
            currentStreamId = setTimeout(sendFrame, 1000 / parseInt(document.getElementById('framesPerSecond').value, 10));
        }
    };

    sendFrame();
};

window.addEventListener('beforeunload', (e) => {
    try {
        streamSession++;
        if (currentStreamId !== null) {
            clearTimeout(currentStreamId);
            currentStreamId = null;
        }
        video.pause();

        // Fire async but don't await (may or may not complete before unload)
        if (writer) {
            writer.releaseLock();  // don't await, just call
        }
        if (port && port.readable && port.writable) {
            port.close(); // again no await
            log.textContent += "Serial closed on refresh\n";
        }
    } catch (err) {
        console.warn("Cleanup error:", err);
    }
});


// Update frameToSSD1309Bytes to accept width and height
function frameToSSD1309Bytes(imageData, width, height) {
    let packed = [];
    for (let page = 0; page < height / 8; page++) {
        for (let x = 0; x < width; x++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                let y = page * 8 + bit;
                let idx = (y * width + x) * 4;
                let pixel = imageData.data[idx];
                byte |= ((pixel > 127 ? 1 : 0) << bit);
            }
            packed.push(byte);
        }
    }
    return new Uint8Array(packed);
}