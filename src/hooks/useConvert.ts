import { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { processPage } from '../lib/imageProcessing';
import { type PdfDoc } from '../lib/pdfLoader';

export const useConvert = (pdfDoc: PdfDoc | null) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const convertFull = async (dpi: number, bias: number) => {
    if (!pdfDoc) return;

    // Cancel any in-flight conversion before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setProcessing(true);
    setProgress(0);
    setResultPdfUrl(null);

    const pdfDoc_ = await PDFDocument.create();

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      // Stop immediately if aborted (e.g. user clicked Back)
      if (controller.signal.aborted) return;

      const dataUrl = await processPage(pdfDoc, p, dpi, bias);

      if (controller.signal.aborted) return;

      const base64 = dataUrl.split(',')[1];
      const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const pngImage = await pdfDoc_.embedPng(pngBytes);
      const { width, height } = pngImage;

      const page = pdfDoc_.addPage([width, height]);
      page.drawImage(pngImage, { x: 0, y: 0, width, height });

      setProgress(Math.round((p / pdfDoc.numPages) * 100));

      if (p % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (controller.signal.aborted) return;

    const pdfBytes = await pdfDoc_.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    setResultPdfUrl(URL.createObjectURL(blob));
    setProcessing(false);

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const cleanup = () => {
    // Signal the loop to stop
    abortRef.current?.abort();
    abortRef.current = null;

    if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
    setResultPdfUrl(null);
    setProgress(0);
    setProcessing(false);
  };

  return { processing, progress, resultPdfUrl, resultsRef, convertFull, cleanup };
};