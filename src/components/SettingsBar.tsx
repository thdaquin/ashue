type SettingsBarProps = {
  dpi: number;
  thresholdBias: number;
  disabled: boolean;
  onDpiChange: (v: number) => void;
  onBiasChange: (v: number) => void;
};

export default function SettingsBar({ dpi, thresholdBias, disabled, onDpiChange, onBiasChange }: SettingsBarProps) {
  return (
    <div className="flex justify-center gap-6">
      <div>
        <label className="block text-sm mb-1 text-slate-400">DPI</label>
        <input
          type="number"
          value={dpi}
          disabled={disabled}
          onChange={(e) => onDpiChange(+e.target.value)}
          className="w-28 rounded-lg bg-slate-800 border border-slate-600 text-center disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <label className="block text-sm mb-1 text-slate-400">Threshold bias</label>
        <input
          type="number"
          value={thresholdBias}
          disabled={disabled}
          onChange={(e) => onBiasChange(+e.target.value)}
          className="w-28 rounded-lg bg-slate-800 border border-slate-600 text-center disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}