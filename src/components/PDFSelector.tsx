import { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

type PDFSelectorProps = {
  onSelect: (file: File) => void;
};

export default function PDFSelector({ onSelect }: PDFSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    onSelect(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-10 w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <FileText size={48} className="text-blue-500" />
        </div>

        <h1 className="text-2xl font-semibold">Upload a PDF</h1>
        <p className="text-slate-400 text-sm">
          Select a PDF to start the conversion process
        </p>

        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3
                     rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold"
        >
          <Upload size={18} />
          Select PDF
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          hidden
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
