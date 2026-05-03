const PREVIEW_CROP_RATIO = 0.4;
const PREVIEW_ZOOM = 1.25;

const clamp = (v: number) => Math.min(255, Math.max(0, v));

const softBW = (gray: number, threshold: number, softness = 18): number => {
  if (gray > threshold + softness) return 255;
  if (gray < threshold - softness) return 0;
  return Math.round(((gray - (threshold - softness)) / (2 * softness)) * 255);
};

const otsuThreshold = (hist: Uint32Array, total: number): number => {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > max) {
      max = between;
      threshold = i;
    }
  }
  return threshold;
};

const cleanupSpeckles = (data: Uint8ClampedArray, w: number, h: number): void => {
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      let black = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ni = ((y + dy) * w + (x + dx)) * 4;
          if (copy[ni] === 0) black++;
        }
      }
      if (black <= 1) {
        data[i] = data[i + 1] = data[i + 2] = 255;
      }
    }
  }
};

const extractCenterPreview = (source: HTMLCanvasElement): string => {
  const sw = source.width;
  const sh = source.height;
  const targetAspect = 1.6;

  let cw, ch;
  if (sw / sh > targetAspect) {
    ch = sh * PREVIEW_CROP_RATIO;
    cw = ch * targetAspect;
  } else {
    cw = sw * PREVIEW_CROP_RATIO;
    ch = cw / targetAspect;
  }

  const sx = (sw - cw) / 2;
  const sy = (sh - ch) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = cw * PREVIEW_ZOOM;
  canvas.height = ch * PREVIEW_ZOOM;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
};

export const processPage = async (
  pdf: unknown,
  pageNum: number,
  dpi: number,
  bias: number,
  preview = false
): Promise<string> => {
  const page = await (pdf as any).getPage(pageNum);
  const scale = dpi / 96;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const hist = new Uint32Array(256);
  const grayValues = new Uint8Array(data.length / 4);
  let min = 255;
  let max = 0;

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const gray = g | 0;
    grayValues[j] = gray;
    hist[gray]++;
    if (g < min) min = g;
    if (g > max) max = g;
  }

  const threshold = otsuThreshold(hist, canvas.width * canvas.height) + bias;
  const contrastScale = 255 / Math.max(1, max - min);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g = clamp((grayValues[j] - min) * contrastScale);
    const bw = softBW(g, threshold);
    data[i] = data[i + 1] = data[i + 2] = bw;
  }

  cleanupSpeckles(data, canvas.width, canvas.height);
  ctx.putImageData(imageData, 0, 0);

  const result = preview ? extractCenterPreview(canvas) : canvas.toDataURL('image/png');

  canvas.width = 0;
  canvas.height = 0;

  return result;
};