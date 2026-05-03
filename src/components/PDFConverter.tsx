import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePdfDoc } from '../hooks/usePdfDoc';
import { usePreview } from '../hooks/usePreview';
import { useConvert } from '../hooks/useConvert';
import FileHeader from './FileHeader';
import SettingsBar from './SettingsBar';
import PreviewPanel from './PreviewPanel';
import ConvertButton from './ConvertButton';

type PDFConverterProps = {
  initialFile?: File;
  onBack: () => void;
};

export default function PDFConverter({ initialFile, onBack }: PDFConverterProps) {
  const [file] = useState<File | null>(initialFile ?? null);
  const [dpi, setDpi] = useState(400);
  const [thresholdBias, setThresholdBias] = useState(0);

  const { pdfDoc, pageCount, defaultPreviewPage } = usePdfDoc(file);
  const preview = usePreview(pdfDoc, pageCount);
  const convert = useConvert(pdfDoc);

  const locked = convert.processing || !!convert.resultPdfUrl;

  // Set the default preview page when a new file loads
  useEffect(() => {
    if (defaultPreviewPage !== null) {
      preview.setPreviewPage(defaultPreviewPage);
    }
  }, [defaultPreviewPage]);

  const handleBack = () => {
    convert.cleanup();
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 space-y-8">

          {file && (
            <FileHeader
              fileName={file.name}
              pageCount={pageCount}
              previewPage={preview.previewPage}
            />
          )}

          <div className="flex flex-col md:flex-row justify-between gap-6">
            {/* Back button — always enabled so user can escape */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Preview page</label>
                  <input
                    type="number"
                    min={1}
                    max={pageCount ?? undefined}
                    value={preview.previewPage ?? ''}
                    disabled={locked}
                    onChange={(e) => preview.setPreviewPage(Number(e.target.value))}
                    className="w-24 rounded-lg bg-slate-800 border border-slate-600 text-center disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={() => preview.generatePreview(dpi, thresholdBias)}
                  disabled={locked}
                  className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Generate preview
                </button>
              </div>
              {preview.previewError && (
                <div className="text-sm text-red-400">{preview.previewError}</div>
              )}
            </div>
          </div>

          <SettingsBar
            dpi={dpi}
            thresholdBias={thresholdBias}
            disabled={locked}
            onDpiChange={setDpi}
            onBiasChange={setThresholdBias}
          />

          <ConvertButton
            processing={convert.processing}
            progress={convert.progress}
            resultPdfUrl={convert.resultPdfUrl}
            disabled={locked}
            onConvert={() => convert.convertFull(dpi, thresholdBias)}
          />

          <PreviewPanel
            previewing={preview.previewing}
            options={preview.previewOptions}
            selectedIndex={preview.selectedIndex}
            disabled={locked}
            onSelect={(i, d, b) => {
              preview.setSelectedIndex(i);
              setDpi(d);
              setThresholdBias(b);
            }}
          />
        </div>
      </div>
    </div>
  );
}