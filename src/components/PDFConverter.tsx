import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

type PreviewOption = {
  dpi: number;
  bias: number;
  image: string;
};

type PDFConverterProps = {
  initialFile?: File;
};

export default function PDFConverter({ initialFile }: PDFConverterProps) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);

  const [dpi, setDpi] = useState(400);
  const [thresholdBias, setThresholdBias] = useState(0);

  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [previewOptions, setPreviewOptions] = useState<PreviewOption[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number | null>(null);

  const [previewError, setPreviewError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const PREVIEW_CROP_RATIO = 0.4;
  const PREVIEW_ZOOM = 1.25;

  useEffect(() => {
    if (!file) return;
    (async () => {
      const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      setPageCount(pdf.numPages);
      setPreviewPage(Math.max(1, Math.floor(pdf.numPages / 3)));
    })();
  }, [file]);

  const clamp = (v: number) => Math.min(255, Math.max(0, v));

  const softBW = (gray: number, threshold: number, softness = 18) => {
    if (gray > threshold + softness) return 255;
    if (gray < threshold - softness) return 0;
    return Math.round(((gray - (threshold - softness)) / (2 * softness)) * 255);
  };

  const otsuThreshold = (hist: Uint32Array, total: number) => {
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

  const cleanupSpeckles = (data: Uint8ClampedArray, w: number, h: number) => {
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

  const processPage = async (
    pdf: any,
    pageNum: number,
    dpi: number,
    bias: number,
    preview = false
  ) => {
    const page = await pdf.getPage(pageNum);
    const scale = dpi / 96;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const hist = new Uint32Array(256);
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const g = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      hist[g | 0]++;
      min = Math.min(min, g);
      max = Math.max(max, g);
    }

    const threshold = otsuThreshold(hist, canvas.width * canvas.height) + bias;
    const contrastScale = 255 / Math.max(1, max - min);

    for (let i = 0; i < data.length; i += 4) {
      let g = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      g = clamp((g - min) * contrastScale);
      const bw = softBW(g, threshold);
      data[i] = data[i + 1] = data[i + 2] = bw;
    }

    cleanupSpeckles(data, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);

    return preview ? extractCenterPreview(canvas) : canvas.toDataURL('image/png');
  };

  const generatePreview = async () => {
    if (!file || !pageCount) return;

    setSelectedPreviewIndex(null);

    if (!previewPage || previewPage < 1 || previewPage > pageCount) {
      setPreviewError(`Preview page must be between 1 and ${pageCount}`);
      return;
    }

    setPreviewError(null);
    setPreviewing(true);
    setPreviewOptions([]);

    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

    const dpis = [dpi - 100, dpi, dpi + 100].filter(d => d > 0);
    const biases = [thresholdBias - 25, thresholdBias, thresholdBias + 25];

    const previews: PreviewOption[] = [];

    for (const d of dpis) {
      for (const b of biases) {
        const image = await processPage(pdf, previewPage, d, b, true);
        previews.push({ dpi: d, bias: b, image });
      }
    }

    setPreviewOptions(previews);
    setPreviewing(false);
  };

  const convertFull = async () => {
    if (!file || !pageCount) return;

    setProcessing(true);
    setProgress(0);
    setResultPdfUrl(null);

    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'px' });

    for (let p = 1; p <= pdf.numPages; p++) {
      const img = await processPage(pdf, p, dpi, thresholdBias);
      const imgProps = doc.getImageProperties(img);
      const width = doc.internal.pageSize.getWidth();
      const height = (imgProps.height * width) / imgProps.width;

      if (p > 1) doc.addPage();
      doc.addImage(img, 'PNG', 0, 0, width, height);

      setProgress(Math.round((p / pdf.numPages) * 100));
    }

    const blob = doc.output('blob');
    setResultPdfUrl(URL.createObjectURL(blob));
    setProcessing(false);

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 space-y-8">

          {file && (
            <div className="border-b border-slate-800 pb-4 text-center">
              <h1 className="text-xl font-semibold truncate">{file.name}</h1>
              <div className="mt-1 text-sm text-slate-400 flex justify-center gap-4">
                {pageCount && <span>{pageCount} pages</span>}
                {previewPage && <span>Preview page: {previewPage}</span>}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between gap-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold"
            >
              Select PDF
            </button>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-sm mb-1">Preview page</label>
                  <input
                    type="number"
                    min={1}
                    max={pageCount ?? undefined}
                    value={previewPage ?? ''}
                    onChange={(e) => {
                      setPreviewPage(Number(e.target.value));
                      setPreviewError(null);
                    }}
                    className="w-24 rounded-lg bg-slate-800 border border-slate-600 text-center"
                  />
                </div>
                <button
                  onClick={generatePreview}
                  className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600"
                >
                  Generate preview
                </button>
              </div>
              {previewError && (
                <div className="text-sm text-red-400">{previewError}</div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-6">
            <div>
              <label className="block text-sm mb-1">DPI</label>
              <input
                type="number"
                value={dpi}
                onChange={(e) => setDpi(+e.target.value)}
                className="w-28 rounded-lg bg-slate-800 border border-slate-600 text-center"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Threshold bias</label>
              <input
                type="number"
                value={thresholdBias}
                onChange={(e) => setThresholdBias(+e.target.value)}
                className="w-28 rounded-lg bg-slate-800 border border-slate-600 text-center"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={convertFull}
              disabled={processing}
              className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              Convert full PDF
            </button>
          </div>

          {processing && (
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-center text-sm text-slate-400">
                {progress}% complete
              </div>
            </div>
          )}

          {previewing && (
            <div className="flex justify-center">
              <Loader2 className="animate-spin" size={32} />
            </div>
          )}

          {previewOptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {previewOptions.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDpi(p.dpi);
                    setThresholdBias(p.bias);
                    setSelectedPreviewIndex(i);
                  }}
                  className={`
                    rounded-xl border overflow-hidden transition-all duration-300
                    ${
                      selectedPreviewIndex === i
                        ? 'border-emerald-400 ring-2 ring-emerald-400/40 scale-[1.02]'
                        : 'border-slate-700 hover:border-slate-500'
                    }
                  `}
                >
                  <img src={p.image} className="w-full bg-black" />
                  <div className="px-3 py-2 text-sm bg-slate-900">
                    {p.dpi} DPI · bias {p.bias}
                  </div>
                </button>
              ))}
            </div>
          )}

          {resultPdfUrl && !processing && (
            <div ref={resultsRef} className="mt-10 flex flex-col items-center gap-4">
              <h2 className="text-lg font-semibold">Conversion complete</h2>
              <a
                href={resultPdfUrl}
                download="converted.pdf"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
              >
                Download PDF
              </a>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />
      </div>
    </div>
  );
}
