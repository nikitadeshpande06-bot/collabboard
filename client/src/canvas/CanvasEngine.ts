import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import type { DrawOperation } from '../types';
import { useCanvasStore, type Tool } from '@/store/canvasStore';

export type { Tool };

const HISTORY_LIMIT = 50;

export interface CanvasEngineOptions {
  canvasElementId: string;
  roomId:   string;
  userId:   string;
  userName: string;
  onOperation: (op: DrawOperation) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a regular polygon path (triangle, hexagon, etc.) */
function regularPolygon(cx: number, cy: number, r: number, sides: number): string {
  const pts = Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

/** Build a 5-pointed star path */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r     = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / 5 - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

/** Build an arrow path pointing right */
function arrowPath(x: number, y: number, w = 160, h = 60): string {
  const shaft = h * 0.35;
  const head  = w * 0.35;
  return [
    `M ${x},${y + (h - shaft) / 2}`,
    `L ${x + w - head},${y + (h - shaft) / 2}`,
    `L ${x + w - head},${y}`,
    `L ${x + w},${y + h / 2}`,
    `L ${x + w - head},${y + h}`,
    `L ${x + w - head},${y + (h + shaft) / 2}`,
    `L ${x},${y + (h + shaft) / 2}`,
    'Z',
  ].join(' ');
}

/** Build a speech-bubble path */
function speechPath(x: number, y: number, w = 180, h = 100): string {
  const r  = 12;
  const tx = x + w * 0.2;
  const ty = y + h;
  return [
    `M ${x + r},${y}`,
    `L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r}`,
    `L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h}`,
    `L ${tx + 18},${y + h}`,
    `L ${tx},${ty + 28}`,
    `L ${tx + 10},${y + h}`,
    `L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r}`,
    `L ${x},${y + r} Q ${x},${y} ${x + r},${y}`,
    'Z',
  ].join(' ');
}

// ── Engine ────────────────────────────────────────────────────────────────────
export class CanvasEngine {
  private fc: fabric.Canvas;
  private roomId:   string;
  private userId:   string;
  private userName: string;
  private onOperation: (op: DrawOperation) => void;
  private vectorClock: Record<string, number> = {};
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private isReplaying = false;
  private clipboard: fabric.Object[] = [];   // cut/copy buffer

  /** Expose canvas instance so hooks can attach extra listeners */
  get fabricCanvas(): fabric.Canvas { return this.fc; }

  constructor(opts: CanvasEngineOptions) {
    this.roomId      = opts.roomId;
    this.userId      = opts.userId;
    this.userName    = opts.userName;
    this.onOperation = opts.onOperation;

    const el = document.getElementById(opts.canvasElementId);
    if (!el) throw new Error(`Canvas element #${opts.canvasElementId} not found in DOM`);

    // Size canvas to its parent container, not to a hardcoded window offset
    const container = el.parentElement ?? document.body;
    const w = container.clientWidth  || window.innerWidth  - 64;
    const h = container.clientHeight || window.innerHeight - 60;

    this.fc = new fabric.Canvas(opts.canvasElementId, {
      width:           w,
      height:          h,
      backgroundColor: '#ffffff',
      selection:       false,
    });

    this.bindFabricEvents();
    this.bindResizeHandler(container);

    // Always start in select mode so the pencil doesn't ghost-drag immediately
    // after sign-in (the store may still hold 'pencil' from a previous session).
    useCanvasStore.getState().setTool('select');
    this.applyTool('select');

    // Cancel any lingering Fabric drawing state when the mouse is released
    // anywhere in the window (handles sign-in click → canvas navigation edge case).
    window.addEventListener('mouseup', this._onWindowMouseUp);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  loadFromJSON(json: string): Promise<void> {
    return new Promise((resolve) => {
      this.fc.loadFromJSON(JSON.parse(json), () => {
        this.fc.renderAll();
        this.snapshotHistory();
        // Re-apply the current tool so object selectability / drawing mode
        // is consistent after the canvas is replaced (fixes templates).
        this.applyTool(useCanvasStore.getState().activeTool);
        resolve();
      });
    });
  }

  toJSON(): string {
    return JSON.stringify(this.fc.toJSON(['id']));
  }

  applyTool(tool: Tool): void {
    const canvas = this.fc;
    canvas.isDrawingMode = false;
    canvas.selection     = false;
    canvas.discardActiveObject();

    switch (tool) {
      case 'select':
        canvas.selection = true;
        canvas.forEachObject((o) => { o.selectable = true; o.evented = true; });
        break;
      case 'pencil': {
        const { strokeColor, strokeWidth } = useCanvasStore.getState();
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;
      }
      case 'eraser': {
        const { strokeWidth } = useCanvasStore.getState();
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.freeDrawingBrush.width = strokeWidth * 5;
        break;
      }
      default:
        canvas.forEachObject((o) => { o.selectable = false; o.evented = false; });
    }
    canvas.renderAll();
  }

  /** Re-sync brush colour/width without changing tool — called when store changes */
  syncBrush(): void {
    const tool = useCanvasStore.getState().activeTool;
    if (tool !== 'pencil' && tool !== 'eraser') return;
    const { strokeColor, strokeWidth } = useCanvasStore.getState();
    if (!this.fc.freeDrawingBrush) return;
    if (tool === 'pencil') {
      this.fc.freeDrawingBrush.color = strokeColor;
      this.fc.freeDrawingBrush.width = strokeWidth;
    } else {
      this.fc.freeDrawingBrush.width = strokeWidth * 5;
    }
  }

  /** Called on canvas click when a shape/content tool is active */
  addShape(tool: Tool, x: number, y: number): void {
    const { strokeColor, fillColor, strokeWidth, fontSize,
            fontFamily, bold, italic, underline, textAlign, textColor,
            stickyColor, tableRows, tableCols } = useCanvasStore.getState();

    // Resolve the actual CSS font-family string (handles Inter alias and all Noto variants)
    const resolvedFont = fontFamily === 'Inter' ? 'Arial, sans-serif' : fontFamily;

    let obj: fabric.Object | null = null;

    const shapeProps = {
      left: x, top: y,
      fill: fillColor === 'transparent' ? 'rgba(0,0,0,0)' : fillColor,
      stroke: strokeColor,
      strokeWidth,
    };

    switch (tool) {
      // ── Basic ─────────────────────────────────────────────────────────────
      case 'rect':
        obj = new fabric.Rect({ ...shapeProps, width: 140, height: 90, rx: 4, ry: 4 });
        break;

      case 'circle':
        obj = new fabric.Ellipse({ ...shapeProps, rx: 60, ry: 45 });
        break;

      case 'line':
        obj = new fabric.Line([x, y, x + 140, y], { stroke: strokeColor, strokeWidth });
        break;

      // ── Extended shapes ───────────────────────────────────────────────────
      case 'triangle':
        obj = new fabric.Path(regularPolygon(x + 60, y + 60, 60, 3), shapeProps);
        break;

      case 'diamond':
        obj = new fabric.Path(regularPolygon(x + 60, y + 80, 70, 4), shapeProps);
        break;

      case 'hexagon':
        obj = new fabric.Path(regularPolygon(x + 65, y + 65, 65, 6), shapeProps);
        break;

      case 'star':
        obj = new fabric.Path(starPath(x + 60, y + 60, 60, 25), {
          ...shapeProps,
          fill: fillColor === 'transparent' ? '#fbbf24' : fillColor,
        });
        break;

      case 'arrow':
        obj = new fabric.Path(arrowPath(x, y), {
          ...shapeProps,
          fill: fillColor === 'transparent' ? strokeColor : fillColor,
        });
        break;

      case 'speech':
        obj = new fabric.Path(speechPath(x, y), {
          ...shapeProps,
          fill: fillColor === 'transparent' ? '#ffffff' : fillColor,
        });
        break;

      // ── Text ──────────────────────────────────────────────────────────────
      case 'text':
        obj = new fabric.IText('Click to edit', {
          left: x, top: y,
          fontSize,
          fill:       textColor,
          fontFamily: resolvedFont,
          fontWeight: bold   ? 'bold'   : 'normal',
          fontStyle:  italic ? 'italic' : 'normal',
          underline,
          textAlign,
        });
        break;

      // ── Sticky note ───────────────────────────────────────────────────────
      case 'sticky': {
        // Derive a darker border and readable text colour from the background
        const stickyBorder = stickyColor === '#fef08a' ? '#ca8a04'
          : stickyColor === '#bbf7d0' ? '#15803d'
          : stickyColor === '#bfdbfe' ? '#1d4ed8'
          : stickyColor === '#fecaca' ? '#b91c1c'
          : stickyColor === '#e9d5ff' ? '#7e22ce'
          : stickyColor === '#fed7aa' ? '#c2410c'
          : '#64748b';
        const stickyText = stickyColor === '#fef08a' ? '#713f12'
          : stickyColor === '#bbf7d0' ? '#14532d'
          : stickyColor === '#bfdbfe' ? '#1e3a8a'
          : stickyColor === '#fecaca' ? '#7f1d1d'
          : stickyColor === '#e9d5ff' ? '#4c1d95'
          : stickyColor === '#fed7aa' ? '#7c2d12'
          : '#1e293b';
        const bg = new fabric.Rect({
          left: x, top: y, width: 180, height: 150,
          fill: stickyColor, stroke: stickyBorder, strokeWidth: 1, rx: 4, ry: 4,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,.15)', blur: 8, offsetX: 2, offsetY: 4 }),
        });
        const txt = new fabric.IText('Type here…', {
          left: x + 10, top: y + 14,
          fontSize: 14, fill: stickyText,
          fontFamily: 'Arial, sans-serif',
          width: 160,
        });
        (bg  as unknown as { id: string }).id = uuidv4();
        (txt as unknown as { id: string }).id = uuidv4();
        this.fc.add(bg, txt);
        this.fc.renderAll();
        this.emitAdd(bg);
        this.emitAdd(txt);
        this.snapshotHistory();
        this.redoStack = [];
        useCanvasStore.getState().setCanUndo(true);
        return; // early return — already added both objects
      }

      // ── Table ─────────────────────────────────────────────────────────────
      case 'table':
        this.insertTable(x, y, tableRows, tableCols);
        return; // early return — handled internally
    }

    if (obj) {
      (obj as fabric.Object & { id: string }).id = uuidv4();
      this.fc.add(obj);
      this.fc.renderAll();
      this.emitAdd(obj);
      this.snapshotHistory();
      this.redoStack = [];
      useCanvasStore.getState().setCanUndo(true);
      useCanvasStore.getState().setCanRedo(false);
    }
  }

  /**
   * Insert a table as a group of rect + IText cells.
   * Each cell is independently editable via double-click.
   */
  insertTable(x: number, y: number, rows: number, cols: number): void {
    const cellW = 90;
    const cellH = 36;
    const objects: fabric.Object[] = [];
    const { strokeColor } = useCanvasStore.getState();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x + c * cellW;
        const cy = y + r * cellH;

        const isHeader = r === 0;
        const cellBg = isHeader ? '#3b82f6' : (r % 2 === 0 ? '#f7f8fa' : '#ffffff');
        const textFill = isHeader ? '#ffffff' : '#1f2328';

        const cell = new fabric.Rect({
          left: cx, top: cy, width: cellW, height: cellH,
          fill: cellBg, stroke: strokeColor, strokeWidth: 1,
        });

        const label = isHeader
          ? `Header ${c + 1}`
          : `Row ${r}, Col ${c + 1}`;

        const text = new fabric.IText(label, {
          left: cx + 6, top: cy + 8,
          fontSize: 11, fill: textFill,
          fontFamily: 'Arial, sans-serif',
          fontWeight: isHeader ? 'bold' : 'normal',
          width: cellW - 12,
        });

        const cellId  = uuidv4();
        const textId  = uuidv4();
        (cell as unknown as { id: string }).id = cellId;
        (text as unknown as { id: string }).id = textId;

        objects.push(cell, text);
      }
    }

    objects.forEach((o) => this.fc.add(o));
    this.fc.renderAll();
    objects.forEach((o) => this.emitAdd(o));
    this.snapshotHistory();
    this.redoStack = [];
    useCanvasStore.getState().setCanUndo(true);
    useCanvasStore.getState().setCanRedo(false);
  }

