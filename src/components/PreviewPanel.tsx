import { Loader2 } from 'lucide-react';
import { type PreviewOption } from '../hooks/usePreview';

type PreviewPanelProps = {
  previewing: boolean;
  options: PreviewOption[];
  selectedIndex: number | null;
  disabled: boolean;
  onSelect: (index: number, dpi: number, bias: number) => void;
};

const COLS = 3;

export default function PreviewPanel({ previewing, options, selectedIndex, disabled, onSelect }: PreviewPanelProps) {
  if (previewing) {
    return (
      <div className="flex justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (options.length === 0) return null;

  const rows: PreviewOption[][] = [];
  for (let i = 0; i < options.length; i += COLS) {
    rows.push(options.slice(i, i + COLS));
  }

  const biasValues = rows[0].map((p) => p.bias);

  return (
    <div className="flex gap-2">
      {/* DPI axis label — rotated on the left */}
      <div className="flex items-center justify-center">
        <span
          className="text-xs text-slate-500 font-medium tracking-widest uppercase"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          DPI
        </span>
      </div>

      {/* Main grid area */}
      <div className="flex-1 min-w-0 space-y-1 sm:space-y-3">

        {/* Bias axis — header above columns */}
        <div className="flex flex-col items-center mb-1">
          <span className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-1">
            Bias
          </span>
          {/* Column values */}
          <div className="grid w-full" style={{ gridTemplateColumns: '2.5rem 1fr 1fr 1fr' }}>
            <div /> {/* spacer for row label column */}
            {biasValues.map((b) => (
              <div key={b} className="text-center text-xs text-slate-500">
                {b > 0 ? `+${b}` : b}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="grid items-stretch gap-1 sm:gap-3"
            style={{ gridTemplateColumns: '2.5rem 1fr 1fr 1fr' }}
          >
            {/* Row label — DPI value */}
            <div className="flex items-center justify-end pr-1">
              <span className="text-xs text-slate-500 font-medium">{row[0].dpi}</span>
            </div>

            {row.map((p, colIdx) => {
              const globalIdx = rowIdx * COLS + colIdx;
              return (
                <button
                  key={colIdx}
                  onClick={() => onSelect(globalIdx, p.dpi, p.bias)}
                  disabled={disabled}
                  title={`${p.dpi} DPI · bias ${p.bias}`}
                  className={`
                    min-w-0 rounded-lg border overflow-hidden transition-all duration-300
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${
                      selectedIndex === globalIdx
                        ? 'border-emerald-400 ring-2 ring-emerald-400/40 scale-[1.02]'
                        : 'border-slate-700 hover:border-slate-500'
                    }
                  `}
                >
                  <img src={p.image} className="w-full bg-black block" />
                  <div className="hidden sm:block px-2 py-1 text-xs bg-slate-900 text-slate-400 text-center">
                    {p.dpi} DPI · bias {p.bias}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}