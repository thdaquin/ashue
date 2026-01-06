import { useState, useRef } from 'react';
import { Download, Upload, FileText } from 'lucide-react';

export default function PDFConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [convertedPages, setConvertedPages] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(128);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setConvertedPages([]);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const convertToBlackAndWhite = async () => {
    if (!file) return;
    
    setProcessing(true);
    setConvertedPages([]);

    try {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let j = 0; j < data.length; j += 4) {
          const avg = (data[j] + data[j + 1] + data[j + 2]) / 3;
          const bw = avg > threshold ? 255 : 0;
          data[j] = bw;
          data[j + 1] = bw;
          data[j + 2] = bw;
        }

        context.putImageData(imageData, 0, 0);
        pages.push(canvas.toDataURL('image/png'));
      }

      setConvertedPages(pages);
    } catch (error) {
      console.error('Error converting PDF:', error);
      alert('Error processing PDF. Please try another file.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadPDF = async () => {
    if (convertedPages.length === 0) return;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    for (let i = 0; i < convertedPages.length; i++) {
      if (i > 0) pdf.addPage();
      
      const img = new Image();
      img.src = convertedPages[i];
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const imgWidth = 210;
          const imgHeight = (img.height * imgWidth) / img.width;
          pdf.addImage(img, 'PNG', 0, 0, imgWidth, imgHeight);
          resolve();
        };
      });
    }

    pdf.save(`${file!.name.replace('.pdf', '')}_bw.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">PDF to B&W Converter</h1>
          </div>
          
          <p className="text-gray-600 mb-6">
            Convert colored PDFs to pure black and white for optimal e-ink display
          </p>

          <div className="space-y-6">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Select PDF File
              </button>
              
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file!.name}
                </p>
              )}
            </div>

            {file && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Black/White Threshold: {threshold}
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower values = more black, Higher values = more white
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={convertToBlackAndWhite}
                disabled={!file || processing}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Processing...' : 'Convert to B&W'}
              </button>

              {convertedPages.length > 0 && (
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download B&W PDF
                </button>
              )}
            </div>

            {convertedPages.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Preview ({convertedPages.length} pages)</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto border rounded p-4">
                  {convertedPages.map((page, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <p className="text-sm text-gray-600 mb-2">Page {index + 1}</p>
                      <img 
                        src={page} 
                        alt={`Page ${index + 1}`}
                        className="max-w-full h-auto border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}