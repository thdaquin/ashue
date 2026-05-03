import { useState } from 'react';
import PDFSelector from './PdfSelector';
import PDFConverter from './PdfConverter';

export default function PdfFlow() {
  const [file, setFile] = useState<File | null>(null);

  if (!file) {
    return <PDFSelector onSelect={setFile} />;
  }

  return <PDFConverter initialFile={file} onBack={() => setFile(null)} />;
}