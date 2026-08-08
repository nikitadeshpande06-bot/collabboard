import { create } from 'zustand';

export type Tool =
  | 'select' | 'pencil' | 'eraser' | 'pan'
  // basic shapes
  | 'line' | 'rect' | 'circle'
  // extended shapes
  | 'triangle' | 'star' | 'arrow' | 'diamond' | 'hexagon' | 'speech'
  // content
  | 'text' | 'sticky' | 'table';

export type FontFamily =
  | 'Inter' | 'Georgia' | 'Courier New' | 'Impact' | 'Comic Sans MS' | 'Arial'
  // multilingual Google Fonts
  | 'Noto Sans' | 'Noto Sans Devanagari' | 'Noto Sans Arabic' | 'Noto Sans JP'
  | 'Noto Sans KR' | 'Noto Sans SC' | 'Noto Sans TC' | 'Noto Sans Thai'
  | 'Noto Sans Hebrew' | 'Noto Sans Bengali' | 'Noto Sans Tamil'
  | 'Noto Sans Telugu' | 'Noto Sans Kannada' | 'Noto Sans Malayalam'
  | 'Noto Sans Gujarati' | 'Noto Sans Gurmukhi' | 'Noto Sans Ethiopic'
  | 'Noto Sans Georgian' | 'Noto Sans Armenian' | 'Noto Serif'
  | 'Roboto' | 'Lato' | 'Montserrat' | 'Playfair Display' | 'Dancing Script';
export type TextAlign  = 'left' | 'center' | 'right';

interface CanvasState {
  activeTool: Tool;

  // stroke / fill
  strokeColor: string;
  fillColor:   string;
  strokeWidth: number;
  opacity:     number;

  // text formatting
  fontFamily:  FontFamily;
  fontSize:    number;
  bold:        boolean;
  italic:      boolean;
  underline:   boolean;
  textAlign:   TextAlign;
  textColor:   string;
  textLang:    string;

  // sticky note colour
  stickyColor: string;

  // table defaults
  tableRows: number;
  tableCols: number;

  // history state
  canUndo: boolean;
  canRedo: boolean;

  // setters
  setTool:         (t: Tool) => void;
  setStrokeColor:  (c: string) => void;
  setFillColor:    (c: string) => void;
  setStrokeWidth:  (w: number) => void;
  setOpacity:      (o: number) => void;
  setFontFamily:   (f: FontFamily) => void;
  setFontSize:     (s: number) => void;
  setBold:         (v: boolean) => void;
  setItalic:       (v: boolean) => void;
  setUnderline:    (v: boolean) => void;
  setTextAlign:    (a: TextAlign) => void;
  setTextColor:    (c: string) => void;
  setTextLang:     (l: string) => void;
  setStickyColor:  (c: string) => void;
  setTableRows:    (r: number) => void;
  setTableCols:    (c: number) => void;
  setCanUndo:      (v: boolean) => void;
  setCanRedo:      (v: boolean) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  activeTool:  'pencil',
  strokeColor: '#1f2328',
  fillColor:   'transparent',
  strokeWidth: 2,
  opacity:     1,

  fontFamily:  'Inter',
  fontSize:    18,
  bold:        false,
  italic:      false,
  underline:   false,
  textAlign:   'left',
  textColor:   '#1f2328',
  textLang:    'en',

  stickyColor: '#fef08a',
  tableRows: 3,
  tableCols: 3,

  canUndo: false,
  canRedo: false,

  setTool:        (activeTool)  => set({ activeTool }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor:   (fillColor)   => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setOpacity:     (opacity)     => set({ opacity }),
  setFontFamily:  (fontFamily)  => set({ fontFamily }),
  setFontSize:    (fontSize)    => set({ fontSize }),
  setBold:        (bold)        => set({ bold }),
  setItalic:      (italic)      => set({ italic }),
  setUnderline:   (underline)   => set({ underline }),
  setTextAlign:   (textAlign)   => set({ textAlign }),
  setTextColor:    (textColor)   => set({ textColor }),
  setTextLang:     (textLang)    => set({ textLang }),
  setStickyColor:  (stickyColor) => set({ stickyColor }),
  setTableRows:    (tableRows)   => set({ tableRows }),
  setTableCols:    (tableCols)   => set({ tableCols }),
  setCanUndo:     (canUndo)     => set({ canUndo }),
  setCanRedo:     (canRedo)     => set({ canRedo }),
}));
