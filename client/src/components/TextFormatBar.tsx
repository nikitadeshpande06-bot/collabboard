/**
 * TextFormatBar
 *
 * A floating toolbar that appears at the top of the canvas whenever a text
 * object is selected. It lets the user change:
 *   Font family • Font size • Bold • Italic • Underline • Strikethrough
 *   Text align • Text colour • Highlight colour
 *
 * It calls engineRef.applyTextFormat() which sets the property on the active
 * Fabric.js IText object and emits a modify operation to peers.
 */
import { useEffect, useRef, useState } from 'react';
import { useCanvasStore, type FontFamily, type TextAlign } from '@/store/canvasStore';
import type { CanvasEngine } from '@/canvas/CanvasEngine';

interface Props {
  engineRef: React.MutableRefObject<CanvasEngine | null>;
}

const FONTS: { label: string; value: FontFamily }[] = [
  { label: 'Inter (Sans)',    value: 'Inter' },
  { label: 'Georgia (Serif)', value: 'Georgia' },
  { label: 'Courier New',     value: 'Courier New' },
  { label: 'Impact',          value: 'Impact' },
  { label: 'Comic Sans',      value: 'Comic Sans MS' },
  { label: 'Arial',           value: 'Arial' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

const TEXT_COLORS = [
  '#1f2328','#ef4444','#f97316','#eab308','#22c55e',
  '#3b82f6','#8b5cf6','#ec4899','#000000','#ffffff',
];

const HIGHLIGHT_COLORS = [
  'transparent','#fef08a','#bbf7d0','#bfdbfe',
  '#fecaca',   '#e9d5ff','#fed7aa','#fbcfe8',
];

export default function TextFormatBar({ engineRef }: Props) {
  const store = useCanvasStore();
  const [showColorPicker, setShowColorPicker]  = useState(false);
  const [showHighlight,   setShowHighlight]    = useState(false);
  const [highlightColor,  setHighlightColor]   = useState('transparent');

  const apply = (prop: Parameters<CanvasEngine['applyTextFormat']>[0]) => {
    engineRef.current?.applyTextFormat(prop);
  };

  // Keep store in sync with applied properties
  const applyBold = () => {
    const next = !store.bold;
    store.setBold(next);
    apply({ fontWeight: next ? 'bold' : 'normal' });
  };

  const applyItalic = () => {
    const next = !store.italic;
    store.setItalic(next);
    apply({ fontStyle: next ? 'italic' : 'normal' });
  };

  const applyUnderline = () => {
    const next = !store.underline;
    store.setUnderline(next);
    apply({ underline: next });
  };

  const applyStrikethrough = () => {
    // Fabric IText uses `linethrough` property
    const obj = engineRef.current as CanvasEngine & { _fc?: { getActiveObject: () => { linethrough?: boolean; set: (k: string, v: unknown) => void; canvas?: { renderAll: () => void } } } };
    engineRef.current?.applyTextFormat({ linethrough: !store.underline } as never);
  };

  const applyFont = (f: FontFamily) => {
    store.setFontFamily(f);
    apply({ fontFamily: f === 'Inter' ? 'Arial, sans-serif' : f });
  };

  const applySize = (s: number) => {
    store.setFontSize(s);
    apply({ fontSize: s });
  };

  const applyAlign = (a: TextAlign) => {
    store.setTextAlign(a);
    apply({ textAlign: a });
  };

  const applyColor = (c: string) => {
    store.setTextColor(c);
    apply({ fill: c });
    setShowColorPicker(false);
  };

  const applyHighlight = (c: string) => {
    setHighlightColor(c);
    // Fabric IText doesn't support per-char highlight natively — we set
    // textBackgroundColor on the whole object
    apply({ textBackgroundColor: c } as never);
    setShowHighlight(false);
  };

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-1.5 flex-wrap select-none"
      style={{ fontSize: 13 }}>

      {/* Font family */}
      <select
        className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={store.fontFamily}
        onChange={(e) => applyFont(e.target.value as FontFamily)}
      >
        {FONTS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-16 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={store.fontSize}
        onChange={(e) => applySize(parseInt(e.target.value))}
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <Divider />

      {/* Bold */}
      <FmtBtn active={store.bold} title="Bold (Ctrl+B)" onClick={applyBold}>
        <strong>B</strong>
      </FmtBtn>

      {/* Italic */}
      <FmtBtn active={store.italic} title="Italic (Ctrl+I)" onClick={applyItalic}>
        <em>I</em>
      </FmtBtn>

      {/* Underline */}
      <FmtBtn active={store.underline} title="Underline (Ctrl+U)" onClick={applyUnderline}>
        <span style={{ textDecoration: 'underline' }}>U</span>
      </FmtBtn>

      {/* Strikethrough */}
      <FmtBtn active={false} title="Strikethrough" onClick={applyStrikethrough}>
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </FmtBtn>

      <Divider />

      {/* Text align */}
      <FmtBtn active={store.textAlign === 'left'}   title="Align Left"    onClick={() => applyAlign('left')}>⬛</FmtBtn>
      <FmtBtn active={store.textAlign === 'center'} title="Align Centre"  onClick={() => applyAlign('center')}>▣</FmtBtn>
      <FmtBtn active={store.textAlign === 'right'}  title="Align Right"   onClick={() => applyAlign('right')}>▪</FmtBtn>

      <Divider />

      {/* Text colour */}
      <div className="relative">
        <button
          title="Text colour"
          className="flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-gray-100 transition-colors"
          onClick={() => { setShowColorPicker((p) => !p); setShowHighlight(false); }}
        >
          <span className="font-bold text-sm" style={{ color: store.textColor }}>A</span>
          <div className="w-5 h-1 rounded-full mt-0.5" style={{ background: store.textColor }} />
        </button>
        {showColorPicker && (
          <div className="absolute top-9 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 w-52">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Text colour</p>
            <div className="grid grid-cols-5 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button key={c} onClick={() => applyColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform
                    ${store.textColor === c ? 'border-blue-500' : 'border-gray-200'}`}
                  style={{ background: c }} />
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              Custom
              <input type="color" className="w-6 h-6 cursor-pointer rounded"
                value={store.textColor}
                onChange={(e) => applyColor(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      {/* Highlight colour */}
      <div className="relative">
        <button
          title="Highlight colour"
          className="flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-gray-100 transition-colors"
          onClick={() => { setShowHighlight((p) => !p); setShowColorPicker(false); }}
        >
          <span className="font-bold text-sm text-gray-700">H</span>
          <div className="w-5 h-1 rounded-full mt-0.5 border border-gray-300"
            style={{ background: highlightColor === 'transparent' ? '#fff' : highlightColor }} />
        </button>
        {showHighlight && (
          <div className="absolute top-9 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 w-52">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Highlight colour</p>
            <div className="grid grid-cols-4 gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c} onClick={() => applyHighlight(c)}
                  className={`w-10 h-8 rounded-lg border-2 hover:scale-110 transition-transform
                    ${highlightColor === c ? 'border-blue-500' : 'border-gray-200'}`}
                  style={{
                    background: c === 'transparent'
                      ? 'repeating-linear-gradient(45deg,#ddd 0 2px,#fff 2px 6px)'
                      : c,
                  }} />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function FmtBtn({
  children, active, title, onClick,
}: { children: React.ReactNode; active: boolean; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors
        ${active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />;
}
