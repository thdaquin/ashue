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

// ---------------------------------------------------------------------------
// 1-bit PNG encoder
// The browser canvas API can only output 8-bit PNGs. Since our image is pure
// black and white we can encode it manually as a 1-bit PNG, which is 8x more
// compact before compression and compresses far better too.
// ---------------------------------------------------------------------------

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

const crc32 = (data: Uint8Array, start = 0, end = data.length): number => {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint32BE = (buf: Uint8Array, offset: number, value: number): void => {
  buf[offset]     = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>>  8) & 0xff;
  buf[offset + 3] =  value         & 0xff;
};

const deflateRaw = async (data: Uint8Array): Promise<Uint8Array> => {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(data as BufferSource);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
};

const encodeTo1BitPng = async (
  data: Uint8ClampedArray,
  width: number,
  height: number
): Promise<Uint8Array> => {
  // Pack RGBA pixel data into 1-bit rows (1 = white, 0 = black)
  // PNG rows are padded to a full byte boundary
  const rowBytes = Math.ceil(width / 8);

  // Each row gets a filter byte (0x00 = None) prepended
  const rawRows = new Uint8Array(height * (1 + rowBytes));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + rowBytes);
    rawRows[rowStart] = 0x00; // filter type: None
    for (let x = 0; x < width; x++) {
      const px = (y * width + x) * 4;
      const isWhite = data[px] > 127;
      if (isWhite) {
        rawRows[rowStart + 1 + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  const compressed = await deflateRaw(rawRows);

  // Build zlib wrapper around deflate stream (required by PNG)
  const zlib = new Uint8Array(compressed.length + 6);
  zlib[0] = 0x78; // CMF
  zlib[1] = 0x9c; // FLG
  zlib.set(compressed, 2);
  const adler = (() => {
    let s1 = 1, s2 = 0;
    for (const b of rawRows) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
    return (s2 << 16) | s1;
  })();
  writeUint32BE(zlib, zlib.length - 4, adler);

  // PNG chunk helper
  const chunk = (type: string, payload: Uint8Array): Uint8Array => {
    const typeBytes = new TextEncoder().encode(type);
    const buf = new Uint8Array(12 + payload.length);
    writeUint32BE(buf, 0, payload.length);
    buf.set(typeBytes, 4);
    buf.set(payload, 8);
    writeUint32BE(buf, 8 + payload.length, crc32(buf, 4, 8 + payload.length));
    return buf;
  };

  // IHDR: width, height, bit depth=1, color type=0 (grayscale), compression, filter, interlace
  const ihdr = new Uint8Array(13);
  writeUint32BE(ihdr, 0, width);
  writeUint32BE(ihdr, 4, height);
  ihdr[8] = 1;  // bit depth: 1
  ihdr[9] = 0;  // color type: grayscale
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', zlib);
  const iendChunk = chunk('IEND', new Uint8Array(0));

  const total = sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(total);
  let pos = 0;
  for (const part of [sig, ihdrChunk, idatChunk, iendChunk]) {
    png.set(part, pos);
    pos += part.length;
  }

  return png;
};

const processPageInternal = async (
  pdf: unknown,
  pageNum: number,
  dpi: number,
  bias: number,
  preview: boolean
): Promise<string | Uint8Array> => {
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

  if (preview) {
    ctx.putImageData(imageData, 0, 0);
    const result = extractCenterPreview(canvas);
    canvas.width = 0;
    canvas.height = 0;
    return result;
  }

  // Full conversion: encode as 1-bit PNG directly from pixel data
  // without putting it back on the canvas (saves a round-trip)
  const png = await encodeTo1BitPng(data, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  return png;
};

export const processPage = (
  pdf: unknown,
  pageNum: number,
  dpi: number,
  bias: number
): Promise<string> =>
  processPageInternal(pdf, pageNum, dpi, bias, true) as Promise<string>;

export const processPageFull = (
  pdf: unknown,
  pageNum: number,
  dpi: number,
  bias: number
): Promise<Uint8Array> =>
  processPageInternal(pdf, pageNum, dpi, bias, false) as Promise<Uint8Array>;