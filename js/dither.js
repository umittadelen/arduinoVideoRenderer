// Dithering algorithms
function thresholdDither(imageData, percentage = 50) {
    let data = imageData.data;
    let threshold = Math.round((percentage / 100) * 255);
    for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        let v = (gray > threshold ? 255 : 0);
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

function sierraLiteDither(imageData, width, height) {
    let data = imageData.data;
    let gray = [];

    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Sierra Lite kernel
    // Current pixel gets thresholded, error is spread:
    //    X   2
    // 1  1
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = y * width + x;
            let oldPixel = gray[idx];
            let newPixel = oldPixel > 127 ? 255 : 0;
            let err = (oldPixel - newPixel) / 4;
            gray[idx] = newPixel;

            if (x + 1 < width) gray[idx + 1] += err * 2;     // right
            if (y + 1 < height) {
                if (x > 0) gray[idx + width - 1] += err;      // bottom-left
                gray[idx + width] += err;                     // bottom
            }
        }
    }

    // Apply to image data
    for (let i = 0; i < gray.length; i++) {
        let v = gray[i] > 127 ? 255 : 0;
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    }

    return imageData;
}

function jarvisJudiceNinkeDither(imageData, width, height) {
    let data = imageData.data;
    let gray = [];

    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // JJN error diffusion matrix:
    // Row 0:     X   7   5
    // Row 1:  3   5   7   5   3
    // Row 2:  1   3   5   3   1
    const spread = [
        [1, 0, 7 / 48],  [2, 0, 5 / 48],
        [-2, 1, 3 / 48], [-1, 1, 5 / 48], [0, 1, 7 / 48], [1, 1, 5 / 48], [2, 1, 3 / 48],
        [-2, 2, 1 / 48], [-1, 2, 3 / 48], [0, 2, 5 / 48], [1, 2, 3 / 48], [2, 2, 1 / 48]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = y * width + x;
            let oldPixel = gray[idx];
            let newPixel = oldPixel > 127 ? 255 : 0;
            let err = oldPixel - newPixel;
            gray[idx] = newPixel;

            // Spread the error
            for (let [dx, dy, factor] of spread) {
                let nx = x + dx;
                let ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    gray[ny * width + nx] += err * factor;
                }
            }
        }
    }

    // Apply to image data
    for (let i = 0; i < gray.length; i++) {
        let v = gray[i] > 127 ? 255 : 0;
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    }

    return imageData;
}

function huePatternDither(imageData) {
    let data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            let r = data[idx], g = data[idx + 1], b = data[idx + 2];

            // Convert RGB to HSL to get hue
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0;
            if (max !== min) {
                if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
                else if (max === g) h = (60 * ((b - r) / (max - min)) + 120) % 360;
                else h = (60 * ((r - g) / (max - min)) + 240) % 360;
            }

            let luma = 0.299 * r + 0.587 * g + 0.114 * b;

            // Choose a pattern based on hue segment
            let patternIndex = Math.floor(h / 60) % 6;
            let patternPixel = false;
            switch (patternIndex) {
                case 0: patternPixel = ((x + y) % 2 === 0); break; // Red-ish
                case 1: patternPixel = (x % 2 === 0); break;        // Yellow-ish
                case 2: patternPixel = (y % 2 === 0); break;        // Green-ish
                case 3: patternPixel = ((x + y) % 3 === 0); break;  // Cyan-ish
                case 4: patternPixel = ((x % 3) === 0); break;      // Blue-ish
                case 5: patternPixel = ((y % 3) === 0); break;      // Magenta-ish
            }

            let threshold = patternPixel ? 100 : 160;
            let v = luma > threshold ? 255 : 0;

            data[idx] = data[idx + 1] = data[idx + 2] = v;
        }
    }
    return imageData;
}

function noDither(imageData) {
    return imageData;
}

function applyDithering(imageData, type, options = {}) {
    let width = imageData.width;
    let height = imageData.height;
    if (type === "threshold10") return thresholdDither(imageData, 10);
    if (type === "threshold25") return thresholdDither(imageData, 25);
    if (type === "threshold33") return thresholdDither(imageData, 33);
    if (type === "threshold50") return thresholdDither(imageData, 50);
    if (type === "threshold75") return thresholdDither(imageData, 75);
    if (type === "floyd") return floydSteinbergDither(imageData, width, height);
    if (type === "bayer") return bayerDither(imageData, width, height);
    if (type === "atkinson") return atkinsonDither(imageData, width, height);
    if (type === "random") return randomDither(imageData, width, height);
    if (type === "line") return lineDither(imageData, width, height);
    if (type === "sierraLite") return sierraLiteDither(imageData, width, height);
    if (type === "jarvisJudiceNinke") return jarvisJudiceNinkeDither(imageData, width, height);
    if (type === "huePattern") return huePatternDither(imageData);
    if (type === "none") return noDither(imageData);
    return floydSteinbergDither(imageData);
}

export {applyDithering};