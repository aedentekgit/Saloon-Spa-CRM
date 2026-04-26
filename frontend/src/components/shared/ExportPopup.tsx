import React, { useMemo, useState } from 'react';
import { Download, FileText, Loader2, Sheet } from 'lucide-react';
import { Modal } from './Modal';
import { ZenDropdown } from '../zen/ZenInputs';
import { ZenButton } from '../zen/ZenButtons';
import { notify } from './ZenNotification';

type ExportFormat = 'PDF' | 'Excel Sheet' | 'EXE Sheet';

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => unknown);
}

interface ExportPopupProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  fileName: string;
  title?: string;
  description?: string;
  triggerLabel?: string;
  resolveData?: () => Promise<T[]>;
  className?: string;
}

const formatOptions: ExportFormat[] = ['PDF', 'Excel Sheet', 'EXE Sheet'];

const toText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const ExportPopup = <T extends object>({
  data,
  columns,
  fileName,
  title = 'Records',
  description = 'Choose a format and download the current visible list.',
  triggerLabel = 'Download',
  resolveData,
  className = ''
}: ExportPopupProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');
  const [isPreparing, setIsPreparing] = useState(false);

  const rows = useMemo(
    () =>
      data.map((item) =>
        columns.map((col) => {
          const rawValue =
            typeof col.accessor === 'function'
              ? col.accessor(item)
              : (item[col.accessor] as unknown);
          return toText(rawValue);
        })
      ),
    [data, columns]
  );

  const stampedFileName = (extension: string) => {
    const stamp = new Date().toISOString().slice(0, 10);
    return `${fileName}_${stamp}.${extension}`;
  };

  const buildCsv = (exportRows: string[][]) => {
    const headerLine = columns.map((col) => escapeCsv(col.header)).join(',');
    const lines = exportRows.map((row) => row.map((cell) => escapeCsv(cell)).join(','));
    return [headerLine, ...lines].join('\n');
  };

  const exportCsv = (exportRows: string[][]) => {
    const csv = buildCsv(exportRows);
    downloadBlob(
      new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }),
      stampedFileName('csv')
    );
  };

  // Excel-compatible CSV (opens as table in Excel and Numbers)
  const exportExcel = (exportRows: string[][]) => {
    const csv = buildCsv(exportRows);
    downloadBlob(
      new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }),
      stampedFileName('csv')
    );
  };

  const exportPdf = (exportRows: string[][], presetWindow?: Window | null) => {
    const win = presetWindow || window.open('', '_blank', 'width=1100,height=800');
    if (!win || win.closed) {
      notify('error', 'Export Blocked', 'Please allow popups to save PDF export.');
      return;
    }

    const headerCells = columns.map((col) => `<th>${escapeHtml(col.header)}</th>`).join('');
    const bodyRows = exportRows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');
    const printedAt = new Date().toLocaleString();

    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
    h1 { font-size: 20px; margin: 0 0 6px; }
    p { font-size: 12px; color: #666; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)} Export</h1>
  <p>Generated at: ${escapeHtml(printedAt)} | Records: ${exportRows.length}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const mapRows = (records: T[]) =>
    records.map((item) =>
      columns.map((col) => {
        const rawValue =
          typeof col.accessor === 'function'
            ? col.accessor(item)
            : (item[col.accessor] as unknown);
        return toText(rawValue);
      })
    );

  const handleDownload = async () => {
    const preOpenedPdfWindow =
      selectedFormat === 'PDF'
        ? window.open('', '_blank', 'width=1100,height=800')
        : null;

    if (selectedFormat === 'PDF' && !preOpenedPdfWindow) {
      notify('error', 'Export Blocked', 'Please allow popups to open PDF export.');
      return;
    }

    if (preOpenedPdfWindow) {
      preOpenedPdfWindow.document.open();
      preOpenedPdfWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Preparing...</title></head><body style="font-family:Arial,sans-serif;padding:24px;">Preparing PDF export...</body></html>`);
      preOpenedPdfWindow.document.close();
    }

    setIsPreparing(true);
    try {
      let exportRows = rows;

      if (resolveData) {
        const fullData = await resolveData();
        exportRows = mapRows(fullData);
      }

      if (exportRows.length === 0) {
        notify('warning', 'No Data', 'No records available for export.');
        preOpenedPdfWindow?.close();
        return;
      }

      if (selectedFormat === 'PDF') {
        exportPdf(exportRows, preOpenedPdfWindow);
        notify('info', 'PDF Ready', 'Print dialog opened. Choose Save as PDF.');
      } else if (selectedFormat === 'Excel Sheet') {
        exportExcel(exportRows);
        notify('success', 'Downloaded', 'Excel sheet downloaded successfully.');
      } else {
        exportCsv(exportRows);
        notify('success', 'Downloaded', 'EXE sheet downloaded successfully.');
      }
      setIsOpen(false);
    } catch (_err) {
      preOpenedPdfWindow?.close();
      notify('error', 'Export Failed', 'Could not collect full list. Please retry.');
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <>
      <div className={`flex flex-col gap-2.5 w-full sm:w-auto ${className}`}>
        <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">
          Export
        </label>
        <button
          onClick={() => setIsOpen(true)}
          disabled={isPreparing}
          className="w-full sm:w-auto shrink-0 h-[52px] rounded-[1.15rem] px-8 shadow-sm flex items-center justify-center gap-2 active:scale-95 group transition-all duration-700 bg-white border border-zen-brown/10 text-zen-brown font-black text-[10px] uppercase tracking-[0.2em] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-zen-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <span className="relative z-10">{triggerLabel}</span>
          <div className="group-hover:rotate-180 transition-transform duration-700 relative z-10 shrink-0">
            <Download size={16} />
          </div>
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="max-w-xl"
        title={`${title} Export`}
        subtitle="Download Center"
        headerIcon={FileText}
        footer={
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <ZenButton
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </ZenButton>
            <ZenButton onClick={handleDownload} className="flex-1" disabled={isPreparing}>
              <span>{isPreparing ? 'Preparing...' : 'Download'}</span>
              {isPreparing ? <Loader2 size={16} className="animate-spin" /> : <Sheet size={16} />}
            </ZenButton>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-zen-brown/10 bg-zen-cream/35 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zen-brown/35">
              Export Summary
            </p>
            <p className="text-sm text-zen-brown/70 mt-2">{description}</p>
            <p className="text-[11px] font-black tracking-wider text-zen-brown mt-2">
              {resolveData
                ? 'Full list export enabled (all matching records)'
                : `${rows.length} record${rows.length === 1 ? '' : 's'} ready`}
            </p>
          </div>

          <ZenDropdown
            label="Select Format"
            options={formatOptions}
            value={selectedFormat}
            onChange={(v) => setSelectedFormat(v as ExportFormat)}
            placeholder="Choose format"
            variant="pill"
            icon={FileText}
            hideLabel={false}
          />
        </div>
      </Modal>
    </>
  );
};
