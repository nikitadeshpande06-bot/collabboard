/**
 * Export Panel
 *
 * Exports the current Fabric.js canvas as:
 *   PNG  — rasterised at 2× resolution for crisp display
 *   SVG  — fully scalable, perfect for presentations
 *   JSON — raw Fabric.js snapshot (importable back in)
 *
 * Why this impresses interviewers:
 *  – Demonstrates understanding of browser APIs (Blob, URL.createObjectURL)
 *  – Shows product thinking: "users need to take their work out of the app"
 *  – SVG export shows canvas-to-vector knowledge
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CanvasEngine } from '@/canvas/CanvasEngine';

// Lazy-load jsPDF from CDN so we don't increase the bundle
async function getJsPDF() {
  if ((window as any).jspdf) return (window as any).jspdf.jsPDF;
  await new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => res();
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return (window as any).jspdf.jsPDF;
}

interface Props {
  engineRef: React.MutableRefObject<CanvasEngine | null>;
  roomName:  string;
}

export default function ExportPanel({ engineRef, roomName }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const safe = (roomName ?? 'whiteboard').replace(/[^a-z0-9]/gi, '_');

  async function exportPNG() {
    const fc = engineRef.current?.fabricCanvas;
    if (!fc) return;
    setExporting(true);
    try {
      // 2× pixel density for retina quality
      const dataUrl = fc.toDataURL({ format: 'png', multiplier: 2 });
      download(dataUrl, `${safe}.png`);
      toast.success('PNG exported!');
    } finally {
      setExporting(false);
      setOpen(false);
    }
  }

  async function exportSVG() {
    const fc = engineRef.current?.fabricCanvas;
    if (!fc) return;
    setExporting(true);
    try {
      const svg = fc.toSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      download(URL.createObjectURL(blob), `${safe}.svg`, true);
      toast.success('SVG exported!');
    } finally {
      setExporting(false);
      setOpen(false);
    }
  }

  async function exportPDF() {
    const fc = engineRef.current?.fabricCanvas;
    if (!fc) return;
    setExporting(true);
    try {
      const JsPDF = await getJsPDF();
      const dataUrl = fc.toDataURL({ format: 'png', multiplier: 2 });
      const w = fc.width  ?? 800;
      const h = fc.height ?? 600;
      // Landscape if wider than tall
      const orientation = w >= h ? 'landscape' : 'portrait';
      const pdf = new JsPDF({ orientation, unit: 'px', format: [w, h] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
      pdf.save(`${safe}.pdf`);
      toast.success('PDF exported!');
    } catch (e) {
      toast.error('PDF export failed');
    } finally {
      setExporting(false);
      setOpen(false);
    }
  }

  function exportJSON() {
    const json = engineRef.current?.toJSON() ?? '{}';
    const blob = new Blob([json], { type: 'application/json' });
    download(URL.createObjectURL(blob), `${safe}.json`, true);
    toast.success('JSON exported!');
    setOpen(false);
  }

  function download(url: string, filename: string, revoke = false) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="relative">
      <button
        className="btn-ghost text-sm flex items-center gap-1"
        onClick={() => setOpen((p) => !p)}
        title="Export canvas"
      >
        ⬇ Export
      </button>

      {open && (
        <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 w-48">
          <ExportOption
            icon="🖼️"
            label="Export as PNG"
            sub="High resolution image"
            onClick={exportPNG}
            disabled={exporting}
          />
          <ExportOption
            icon="📐"
            label="Export as SVG"
            sub="Scalable vector graphic"
            onClick={exportSVG}
            disabled={exporting}
          />
          <ExportOption
            icon="📑"
            label="Export as PDF"
            sub="Print-ready document"
            onClick={exportPDF}
            disabled={exporting}
          />
          <ExportOption
            icon="📄"
            label="Export as JSON"
            sub="Re-importable snapshot"
            onClick={exportJSON}
            disabled={false}
          />
        </div>
      )}
    </div>
  );
}

function ExportOption({
  icon, label, sub, onClick, disabled,
}: { icon: string; label: string; sub: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
    >
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </button>
  );
}
