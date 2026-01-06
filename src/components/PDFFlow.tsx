import { useState } from 'react';
import PDFSelector from './PDFSelector';
import PDFConverter from './PDFConverter';

export default function PDFFlow() {
  const [file, setFile] = useState<File | null>(null);

  if (!file) {
    return <PDFSelector onSelect={setFile} />;
  }

  return <PDFConverter initialFile={file} />;
}
