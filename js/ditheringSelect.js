import {applyDithering} from './dither.js';

const select = document.getElementById('ditherType');
const container = select.parentElement; // .custom-select div
const trigger = container.querySelector('.custom-select-trigger');
const optionsContainer = container.querySelector('.custom-options');
const selectedLabel = trigger.querySelector('.selected-label');
const selectedCanvas = trigger.querySelector('canvas.preview-canvas');
let animating = false;
let rotation = 0;
let animationFrameId = null;

function drawDitherPreview(canvas, ditherType, rotation = 0) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Create base gradient background (horizontal gradient)
  let imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = Math.round((x / (width - 1)) * 255);
      let idx = (y * width + x) * 4;
      imageData.data[idx] = v;
      imageData.data[idx + 1] = v;
      imageData.data[idx + 2] = v;
      imageData.data[idx + 3] = 255;
    }
  }

  // Circle parameters
  const circleRadius = height * 0.25;
  const cx = width / 2;
  const cy = height / 2;
  const rSq = circleRadius * circleRadius;

  const cosA = Math.cos(rotation);
  const sinA = Math.sin(rotation);

  // Inside the circle: rotated inverted gradient
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rSq) {
        // Rotate the point by -rotation
        const rx = dx * cosA - dy * sinA;

        // Map rotated x from [-circleRadius, circleRadius] to [0, 255]
        let v = 255 - Math.round(((rx + circleRadius) / (circleRadius * 2)) * 255);

        let idx = (y * width + x) * 4;
        imageData.data[idx] = 255;
        imageData.data[idx + 1] = v;
        imageData.data[idx + 2] = 255-v;
        imageData.data[idx + 3] = 255;
      }
    }
  }

  // Apply dithering AFTER the full image is ready
  let dithered = applyDithering(imageData, ditherType);

  ctx.putImageData(dithered, 0, 0);
}

function buildOptions() {
  optionsContainer.innerHTML = '';
  for (let option of select.options) {
    let optDiv = document.createElement('div');
    optDiv.classList.add('custom-option');
    optDiv.dataset.value = option.value;

    let canvas = document.createElement('canvas');
    canvas.width = 42;
    canvas.height = 36;
    canvas.classList.add('preview-canvas');

    // Draw real dithered preview on each canvas
    drawDitherPreview(canvas, option.value);

    let span = document.createElement('span');
    span.textContent = option.text;

    optDiv.appendChild(canvas);
    optDiv.appendChild(span);
    optionsContainer.appendChild(optDiv);
  }
}

function updateSelected() {
  selectedLabel.textContent = select.options[select.selectedIndex].text;
  drawDitherPreview(selectedCanvas, select.value);
}

optionsContainer.addEventListener('click', e => {
  const opt = e.target.closest('.custom-option');
  if (!opt) return;

  select.value = opt.dataset.value;
  updateSelected();
  optionsContainer.style.display = 'none';

  if (typeof showDitherPreview === 'function') showDitherPreview();
});

let lastRedrawTime = 0;
function animateOptionPreviews(timestamp) {
  if (!animating) return;
  if (!lastRedrawTime) lastRedrawTime = timestamp;
  const elapsed = timestamp - lastRedrawTime;

  if (elapsed > 300) {
    rotation += 0.1;
    if (rotation > Math.PI * 2) rotation -= Math.PI * 2;

    const canvases = optionsContainer.querySelectorAll('canvas.preview-canvas');
    canvases.forEach(canvas => {
      const ditherType = canvas.parentElement.dataset.value;
      drawDitherPreview(canvas, ditherType, rotation);
    });

    lastRedrawTime = timestamp;
  }
  animationFrameId = requestAnimationFrame(animateOptionPreviews);
}

trigger.addEventListener('click', () => {
  if (optionsContainer.style.display === 'block') {
    optionsContainer.style.display = 'none';
    // stop animation
    animating = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  } else {
    optionsContainer.style.display = 'block';
    // start animation
    if (!animating) {
      animating = true;
      lastRedrawTime = 0;
      animateOptionPreviews();
    }
  }
});

// Initialize
buildOptions();
updateSelected();
