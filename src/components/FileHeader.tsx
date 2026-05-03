type FileHeaderProps = {
  fileName: string;
  pageCount: number | null;
  previewPage: number | null;
};

export default function FileHeader({ fileName, pageCount, previewPage }: FileHeaderProps) {
  return (
    <div className="border-b border-slate-800 pb-4 text-center">
      <h1 className="text-xl font-semibold truncate">{fileName}</h1>
      <div className="mt-1 text-sm text-slate-400 flex justify-center gap-4">
        {pageCount && <span>{pageCount} pages</span>}
        {previewPage && <span>Preview page: {previewPage}</span>}
      </div>
    </div>
  );
}