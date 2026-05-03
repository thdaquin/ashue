import { useState } from 'react';
import { processPage } from '../lib/imageProcessing';
import { type PdfDoc } from '../lib/pdfLoader';

export type PreviewOption = {
  dpi: number;
  bias: number;
  image: string;
};

export const usePreview = (pdfDoc: PdfDoc | null, pageCount: number | null) => {
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [previewOptions, setPreviewOptions] = useState<PreviewOption[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const generatePreview = async (dpi: number, bias: number) => {
    if (!pdfDoc || !pageCount) return;

    setSelectedIndex(null);

    if (!previewPage || previewPage < 1 || previewPage > pageCount) {
      setPreviewError(`Preview page must be between 1 and ${pageCount}`);
      return;
    }

    setPreviewError(null);
    setPreviewing(true);
    setPreviewOptions([]);

    const dpis = [dpi - 100, dpi, dpi + 100].filter((d) => d > 0);
    const biases = [bias - 25, bias, bias + 25];
    const previews: PreviewOption[] = [];

    for (const d of dpis) {
      for (const b of biases) {
        const image = await processPage(pdfDoc, previewPage, d, b, true);
        previews.push({ dpi: d, bias: b, image });
      }
    }

    setPreviewOptions(previews);
    setPreviewing(false);
  };

  return {
    previewPage,
    setPreviewPage: (page: number) => {
      setPreviewPage(page);
      setPreviewError(null);
    },
    previewOptions,
    previewing,
    previewError,
    selectedIndex,
    setSelectedIndex,
    generatePreview,
  };
};