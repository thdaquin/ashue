import { useState, useEffect } from 'react';
import { loadPdfDoc, type PdfDoc } from '../lib/pdfLoader';

export const usePdfDoc = (file: File | null) => {
  const [pdfDoc, setPdfDoc] = useState<PdfDoc | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [defaultPreviewPage, setDefaultPreviewPage] = useState<number | null>(null);

  useEffect(() => {
    if (!file) return;
    setPdfDoc(null);
    setPageCount(null);

    loadPdfDoc(file).then((pdf) => {
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      setDefaultPreviewPage(Math.max(1, Math.floor(pdf.numPages / 3)));
    });
  }, [file]);

  return { pdfDoc, pageCount, defaultPreviewPage };
};