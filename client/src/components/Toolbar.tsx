import { useState, useRef, useEffect } from 'react';
import { useCanvasStore, type Tool, type FontFamily, type TextAlign } from '@/store/canvasStore';

interface Props {
  undo:                  () => void;
  redo:                  () => void;
  clear:                 () => void;
  insertImage:           () => void;
  insertTableAtCenter:   () => void;
  applyFillToSelection:  (c: string) => void;
  applyStrokeToSelection:(c: string) => void;
}

// ── Tool groups shown in the sidebar ─────────────────────────────────────────
const DRAW_TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select (V)',  icon: '↖' },
  { id: 'pencil', label: 'Pencil (P)',  icon: '✏️' },
  { id: 'eraser', label: 'Eraser (E)',  icon: '⌫' },
  { id: 'pan',    label: 'Pan (H)',     icon: '✋' },
];

const BASIC_SHAPES: { id: Tool; label: string; icon: string }[] = [
  { id: 'line',   label: 'Line',      icon: '╱' },
  { id: 'rect',   label: 'Rectangle', icon: '▭' },
  { id: 'circle', label: 'Circle',    icon: '◯' },
];

const EXT_SHAPES: { id: Tool; label: string; icon: string }[] = [
  { id: 'triangle', label: 'Triangle',      icon: '△' },
  { id: 'diamond',  label: 'Diamond',       icon: '◇' },
  { id: 'hexagon',  label: 'Hexagon',       icon: '⬡' },
  { id: 'star',     label: 'Star',          icon: '★' },
  { id: 'arrow',    label: 'Arrow',         icon: '➡' },
  { id: 'speech',   label: 'Speech Bubble', icon: '💬' },
];

const CONTENT_TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'text',   label: 'Text (T)',   icon: 'T' },
  { id: 'sticky', label: 'Sticky Note', icon: '📌' },
  { id: 'table',  label: 'Table',      icon: '⊞' },
];

const STROKE_COLORS = [
  '#1f2328','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#8b5cf6','#ec4899',
  '#ffffff','#94a3b8',
];

const FILL_COLORS = [
  'transparent','#fef2f2','#fff7ed','#fefce8','#f0fdf4',
  '#eff6ff','#f5f3ff','#fdf4ff','#ffffff','#f1f5f9',
  // Dark fill options
  '#1f2937','#374151','#4b5563','#111827','#0f172a',
];

const STICKY_COLORS = [
  { hex: '#fef08a', label: 'Yellow'  },
  { hex: '#bbf7d0', label: 'Green'   },
  { hex: '#bfdbfe', label: 'Blue'    },
  { hex: '#fecaca', label: 'Red'     },
  { hex: '#e9d5ff', label: 'Purple'  },
  { hex: '#fed7aa', label: 'Orange'  },
  { hex: '#ffffff', label: 'White'   },
  { hex: '#f1f5f9', label: 'Gray'    },
];

const FONTS: FontFamily[] = ['Inter','Georgia','Courier New','Impact','Comic Sans MS','Arial'];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

const TEXT_COLORS = [
  '#1f2328','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#8b5cf6','#ec4899',
  '#ffffff','#94a3b8',
];

