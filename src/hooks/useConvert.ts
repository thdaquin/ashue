import { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { processPageFull } from '../lib/imageProcessing';
import { type PdfDoc } from '../lib/pdfLoader';

export const useConvert = (pdfDoc: PdfDoc | null) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const convertFull = async (dpi: number, bias: number) => {
    if (!pdfDoc) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setProcessing(true);
    setProgress(0);
    setResultPdfUrl(null);

    const doc = await PDFDocument.create();

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      if (controller.signal.aborted) return;

      const { png, width, height } = await processPageFull(pdfDoc, p, dpi, bias);

      if (controller.signal.aborted) return;

      const pngImage = await doc.embedPng(png);
      const page = doc.addPage([width, height]);
      page.drawImage(pngImage, { x: 0, y: 0, width, height });

      setProgress(Math.round((p / pdfDoc.numPages) * 100));

      if (p % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (controller.signal.aborted) return;

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    setResultPdfUrl(URL.createObjectURL(blob));
    setProcessing(false);

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const cleanup = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl);
    setResultPdfUrl(null);
    setProgress(0);
    setProcessing(false);
  };

  return { processing, progress, resultPdfUrl, resultsRef, convertFull, cleanup };
};