  /** Open a file picker and insert the chosen image */
  insertImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        fabric.Image.fromURL(dataUrl, (img) => {
          const maxW = this.fc.getWidth()  * 0.5;
          const maxH = this.fc.getHeight() * 0.5;
          if (img.width!  > maxW) img.scaleToWidth(maxW);
          if (img.height! > maxH) img.scaleToHeight(maxH);

          const vpt    = this.fc.viewportTransform ?? [1,0,0,1,0,0];
          const zoom   = this.fc.getZoom();
          const centreX = (this.fc.getWidth()  / 2 - vpt[4]) / zoom;
          const centreY = (this.fc.getHeight() / 2 - vpt[5]) / zoom;
          img.set({
            left: centreX - img.getScaledWidth()  / 2,
            top:  centreY - img.getScaledHeight() / 2,
          });

          (img as fabric.Image & { id: string }).id = uuidv4();
          this.fc.add(img);
          this.fc.setActiveObject(img);
          this.fc.renderAll();
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /** Apply text formatting to the currently selected IText object */
  applyTextFormat(prop: Partial<{
    fontFamily: string; fontSize: number; fontWeight: string;
    fontStyle: string; underline: boolean; textAlign: string; fill: string;
  }>): void {
    const obj = this.fc.getActiveObject() as fabric.IText | undefined;
    if (!obj || obj.type !== 'i-text') return;
    obj.set(prop as Partial<fabric.IText>);
    this.fc.renderAll();
    this.emitModify(obj);
    this.snapshotHistory();
  }

  undo(): void {
    if (this.undoStack.length < 2) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const previous = this.undoStack[this.undoStack.length - 1];
    this.isReplaying = true;
    this.fc.loadFromJSON(JSON.parse(previous), () => {
      this.fc.renderAll();
      this.isReplaying = false;
      useCanvasStore.getState().setCanUndo(this.undoStack.length > 1);
      useCanvasStore.getState().setCanRedo(this.redoStack.length > 0);
    });
  }

  redo(): void {
    if (!this.redoStack.length) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.isReplaying = true;
    this.fc.loadFromJSON(JSON.parse(next), () => {
      this.fc.renderAll();
      this.isReplaying = false;
      useCanvasStore.getState().setCanUndo(this.undoStack.length > 1);
      useCanvasStore.getState().setCanRedo(this.redoStack.length > 0);
    });
  }

  applyRemoteOperation(op: DrawOperation): void {
    for (const [uid, v] of Object.entries(op.vectorClock)) {
      this.vectorClock[uid] = Math.max(this.vectorClock[uid] ?? 0, v);
    }
    this.isReplaying = true;

    switch (op.type) {
      case 'add':
        fabric.util.enlivenObjects([op.data], (objs: fabric.Object[]) => {
          objs.forEach((o) => {
            (o as fabric.Object & { id: string }).id = op.objectId!;
            this.fc.add(o);
          });
          this.fc.renderAll();
          this.isReplaying = false;
        }, 'fabric');
        break;
      case 'modify': {
        const t = this.findById(op.objectId!);
        if (t) { t.set(op.data as Partial<fabric.Object>); t.setCoords(); this.fc.renderAll(); }
        this.isReplaying = false;
        break;
      }
      case 'remove': {
        const t = this.findById(op.objectId!);
        if (t) this.fc.remove(t);
        this.fc.renderAll();
        this.isReplaying = false;
        break;
      }
      case 'clear':
        this.fc.clear();
        this.fc.backgroundColor = '#ffffff';
        this.fc.renderAll();
        this.isReplaying = false;
        break;
    }
    this.snapshotHistory();
  }

  clearCanvas(): void {
    this.fc.clear();
    this.fc.backgroundColor = '#ffffff';
    this.fc.renderAll();
    this.emitClear();
    this.snapshotHistory();
  }

  // ── Clipboard ────────────────────────────────────────────────────────────────

  /** Returns true if there is an active selection */
  hasSelection(): boolean {
    return !!this.fc.getActiveObject();
  }

  /** Copy selected object(s) into the internal clipboard */
  copy(): void {
    const active = this.fc.getActiveObject();
    if (!active) return;
    // clone preserves all properties including custom `id`
    active.clone((cloned: fabric.Object) => {
      this.clipboard = [cloned];
      // If it's an ActiveSelection (multi-select), clone each sub-object too
      if ((cloned as fabric.ActiveSelection).getObjects) {
        this.clipboard = (cloned as fabric.ActiveSelection).getObjects().map((o) => {
          let c!: fabric.Object;
          o.clone((cc: fabric.Object) => { c = cc; });
          return c;
        });
      }
    });
  }

  /** Cut = copy + delete */
  cut(): void {
    this.copy();
    this.deleteSelected();
  }

  /** Paste clipboard contents, offset by 20px so they don't overlap */
  paste(): void {
    if (!this.clipboard.length) return;
    this.fc.discardActiveObject();
    const pasted: fabric.Object[] = [];

    this.clipboard.forEach((obj) => {
      obj.clone((cloned: fabric.Object) => {
        cloned.set({
          left:    (cloned.left  ?? 0) + 20,
          top:     (cloned.top   ?? 0) + 20,
          evented: true,
        });
        (cloned as fabric.Object & { id: string }).id = uuidv4();
        this.fc.add(cloned);
        pasted.push(cloned);
        this.emitAdd(cloned);
      });
    });

    // Update clipboard to the new positions for repeated pastes
    this.clipboard = pasted;
    this.fc.renderAll();
    this.snapshotHistory();
    this.redoStack = [];
    useCanvasStore.getState().setCanUndo(true);
  }

  /** Delete selected object(s) */
  deleteSelected(): void {
    const active = this.fc.getActiveObject();
    if (!active) return;

    if ((active as fabric.ActiveSelection).getObjects) {
      // Multi-selection
      (active as fabric.ActiveSelection).getObjects().forEach((o) => {
        this.fc.remove(o);
        this.emitRemove(o);
      });
    } else {
      this.fc.remove(active);
      this.emitRemove(active);
    }

    this.fc.discardActiveObject();
    this.fc.renderAll();
    this.snapshotHistory();
    this.redoStack = [];
    useCanvasStore.getState().setCanUndo(true);
  }

  destroy(): void {
    this.fc.dispose();
    window.removeEventListener('mouseup', this._onWindowMouseUp);
  }

  // Bound window-level mouseup so Fabric's internal drawing state is cancelled
  // when the button was pressed outside the canvas (e.g. after a sign-in click).
  private _onWindowMouseUp = () => {
    if (this.fc.isDrawingMode && (this.fc as any)._isCurrentlyDrawing) {
      (this.fc as any)._isCurrentlyDrawing = false;
      this.fc.renderAll();
    }
  };

  // ── Private helpers ─────────────────────────────────────────────────────────

  private findById(id: string): fabric.Object | undefined {
    return this.fc.getObjects().find((o) => (o as fabric.Object & { id: string }).id === id);
  }

  private tick(): Record<string, number> {
    this.vectorClock[this.userId] = (this.vectorClock[this.userId] ?? 0) + 1;
    return { ...this.vectorClock };
  }

  private baseOp(type: DrawOperation['type'], objectId?: string): Omit<DrawOperation, 'data'> {
    return {
      id: uuidv4(), roomId: this.roomId,
      userId: this.userId, userName: this.userName,
      type, objectId,
      timestamp: Date.now(), vectorClock: this.tick(),
    };
  }

  private emitAdd(obj: fabric.Object): void {
    if (this.isReplaying) return;
    const id = (obj as fabric.Object & { id: string }).id ?? uuidv4();
    this.onOperation({ ...this.baseOp('add', id), data: obj.toObject(['id']) });
  }

  private emitModify(obj: fabric.Object): void {
    if (this.isReplaying) return;
    const id = (obj as fabric.Object & { id: string }).id;
    if (!id) return;
    this.onOperation({ ...this.baseOp('modify', id), data: obj.toObject(['id']) });
  }

  private emitRemove(obj: fabric.Object): void {
    if (this.isReplaying) return;
    const id = (obj as fabric.Object & { id: string }).id;
    if (!id) return;
    this.onOperation({ ...this.baseOp('remove', id), data: null });
  }

  private emitClear(): void {
    if (this.isReplaying) return;
    this.onOperation({ ...this.baseOp('clear'), data: null });
  }

  private bindFabricEvents(): void {
    this.fc.on('object:added', (e) => {
      if (!e.target || this.isReplaying) return;
      const obj = e.target as fabric.Object & { id?: string };
      if (!obj.id) {
        obj.id = uuidv4();
        this.emitAdd(obj);
      }
      this.snapshotHistory();
      this.redoStack = [];
      useCanvasStore.getState().setCanUndo(true);
      useCanvasStore.getState().setCanRedo(false);
    });

    this.fc.on('object:modified', (e) => {
      if (!e.target) return;
      this.emitModify(e.target);
      this.snapshotHistory();
    });

    this.fc.on('object:removed', (e) => {
      if (!e.target) return;
      this.emitRemove(e.target);
      this.snapshotHistory();
    });

    // Pan state (side-channel to avoid TS property errors)
    type PanState = { isDragging: boolean; lastPosX: number; lastPosY: number };
    const pan: PanState = { isDragging: false, lastPosX: 0, lastPosY: 0 };

    this.fc.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;
      // Middle-mouse pan
      if (e.button === 1) {
        pan.isDragging = true;
        this.fc.selection = false;
        pan.lastPosX = e.clientX;
        pan.lastPosY = e.clientY;
      }
    });

    this.fc.on('mouse:move', (opt) => {
      if (pan.isDragging) {
        const e = opt.e as MouseEvent;
        const vpt = this.fc.viewportTransform!;
        vpt[4] += e.clientX - pan.lastPosX;
        vpt[5] += e.clientY - pan.lastPosY;
        pan.lastPosX = e.clientX;
        pan.lastPosY = e.clientY;
        this.fc.requestRenderAll();
      }
    });

    this.fc.on('mouse:up', (opt) => {
      const e = opt.e as MouseEvent;
      pan.isDragging = false;
      this.fc.selection = useCanvasStore.getState().activeTool === 'select';

      // ── SHAPE PLACEMENT ──────────────────────────────────────────────────────
      // For all non-draw, non-select, non-pan tools, place a shape on left-click.
      const tool = useCanvasStore.getState().activeTool;
      const shapeTool = !['select','pencil','eraser','pan'].includes(tool);
      if (shapeTool && e.button === 0 && !pan.isDragging) {
        // Convert screen coords → canvas coords (accounting for zoom/pan)
        const pointer = this.fc.getPointer(e);
        this.addShape(tool, pointer.x, pointer.y);
      }
    });

    this.fc.on('mouse:wheel', (opt) => {
      const delta = (opt.e as WheelEvent).deltaY;
      let zoom = this.fc.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.1), 5);
      this.fc.zoomToPoint(
        { x: (opt.e as WheelEvent).offsetX, y: (opt.e as WheelEvent).offsetY }, zoom,
      );
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  private bindResizeHandler(container: HTMLElement): void {
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        this.fc.setWidth(w);
        this.fc.setHeight(h);
        this.fc.renderAll();
      }
    };
    // ResizeObserver fires whenever the container changes size (panel open/close, window resize)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(resize);
      ro.observe(container);
    } else {
      window.addEventListener('resize', resize);
    }
  }

  private snapshotHistory(): void {
    const json = JSON.stringify(this.fc.toJSON(['id']));
    if (this.undoStack[this.undoStack.length - 1] === json) return;
    if (this.undoStack.length >= HISTORY_LIMIT) this.undoStack.shift();
    this.undoStack.push(json);
    useCanvasStore.getState().setCanUndo(this.undoStack.length > 1);
  }
}