// ── Language definitions ───────────────────────────────────────────────────────
// Each entry: code = BCP-47 locale for SpeechRecognition, font = best Fabric font
export const LANGUAGES: {
  code: string; name: string; native: string; font: FontFamily; sample: string;
}[] = [
  { code: 'en-US',  name: 'English',            native: 'English',      font: 'Noto Sans',            sample: 'Hello World' },
  { code: 'hi-IN',  name: 'Hindi',               native: 'हिन्दी',         font: 'Noto Sans Devanagari', sample: 'नमस्ते दुनिया' },
  { code: 'ar-SA',  name: 'Arabic',              native: 'العربية',       font: 'Noto Sans Arabic',     sample: 'مرحبا بالعالم' },
  { code: 'zh-CN',  name: 'Chinese (Simplified)',native: '中文 (简体)',    font: 'Noto Sans SC',         sample: '你好世界' },
  { code: 'zh-TW',  name: 'Chinese (Traditional)',native:'中文 (繁體)',   font: 'Noto Sans TC',         sample: '你好世界' },
  { code: 'ja-JP',  name: 'Japanese',            native: '日本語',         font: 'Noto Sans JP',         sample: 'こんにちは' },
  { code: 'ko-KR',  name: 'Korean',              native: '한국어',         font: 'Noto Sans KR',         sample: '안녕하세요' },
  { code: 'fr-FR',  name: 'French',              native: 'Français',      font: 'Noto Sans',            sample: 'Bonjour le monde' },
  { code: 'de-DE',  name: 'German',              native: 'Deutsch',       font: 'Noto Sans',            sample: 'Hallo Welt' },
  { code: 'es-ES',  name: 'Spanish',             native: 'Español',       font: 'Noto Sans',            sample: 'Hola Mundo' },
  { code: 'pt-BR',  name: 'Portuguese',          native: 'Português',     font: 'Noto Sans',            sample: 'Olá Mundo' },
  { code: 'ru-RU',  name: 'Russian',             native: 'Русский',       font: 'Noto Sans',            sample: 'Привет мир' },
  { code: 'th-TH',  name: 'Thai',                native: 'ภาษาไทย',        font: 'Noto Sans Thai',       sample: 'สวัสดีชาวโลก' },
  { code: 'he-IL',  name: 'Hebrew',              native: 'עברית',          font: 'Noto Sans Hebrew',     sample: 'שלום עולם' },
  { code: 'bn-BD',  name: 'Bengali',             native: 'বাংলা',           font: 'Noto Sans Bengali',    sample: 'হ্যালো বিশ্ব' },
  { code: 'ta-IN',  name: 'Tamil',               native: 'தமிழ்',           font: 'Noto Sans Tamil',      sample: 'வணக்கம்' },
  { code: 'te-IN',  name: 'Telugu',              native: 'తెలుగు',          font: 'Noto Sans Telugu',     sample: 'హలో వరల్డ్' },
  { code: 'kn-IN',  name: 'Kannada',             native: 'ಕನ್ನಡ',           font: 'Noto Sans Kannada',    sample: 'ಹಲೋ ವರ್ಲ್ಡ್' },
  { code: 'ml-IN',  name: 'Malayalam',           native: 'മലയാളം',          font: 'Noto Sans Malayalam',  sample: 'ഹലോ വേൾഡ്' },
  { code: 'gu-IN',  name: 'Gujarati',            native: 'ગુજરાતી',          font: 'Noto Sans Gujarati',   sample: 'હેલો વર્લ્ડ' },
  { code: 'pa-IN',  name: 'Punjabi',             native: 'ਪੰਜਾਬੀ',           font: 'Noto Sans Gurmukhi',   sample: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' },
  { code: 'mr-IN',  name: 'Marathi',             native: 'मराठी',           font: 'Noto Sans Devanagari', sample: 'नमस्कार जग' },
  { code: 'ur-PK',  name: 'Urdu',               native: 'اردو',            font: 'Noto Sans Arabic',     sample: 'ہیلو دنیا' },
  { code: 'tr-TR',  name: 'Turkish',             native: 'Türkçe',         font: 'Noto Sans',            sample: 'Merhaba Dünya' },
  { code: 'it-IT',  name: 'Italian',             native: 'Italiano',       font: 'Noto Sans',            sample: 'Ciao Mondo' },
  { code: 'pl-PL',  name: 'Polish',              native: 'Polski',         font: 'Noto Sans',            sample: 'Witaj Świecie' },
  { code: 'nl-NL',  name: 'Dutch',               native: 'Nederlands',     font: 'Noto Sans',            sample: 'Hallo Wereld' },
  { code: 'sv-SE',  name: 'Swedish',             native: 'Svenska',        font: 'Noto Sans',            sample: 'Hej Världen' },
  { code: 'fi-FI',  name: 'Finnish',             native: 'Suomi',          font: 'Noto Sans',            sample: 'Hei Maailma' },
  { code: 'el-GR',  name: 'Greek',               native: 'Ελληνικά',       font: 'Noto Sans',            sample: 'Γεια σου κόσμε' },
  { code: 'uk-UA',  name: 'Ukrainian',           native: 'Українська',     font: 'Noto Sans',            sample: 'Привіт Світ' },
  { code: 'vi-VN',  name: 'Vietnamese',          native: 'Tiếng Việt',     font: 'Noto Sans',            sample: 'Xin chào thế giới' },
  { code: 'id-ID',  name: 'Indonesian',          native: 'Indonesia',      font: 'Noto Sans',            sample: 'Halo Dunia' },
  { code: 'ms-MY',  name: 'Malay',               native: 'Melayu',         font: 'Noto Sans',            sample: 'Helo Dunia' },
  { code: 'am-ET',  name: 'Amharic',             native: 'አማርኛ',            font: 'Noto Sans Ethiopic',   sample: 'ሰላም ዓለም' },
  { code: 'ka-GE',  name: 'Georgian',            native: 'ქართული',         font: 'Noto Sans Georgian',   sample: 'გამარჯობა სამყარო' },
  { code: 'hy-AM',  name: 'Armenian',            native: 'Հայերեն',         font: 'Noto Sans Armenian',   sample: 'Բարեւ աշխարհ' },
];

// ── Stroke widths ─────────────────────────────────────────────────────────────
const WIDTHS = [1, 2, 4, 8];

export default function Toolbar({
  undo, redo, clear, insertImage,
  insertTableAtCenter, applyFillToSelection, applyStrokeToSelection,
}: Props) {
  const store = useCanvasStore();
  const { activeTool, setTool } = store;

  // Which flyout panel is open
  const [openPanel, setOpenPanel] = useState<
    'shapes' | 'text' | 'stroke' | 'fill' | 'table' | 'sticky' | null
  >(null);

  // Mic recording state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Language search filter
  const [langSearch, setLangSearch] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const togglePanel = (name: typeof openPanel) =>
    setOpenPanel((prev) => (prev === name ? null : name));

  const pick = (tool: Tool) => { setTool(tool); setOpenPanel(null); };

  const isShapeTool = [...BASIC_SHAPES, ...EXT_SHAPES].some((s) => s.id === activeTool);

  // ── Mic / speech-to-text ───────────────────────────────────────────────────
  function toggleMic() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // Use the currently selected language for speech recognition
    const selectedLang = LANGUAGES.find((l) => l.code === store.textLang) ?? LANGUAGES[0];
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = selectedLang.code;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      // Paste transcript into the active IText on the canvas, or store it for next placement
      const canvasEl = document.querySelector('canvas') as any;
      // Dispatch a custom event the canvas hook can listen to
      window.dispatchEvent(new CustomEvent('mic:transcript', { detail: transcript }));
    };
    rec.onerror = () => setIsListening(false);
    rec.onend  = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
    // Activate text tool automatically
    setTool('text');
  }

  return (
    <div className="relative flex" ref={panelRef}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-0.5 overflow-y-auto z-10 select-none">

        {/* Draw tools */}
        <SectionLabel>Draw</SectionLabel>
        {DRAW_TOOLS.map((t) => (
          <ToolBtn key={t.id} active={activeTool === t.id} title={t.label}
            onClick={() => pick(t.id)}>{t.icon}</ToolBtn>
        ))}

        <Sep />

        {/* Shapes */}
        <SectionLabel>Shapes</SectionLabel>
        <ToolBtn
          active={isShapeTool || openPanel === 'shapes'}
          title="Shapes"
          onClick={() => togglePanel('shapes')}
        >
          ◻
        </ToolBtn>

        <Sep />

        {/* Content */}
        <SectionLabel>Insert</SectionLabel>
        {CONTENT_TOOLS.map((t) => (
          <ToolBtn
            key={t.id}
            active={
              activeTool === t.id ||
              (t.id === 'table'  && openPanel === 'table') ||
              (t.id === 'sticky' && openPanel === 'sticky') ||
              (t.id === 'text'   && openPanel === 'text')
            }
            title={t.label}
            onClick={() => {
              if (t.id === 'table')  togglePanel('table');
              else if (t.id === 'sticky') togglePanel('sticky');
              else if (t.id === 'text')   togglePanel('text');
              else pick(t.id);
            }}
          >
            {t.icon}
          </ToolBtn>
        ))}
        {/* Mic button */}
        <ToolBtn
          title={isListening ? 'Stop listening' : 'Voice to text (mic)'}
          onClick={toggleMic}
          className={isListening ? 'text-red-500 animate-pulse' : ''}
        >
          🎤
        </ToolBtn>
        <ToolBtn title="Insert Image" onClick={insertImage}>🖼️</ToolBtn>

        <Sep />

        {/* Stroke */}
        <SectionLabel>Stroke</SectionLabel>
        <button
          title="Stroke colour & width"
          className="w-9 h-9 rounded-lg border-2 border-gray-200 hover:scale-110 transition-transform"
          style={{ background: store.strokeColor }}
          onClick={() => togglePanel('stroke')}
        />

        {/* Fill */}
        <SectionLabel>Fill</SectionLabel>
        <button
          title="Fill colour"
          className="w-9 h-9 rounded-lg border-2 border-gray-200 hover:scale-110 transition-transform relative"
          style={{
            background: store.fillColor === 'transparent'
              ? 'repeating-linear-gradient(45deg,#ddd 0 2px,#fff 2px 6px)'
              : store.fillColor,
          }}
          onClick={() => togglePanel('fill')}
        />

        <Sep />

        {/* Undo / Redo / Clear */}
        <ToolBtn title="Undo (Ctrl+Z)" disabled={!store.canUndo} onClick={undo}>↩</ToolBtn>
        <ToolBtn title="Redo (Ctrl+Y)" disabled={!store.canRedo} onClick={redo}>↪</ToolBtn>
        <ToolBtn title="Clear canvas" className="text-red-400 hover:text-red-600"
          onClick={() => { if (confirm('Clear the entire canvas?')) clear(); }}>🗑️</ToolBtn>

      </aside>

      {/* ── Flyout Panels ────────────────────────────────────────────────── */}
      {openPanel && (
        <div className="absolute left-14 top-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[220px] max-h-[calc(100vh-80px)] overflow-y-auto">

          {/* SHAPES PANEL */}
          {openPanel === 'shapes' && (
            <div>
              <PanelTitle>Basic Shapes</PanelTitle>
              <div className="grid grid-cols-3 gap-1 mb-3">
                {BASIC_SHAPES.map((s) => (
                  <ShapeBtn key={s.id} label={s.label} icon={s.icon}
                    active={activeTool === s.id}
                    onClick={() => pick(s.id)} />
                ))}
              </div>
              <PanelTitle>Extended Shapes</PanelTitle>
              <div className="grid grid-cols-3 gap-1">
                {EXT_SHAPES.map((s) => (
                  <ShapeBtn key={s.id} label={s.label} icon={s.icon}
                    active={activeTool === s.id}
                    onClick={() => pick(s.id)} />
                ))}
              </div>
            </div>
          )}

          {/* TEXT PANEL */}
          {openPanel === 'text' && (
            <div className="w-64">
              <div className="flex items-center justify-between mb-2">
                <PanelTitle>Text Options</PanelTitle>
                <button
                  title={isListening ? 'Stop mic' : 'Voice to text'}
                  onClick={toggleMic}
                  className={`text-sm px-2 py-1 rounded-lg border transition-colors ${
                    isListening
                      ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {isListening ? '⏹ Stop' : '🎤 Mic'}
                </button>
              </div>

              {/* Colour */}
              <PanelTitle>Text Colour</PanelTitle>
              <div className="grid grid-cols-5 gap-1.5 mb-1">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => store.setTextColor(c)}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110
                      ${store.textColor === c ? 'border-blue-500 scale-110' : 'border-gray-200'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer mb-3">
                Custom
                <input type="color" className="w-6 h-6 cursor-pointer rounded"
                  value={store.textColor}
                  onChange={(e) => store.setTextColor(e.target.value)} />
              </label>

              {/* Font family */}
              <PanelTitle>Font</PanelTitle>
              <div className="flex flex-col gap-1 mb-3">
                {FONTS.map((f) => (
                  <button
                    key={f}
                    onClick={() => store.setFontFamily(f)}
                    className={`text-left px-2 py-1 rounded-lg text-sm border transition-colors
                      ${store.fontFamily === f
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'border-gray-100 hover:bg-gray-50 text-gray-700'}`}
                    style={{ fontFamily: f === 'Inter' ? 'Arial, sans-serif' : f }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Font size */}
              <PanelTitle>Size</PanelTitle>
              <div className="flex flex-wrap gap-1 mb-3">
                {FONT_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => store.setFontSize(s)}
                    className={`w-9 h-7 text-xs rounded border transition-colors
                      ${store.fontSize === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Style toggles */}
              <PanelTitle>Style</PanelTitle>
              <div className="flex gap-2 mb-3">
                {([
                  { label: 'B', title: 'Bold',      active: store.bold,      toggle: () => store.setBold(!store.bold),           style: { fontWeight: 'bold' } },
                  { label: 'I', title: 'Italic',    active: store.italic,    toggle: () => store.setItalic(!store.italic),       style: { fontStyle: 'italic' } },
                  { label: 'U', title: 'Underline', active: store.underline, toggle: () => store.setUnderline(!store.underline), style: { textDecoration: 'underline' } },
                ] as const).map(({ label, title, active, toggle, style }) => (
                  <button
                    key={label}
                    title={title}
                    onClick={toggle}
                    className={`w-9 h-9 rounded-lg border-2 text-sm font-semibold transition-colors
                      ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    style={style as React.CSSProperties}
                  >
                    {label}
                  </button>
                ))}

                {/* Text align */}
                {(['left','center','right'] as const).map((a) => (
                  <button
                    key={a}
                    title={`Align ${a}`}
                    onClick={() => store.setTextAlign(a)}
                    className={`w-9 h-9 rounded-lg border-2 text-sm transition-colors
                      ${store.textAlign === a ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                  </button>
                ))}
              </div>

              {/* Language / Script */}
              <PanelTitle>Language & Script</PanelTitle>
              <input
                type="text"
                placeholder="Search language…"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 mb-3 pr-0.5">
                {LANGUAGES.filter((l) =>
                  l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
                  l.native.includes(langSearch)
                ).map((l) => {
                  const active = store.textLang === l.code;
                  return (
                    <button
                      key={l.code}
                      title={l.sample}
                      onClick={() => {
                        store.setTextLang(l.code);
                        store.setFontFamily(l.font);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs border transition-colors text-left
                        ${active
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'border-gray-100 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {/* Native script preview */}
                      <span
                        className="w-20 shrink-0 text-sm leading-tight"
                        style={{ fontFamily: l.font }}
                      >
                        {l.native}
                      </span>
                      <span className="text-gray-400 truncate">{l.name}</span>
                      {active && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Preview of selected language sample */}
              {(() => {
                const sel = LANGUAGES.find((l) => l.code === store.textLang);
                return sel ? (
                  <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 mb-1">Preview</p>
                    <p style={{ fontFamily: sel.font, fontSize: store.fontSize }}>{sel.sample}</p>
                  </div>
                ) : null;
              })()}

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg"
                onClick={() => pick('text')}
              >
                T  Place Text
              </button>
            </div>
          )}

          {/* STICKY COLOUR PANEL */}
          {openPanel === 'sticky' && (
            <div>
              <PanelTitle>Sticky Note Colour</PanelTitle>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {STICKY_COLORS.map(({ hex, label }) => (
                  <button
                    key={hex}
                    title={label}
                    onClick={() => { store.setStickyColor(hex); pick('sticky'); }}
                    className={`w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center
                      ${store.stickyColor === hex ? 'border-blue-500 scale-110' : 'border-gray-200'}`}
                    style={{ background: hex }}
                  >
                    {store.stickyColor === hex && (
                      <span style={{ fontSize: 14, color: hex === '#ffffff' || hex === '#f1f5f9' ? '#374151' : '#374151' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer mb-3">
                Custom colour
                <input
                  type="color"
                  className="w-6 h-6 cursor-pointer rounded"
                  value={store.stickyColor}
                  onChange={(e) => store.setStickyColor(e.target.value)}
                />
              </label>
              <button
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-sm font-medium py-2 rounded-lg"
                onClick={() => pick('sticky')}
              >
                📌 Place Sticky Note
              </button>
            </div>
          )}

          {/* TABLE PANEL */}
          {openPanel === 'table' && (
            <div>
              <PanelTitle>Insert Table</PanelTitle>
              <TablePicker
                rows={store.tableRows}
                cols={store.tableCols}
                headers={store.tableHeaders}
                setRows={store.setTableRows}
                setCols={store.setTableCols}
                setHeaders={store.setTableHeaders}
                onInsert={() => { insertTableAtCenter(); setOpenPanel(null); }}
              />
            </div>
          )}

          {/* STROKE PANEL */}
          {openPanel === 'stroke' && (
            <div>
              <PanelTitle>Stroke Colour</PanelTitle>
              <ColorGrid
                colors={STROKE_COLORS}
                active={store.strokeColor}
                onPick={(c) => { store.setStrokeColor(c); applyStrokeToSelection(c); }}
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                Custom
                <input type="color" className="w-6 h-6 cursor-pointer rounded"
                  value={store.strokeColor}
                  onChange={(e) => { store.setStrokeColor(e.target.value); applyStrokeToSelection(e.target.value); }} />
              </label>

              <PanelTitle className="mt-3">Stroke Width</PanelTitle>
              <div className="flex gap-2 mt-1">
                {WIDTHS.map((w) => (
                  <button
                    key={w}
                    title={`${w}px`}
                    onClick={() => store.setStrokeWidth(w)}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border ${
                      store.strokeWidth === w
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="rounded-full bg-gray-800"
                      style={{ width: w * 3 + 4, height: w }} />
                  </button>
                ))}
              </div>

              <PanelTitle className="mt-3">Opacity</PanelTitle>
              <input type="range" min={0.1} max={1} step={0.05}
                className="w-full mt-1"
                value={store.opacity}
                onChange={(e) => store.setOpacity(parseFloat(e.target.value))} />
              <p className="text-xs text-gray-400 text-right">{Math.round(store.opacity * 100)}%</p>
            </div>
          )}

          {/* FILL PANEL */}
          {openPanel === 'fill' && (
            <div>
              <PanelTitle>Fill Colour</PanelTitle>
              <ColorGrid
                colors={FILL_COLORS}
                active={store.fillColor}
                onPick={(c) => { store.setFillColor(c); applyFillToSelection(c); }}
                transparent
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                Custom
                <input type="color" className="w-6 h-6 cursor-pointer rounded"
                  value={store.fillColor === 'transparent' ? '#ffffff' : store.fillColor}
                  onChange={(e) => { store.setFillColor(e.target.value); applyFillToSelection(e.target.value); }} />
              </label>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mt-1.5 mb-0.5">
      {children}
    </p>
  );
}

function Sep() {
  return <div className="w-8 border-t border-gray-100 my-1.5" />;
}

function ToolBtn({
  children, active, disabled, title, onClick, className = '',
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors
        ${active
          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
          : 'hover:bg-gray-100 text-gray-600'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
        ${className}`}
    >
      {children}
    </button>
  );
}

function PanelTitle({ children, className = '' }: { children: string; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 ${className}`}>
      {children}
    </p>
  );
}

function ShapeBtn({
  icon, label, active, onClick,
}: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg text-xl border transition-colors
        ${active ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-100 hover:bg-gray-50 text-gray-700'}`}
    >
      {icon}
      <span className="text-[9px] text-gray-400 leading-none">{label}</span>
    </button>
  );
}

function ColorGrid({
  colors, active, onPick, transparent = false,
}: {
  colors: string[];
  active: string;
  onPick: (c: string) => void;
  transparent?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          title={c === 'transparent' ? 'No fill' : c}
          onClick={() => onPick(c)}
          className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110
            ${active === c ? 'border-blue-500 scale-110' : 'border-gray-200'}`}
          style={{
            background: c === 'transparent'
              ? 'repeating-linear-gradient(45deg,#ddd 0 2px,#fff 2px 6px)'
              : c,
          }}
        />
      ))}
    </div>
  );
}

function TablePicker({
  rows, cols, headers, setRows, setCols, setHeaders, onInsert,
}: {
  rows: number; cols: number; headers: string[];
  setRows: (r: number) => void;
  setCols: (c: number) => void;
  setHeaders: (h: string[]) => void;
  onInsert: () => void;
}) {
  const [hover, setHover] = useState({ r: rows, c: cols });
  const MAX = 8;

  // Keep headers array in sync when cols changes
  function handleColsChange(newCols: number) {
    setCols(newCols);
    const next = Array.from({ length: newCols }, (_, i) => headers[i] ?? `Column ${i + 1}`);
    setHeaders(next);
  }

  function handleHeaderChange(i: number, value: string) {
    const next = [...headers];
    next[i] = value;
    setHeaders(next);
  }

  return (
    <div>
      {/* Visual grid picker */}
      <div className="mb-3">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${MAX}, 1fr)` }}>
          {Array.from({ length: MAX * MAX }, (_, i) => {
            const r = Math.floor(i / MAX) + 1;
            const c = (i % MAX) + 1;
            const filled = r <= hover.r && c <= hover.c;
            return (
              <div
                key={i}
                className={`w-5 h-5 border rounded-sm cursor-pointer transition-colors ${
                  filled ? 'bg-blue-400 border-blue-500' : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                }`}
                onMouseEnter={() => setHover({ r, c })}
                onClick={() => { setRows(hover.r); handleColsChange(hover.c); }}
              />
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center">
          {hover.r} × {hover.c} table
        </p>
      </div>

      {/* Manual row/col inputs */}
      <div className="flex gap-2 items-center mb-3">
        <div className="flex-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Rows</label>
          <input type="number" min={1} max={20} value={rows}
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
            onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Cols</label>
          <input type="number" min={1} max={20} value={cols}
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
            onChange={(e) => handleColsChange(Math.max(1, parseInt(e.target.value) || 1))} />
        </div>
      </div>

      {/* Editable header labels */}
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
        Header labels
      </p>
      <div className="space-y-1.5 mb-3">
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: '#3b82f6' }}
            >
              {i + 1}
            </span>
            <input
              className="flex-1 border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              value={headers[i] ?? `Column ${i + 1}`}
              placeholder={`Column ${i + 1}`}
              onChange={(e) => handleHeaderChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg"
        onClick={onInsert}
      >
        Insert {rows} × {cols} Table
      </button>
    </div>
  );
}
