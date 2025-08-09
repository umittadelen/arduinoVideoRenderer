import {applyDithering} from './dither.js';

const select = document.getElementById('ditherType');
const container = select.parentElement; // .custom-select div
const trigger = container.querySelector('.custom-select-trigger');
const optionsContainer = container.querySelector('.custom-options');
const selectedLabel = trigger.querySelector('.selected-label');
const selectedCanvas = trigger.querySelector('canvas.preview-canvas');

function drawDitherPreview(canvas, ditherType) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Create full image data (initially gradient)
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
  const circleRadius = height * 0.25; // 50% diameter of height
  const cx = width / 2;
  const cy = height / 2;
  const rSq = circleRadius * circleRadius;

  // Modify the circle area
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rSq) {
        // Inverted gradient
        let v = 255 - Math.round((x / (width - 1)) * 255);
        let idx = (y * width + x) * 4;
        imageData.data[idx] = v;
        imageData.data[idx + 1] = v;
        imageData.data[idx + 2] = v;
        imageData.data[idx + 3] = 255;
      }
    }
  }

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

trigger.addEventListener('click', () => {
  optionsContainer.style.display = optionsContainer.style.display === 'block' ? 'none' : 'block';
});

optionsContainer.addEventListener('click', e => {
  const opt = e.target.closest('.custom-option');
  if (!opt) return;

  select.value = opt.dataset.value;
  updateSelected();
  optionsContainer.style.display = 'none';

  if (typeof showDitherPreview === 'function') showDitherPreview();
});

window.addEventListener('click', e => {
  if (!container.contains(e.target)) {
    optionsContainer.style.display = 'none';
  }
});

// Initialize
buildOptions();
updateSelected();
