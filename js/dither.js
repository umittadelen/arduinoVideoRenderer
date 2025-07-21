// Dithering algorithms
function thresholdDither(imageData) {
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        let v = (gray > 127 ? 255 : 0);
        data[i] = data[i + 1] = data[i + 2] = v;
    }
    return imageData;
}

function floydSteinbergDither(imageData, width, height) {
    // Convert to grayscale float array
    let data = imageData.data;
    let gray = [];
    for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = y * width + x;
            let oldPixel = gray[idx];
            let newPixel = oldPixel > 127 ? 255 : 0;
            let err = oldPixel - newPixel;
            gray[idx] = newPixel;
            if (x + 1 < width) gray[idx + 1] += err * 7 / 16;
            if (y + 1 < height) {
                if (x > 0) gray[idx + width - 1] += err * 3 / 16;
                gray[idx + width] += err * 5 / 16;
                if (x + 1 < width) gray[idx + width + 1] += err * 1 / 16;
            }
        }
    }
    for (let i = 0; i < gray.length; i++) {
        let v = gray[i] > 127 ? 255 : 0;
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    }
    return imageData;
}

function bayerDither(imageData, width, height) {
    // 4x4 Bayer matrix
    const bayer = [
        [15, 135, 45, 165],
        [195, 75, 225, 105],
        [60, 180, 30, 150],
        [240, 120, 210, 90]
    ];
    let data = imageData.data;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            let gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            let threshold = bayer[y % 4][x % 4];
            let v = (gray > threshold ? 255 : 0);
            data[idx] = data[idx + 1] = data[idx + 2] = v;
        }
    }
    return imageData;
}

function atkinsonDither(imageData, width, height) {
    let data = imageData.data;
    let gray = [];
    for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = y * width + x;
            let oldPixel = gray[idx];
            let newPixel = oldPixel > 127 ? 255 : 0;
            let err = (oldPixel - newPixel) / 8;
            gray[idx] = newPixel;
            if (x + 1 < width) gray[idx + 1] += err;
            if (x + 2 < width) gray[idx + 2] += err;
            if (y + 1 < height) {
                if (x > 0) gray[idx + width - 1] += err;
                gray[idx + width] += err;
                if (x + 1 < width) gray[idx + width + 1] += err;
            }
            if (y + 2 < height) gray[idx + width * 2] += err;
        }
    }
    for (let i = 0; i < gray.length; i++) {
        let v = gray[i] > 127 ? 255 : 0;
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    }
    return imageData;
}

function randomDither(imageData, width, height) {
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        let noise = Math.random() * 255;
        let v = (gray > noise ? 255 : 0);
        data[i] = data[i + 1] = data[i + 2] = v;
    }
    return imageData;
}

function lineDither(imageData, direction = "vertical") {
    let data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            let pattern = (direction === "vertical") ? (x % 2 === 0) : (y % 2 === 0);
            let threshold = pattern ? 100 : 160;
            let v = gray > threshold ? 255 : 0;

            data[idx] = data[idx + 1] = data[idx + 2] = v;
        }
    }
    return imageData;
}

function applyDithering(imageData, type) {
    let width = imageData.width;
    let height = imageData.height;
    if (type === "threshold") return thresholdDither(imageData);
    if (type === "floyd") return floydSteinbergDither(imageData, width, height);
    if (type === "bayer") return bayerDither(imageData, width, height);
    if (type === "atkinson") return atkinsonDither(imageData, width, height);
    if (type === "random") return randomDither(imageData, width, height);
    if (type === "line") return lineDither(imageData, width, height);
    return floydSteinbergDither(imageData);
}

export {applyDithering};