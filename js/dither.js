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

const bayer2x2 = [
  [0, 2],
  [3, 1]
];

const bayer3x3 = [
  [6, 8, 4],
  [1, 0, 3],
  [5, 2, 7]
];

const bayer4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

const bayer8x8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 14, 46, 62, 30, 15, 47],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

function orderedDither(imageData, matrix) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const size = matrix.length;
    const maxVal = size * size;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            // Normalize pixel value and matrix threshold
            const pixelVal = gray / 255;
            const threshold = matrix[y % size][x % size] / maxVal;

            const v = pixelVal > threshold ? 255 : 0;

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

function stuckiDither(imageData, width, height) {
    let data = imageData.data;
    let gray = [];

    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Stucki error diffusion matrix:
    //       X    8    4
    //  2    4    8    4    2
    //  1    2    4    2    1
    // Sum of weights = 42

    const spread = [
        [1, 0, 8 / 42],  [2, 0, 4 / 42],
        [-2, 1, 2 / 42], [-1, 1, 4 / 42], [0, 1, 8 / 42], [1, 1, 4 / 42], [2, 1, 2 / 42],
        [-2, 2, 1 / 42], [-1, 2, 2 / 42], [0, 2, 4 / 42], [1, 2, 2 / 42], [2, 2, 1 / 42]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = y * width + x;
            let oldPixel = gray[idx];
            let newPixel = oldPixel > 127 ? 255 : 0;
            let err = oldPixel - newPixel;
            gray[idx] = newPixel;

            // Spread error according to Stucki kernel
            for (let [dx, dy, factor] of spread) {
                let nx = x + dx;
                let ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    gray[ny * width + nx] += err * factor;
                }
            }
        }
    }

    // Write back monochrome pixels
    for (let i = 0; i < gray.length; i++) {
        let v = gray[i] > 127 ? 255 : 0;
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    }

    return imageData;
}

function interleavedGradientNoise(imageData, width, height, frame = 0) {
    let data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;
            
            // Get original grayscale value (using perceptual weights)
            let gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            // Interleaved gradient noise with TAA frame offset
            let dot = x * 0.06711056 + y * 0.00583715 + frame * 0.00428772;
            let noise = 52.9829189 * (dot - Math.floor(dot));
            noise = (noise - Math.floor(noise));
            
            // Map noise from [0,1] to [-0.5, 0.5] for better distribution
            noise = (noise - 0.5) * 255;
            
            // Apply threshold with noise
            let newPixel = gray + noise > 127.5 ? 255 : 0;
            
            data[idx] = data[idx + 1] = data[idx + 2] = newPixel;
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
    if (type === "bayer2x2") return orderedDither(imageData, bayer2x2);
    if (type === "bayer3x3") return orderedDither(imageData, bayer3x3);
    if (type === "bayer4x4") return orderedDither(imageData, bayer4x4);
    if (type === "bayer8x8") return orderedDither(imageData, bayer8x8);
    if (type === "atkinson") return atkinsonDither(imageData, width, height);
    if (type === "random") return randomDither(imageData, width, height);
    if (type === "line") return lineDither(imageData, width, height);
    if (type === "sierraLite") return sierraLiteDither(imageData, width, height);
    if (type === "jarvisJudiceNinke") return jarvisJudiceNinkeDither(imageData, width, height);
    if (type === "huePattern") return huePatternDither(imageData);
    if (type === "stucki") return stuckiDither(imageData, width, height);
    if (type === "interleavedGradientNoise") return interleavedGradientNoise(imageData, width, height);
    if (type === "none") return noDither(imageData);
    return floydSteinbergDither(imageData, width, height);
}

export {applyDithering};