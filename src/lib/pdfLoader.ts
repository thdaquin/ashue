const WORKER_SRC =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<unknown>;
};

export const loadPdfDoc = async (file: File): Promise<PdfDoc> => {
  const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
  return pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
};