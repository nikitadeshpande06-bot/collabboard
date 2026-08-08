import { useEffect, useRef, useCallback } from 'react';
import { CanvasEngine } from '@/canvas/CanvasEngine';
import { useCanvasStore } from '@/store/canvasStore';
import { emitDrawOperation, emitCanvasSave, getSocket } from '@/services/socket';
import { enqueueOperation } from '@/offline/queue';
import { useNetworkStatus } from './useNetworkStatus';
import type { DrawOperation } from '@/types';
import { fabric } from 'fabric';

/**
 * useWhiteboardCanvas
 *
 * Manages the CanvasEngine lifecycle for a single room session.
 * – Creates the engine on mount, destroys it on unmount.
 * – Routes local operations to socket (or offline queue).
 * – Listens to incoming socket events and applies them to the canvas.
 * – Auto-saves the full canvas to the server every 30 s.
 */
export function useWhiteboardCanvas(
  canvasId: string,
  roomId: string,
  userId: string,
  userName: string,
  initialCanvasData?: string,
  onTextSelected?: (selected: boolean) => void,
) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const { isOnline } = useNetworkStatus();
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const { activeTool } = useCanvasStore();

  // ── Create engine once ──────────────────────────────────────────────────────
  useEffect(() => {
    const engine = new CanvasEngine({
      canvasElementId: canvasId,
      roomId,
      userId,
      userName,
      onOperation: handleLocalOp,
    });

    engineRef.current = engine;

    if (initialCanvasData) {
      engine.loadFromJSON(initialCanvasData, true);
    }

    // Detect text selection to show/hide TextFormatBar
    if (onTextSelected) {
      const fc = engine.fabricCanvas;
      const showBar = () => {
        const obj = fc.getActiveObject();
        onTextSelected(!!obj && (obj.type === 'i-text' || obj.type === 'textbox'));
      };
      const hideBar = () => onTextSelected(false);
      fc.on('selection:created', showBar);
      fc.on('selection:updated', showBar);
      fc.on('selection:cleared', hideBar);
    }

    return () => { engine.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Tool sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.applyTool(activeTool);
  }, [activeTool]);

  // ── Brush colour / width live sync ──────────────────────────────────────────
  // When the user picks a new stroke colour or width while pencil/eraser is
  // already active, re-apply immediately without switching tools.
  const { strokeColor, strokeWidth } = useCanvasStore();
  useEffect(() => {
    engineRef.current?.syncBrush();
  }, [strokeColor, strokeWidth]);

  // ── Local op handler ────────────────────────────────────────────────────────
  function handleLocalOp(op: DrawOperation): void {
    if (isOnlineRef.current) {
      emitDrawOperation(op);
    } else {
      enqueueOperation(op);
    }
  }

  // ── Remote op listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return; // socket not yet initialised — WhiteboardPage will re-run initSocket

    const handleRemote = (op: DrawOperation) => {
      if (op.userId === userId) return; // ignore own echoes
      engineRef.current?.applyRemoteOperation(op);
    };

    const handleCanvasInit = ({ canvasData }: { canvasData: string }) => {
      engineRef.current?.loadFromJSON(canvasData, true);
    };

    socket.on('draw:operation', handleRemote);
    socket.on('room:canvas_init', handleCanvasInit);

    return () => {
      socket.off('draw:operation', handleRemote);
      socket.off('room:canvas_init', handleCanvasInit);
    };
  }, [userId]);

  // ── Mic transcript listener ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const transcript = (e as CustomEvent<string>).detail;
      const engine = engineRef.current;
      if (!engine) return;
      const fc = engine.fabricCanvas;
      const active = fc.getActiveObject();
      // If a text object is active and in editing mode, insert at cursor
      if (active && (active.type === 'i-text' || active.type === 'textbox')) {
        const itext = active as fabric.IText;
        if (itext.isEditing) {
          itext.insertChars(transcript);
          fc.renderAll();
          return;
        }
      }
      // Otherwise set its text to the transcript (or create a new IText)
      if (active && (active.type === 'i-text' || active.type === 'textbox')) {
        (active as fabric.IText).set('text', transcript);
        fc.renderAll();
      } else {
        // Place a new text in the centre of the canvas
        const { width = 800, height = 600 } = fc;
        const { fontSize, fontFamily, textColor } = useCanvasStore.getState();
        const txt = new fabric.IText(transcript, {
          left: width / 2 - 100, top: height / 2 - 20,
          fontSize, fill: textColor,
          fontFamily: fontFamily === 'Inter' ? 'Arial, sans-serif' : fontFamily,
        });
        (txt as any).id = crypto.randomUUID();
        fc.add(txt);
        fc.setActiveObject(txt);
        fc.renderAll();
      }
    };
    window.addEventListener('mic:transcript', handler);
    return () => window.removeEventListener('mic:transcript', handler);
  }, []);

  // ── Auto-save to server every 30 s ─────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (!engineRef.current || !isOnlineRef.current) return;
      emitCanvasSave(roomId, engineRef.current.toJSON());
    }, 30_000);
    return () => clearInterval(timer);
  }, [roomId]);

  // ── Exposed actions ─────────────────────────────────────────────────────────
  const undo               = useCallback(() => engineRef.current?.undo(),                []);
  const redo               = useCallback(() => engineRef.current?.redo(),                []);
  const clear              = useCallback(() => engineRef.current?.clearCanvas(),          []);
  const toJSON             = useCallback(() => engineRef.current?.toJSON() ?? '{}',       []);
  const insertImage        = useCallback(() => engineRef.current?.insertImage(),          []);
  const copy               = useCallback(() => engineRef.current?.copy(),                []);
  const cut                = useCallback(() => engineRef.current?.cut(),                 []);
  const paste              = useCallback(() => engineRef.current?.paste(),               []);
  const deleteSelected     = useCallback(() => engineRef.current?.deleteSelected(),      []);
  const hasSelection       = useCallback(() => engineRef.current?.hasSelection() ?? false, []);
  const insertTableAtCenter= useCallback(() => engineRef.current?.insertTableAtCenter(), []);
  const applyFillToSelection  = useCallback((c: string) => engineRef.current?.applyFillToSelection(c),  []);
  const applyStrokeToSelection= useCallback((c: string) => engineRef.current?.applyStrokeToSelection(c),[]);

  return {
    undo, redo, clear, toJSON, insertImage, engineRef,
    copy, cut, paste, deleteSelected, hasSelection,
    insertTableAtCenter, applyFillToSelection, applyStrokeToSelection,
  };
}
