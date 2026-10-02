import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Eraser, Pencil, Redo2, Square, Undo2, X, Check, Minus } from "lucide-react";

type SketchTool = "pen" | "line" | "rect" | "eraser";
type Point = { x: number; y: number };

interface Props {
  source: string;
  name: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

const tools: Array<{ id: SketchTool; label: string; icon: typeof Pencil }> = [
  { id: "pen", label: "画笔", icon: Pencil },
  { id: "line", label: "直线", icon: Minus },
  { id: "rect", label: "矩形", icon: Square },
  { id: "eraser", label: "橡皮擦", icon: Eraser },
];

export function ImageSketchCanvas({ source, name, onCancel, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const startRef = useRef<Point | null>(null);
  const [tool, setTool] = useState<SketchTool>("pen");
  const [color, setColor] = useState("#b8d957");
  const [size, setSize] = useState(6);
  const [ready, setReady] = useState(false);
  const [, refreshHistory] = useState(0);

  const snapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) historyRef.current.push(canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height));
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")!.drawImage(image, 0, 0);
      historyRef.current = [canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)];
      redoRef.current = [];
      setReady(true);
    };
    image.src = source;
  }, [source]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  };

  function begin(event: PointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    snapshot();
    redoRef.current = [];
    refreshHistory((value) => value + 1);
    startRef.current = pointFromEvent(event);
    const context = canvasRef.current!.getContext("2d")!;
    context.beginPath();
    context.moveTo(startRef.current.x, startRef.current.y);
    context.strokeStyle = tool === "eraser" ? "#000" : color;
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.lineWidth = size;
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    const start = startRef.current;
    const canvas = canvasRef.current;
    if (!start || !canvas) return;
    const context = canvas.getContext("2d")!;
    const point = pointFromEvent(event);
    if (tool === "pen" || tool === "eraser") {
      context.lineTo(point.x, point.y);
      context.stroke();
      return;
    }
    const previous = historyRef.current[historyRef.current.length - 1];
    if (previous) context.putImageData(previous, 0, 0);
    context.beginPath();
    context.strokeStyle = color;
    context.globalCompositeOperation = "source-over";
    if (tool === "line") { context.moveTo(start.x, start.y); context.lineTo(point.x, point.y); }
    else context.strokeRect(start.x, start.y, point.x - start.x, point.y - start.y);
    context.stroke();
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    if (!startRef.current) return;
    startRef.current = null;
    canvasRef.current?.releasePointerCapture(event.pointerId);
    const context = canvasRef.current?.getContext("2d");
    if (context) context.globalCompositeOperation = "source-over";
  }

  function undo() {
    const canvas = canvasRef.current;
    const previous = historyRef.current.pop();
    if (!canvas || !previous || historyRef.current.length === 0) return;
    redoRef.current.push(previous);
    canvas.getContext("2d")!.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
    refreshHistory((value) => value + 1);
  }

  function redo() {
    const canvas = canvasRef.current;
    const next = redoRef.current.pop();
    if (!canvas || !next) return;
    historyRef.current.push(next);
    canvas.getContext("2d")!.putImageData(next, 0, 0);
    refreshHistory((value) => value + 1);
  }

  return <div className="image-sketch-editor" role="dialog" aria-label={`编辑草图 ${name}`}>
    <header className="image-sketch-header">
      <div><strong>编辑草图</strong><small>{name}</small></div>
      <button type="button" className="image-sketch-icon" onClick={onCancel} aria-label="取消编辑"><X /></button>
    </header>
    <div className="image-sketch-workspace">
      <div className="image-sketch-toolbar" aria-label="绘图工具">
        {tools.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={tool === id ? "active" : ""} onClick={() => setTool(id)} aria-label={label} title={label}><Icon /></button>)}
        <span className="image-sketch-divider" />
        <button type="button" onClick={undo} disabled={historyRef.current.length <= 1} aria-label="撤销" title="撤销"><Undo2 /></button>
        <button type="button" onClick={redo} disabled={redoRef.current.length === 0} aria-label="重做" title="重做"><Redo2 /></button>
        <label className="image-sketch-color" title="笔刷颜色"><span>颜色</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
        <label className="image-sketch-size" title="笔刷大小"><span>大小</span><input type="range" min="2" max="32" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
      </div>
      <div className="image-sketch-canvas-wrap"><canvas ref={canvasRef} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} /></div>
    </div>
    <footer className="image-sketch-footer"><button type="button" className="image-sketch-cancel" onClick={onCancel}>取消</button><button type="button" className="image-sketch-save" disabled={!ready} onClick={() => { const canvas = canvasRef.current; if (canvas) onSave(canvas.toDataURL("image/png")); }}><Check />保存草图</button></footer>
  </div>;
}
