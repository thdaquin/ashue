import { Loader2 } from 'lucide-react';

type ConvertButtonProps = {
  processing: boolean;
  progress: number;
  resultPdfUrl: string | null;
  disabled: boolean;
  onConvert: () => void;
};

export default function ConvertButton({
  processing,
  progress,
  resultPdfUrl,
  disabled,
  onConvert,
}: ConvertButtonProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {resultPdfUrl && !processing ? (
          <a
            href={resultPdfUrl}
            download="converted.pdf"
            className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Download PDF
          </a>
        ) : (
          <button
            onClick={onConvert}
            disabled={disabled}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing && <Loader2 size={18} className="animate-spin" />}
            {processing ? 'Processing…' : 'Convert full PDF'}
          </button>
        )}
      </div>

      {processing && (
        <div className="space-y-2">
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center text-sm text-slate-400">{progress}% complete</div>
        </div>
      )}
    </div>
  );
}