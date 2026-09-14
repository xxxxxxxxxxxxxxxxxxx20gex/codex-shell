import { useEffect, useRef, useState } from "react";

export interface ImageAnnotation {
  x: number;
  y: number;
  comment: string;
}

export function ImageAnnotationCanvas({ source, name, editing, annotations, selected, onAdd, onSelect }: {
  source: string;
  name: string;
  editing: boolean;
  annotations: ImageAnnotation[];
  selected: number | null;
  onAdd: (point: ImageAnnotation) => void;
  onSelect: (index: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stageRef.current!);
    return () => observer.disconnect();
  }, []);
  const scale = natural.width && natural.height ? Math.min(1, available.width / natural.width, available.height / natural.height) : 0;
  return <div ref={stageRef} className="image-annotation-stage">
    <div className="attachment-image-canvas" style={{ width: natural.width && scale ? natural.width * scale : "100%", height: natural.height && scale ? natural.height * scale : "100%" }}>
      <img src={source} alt={name} draggable={false} onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
      {editing && <button type="button" className="image-annotation-target" aria-label="在图片上添加批注（键盘添加到中心）" onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = event.detail === 0 ? 0.5 : (event.clientX - rect.left) / rect.width;
        const y = event.detail === 0 ? 0.5 : (event.clientY - rect.top) / rect.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) return;
        onAdd({ x, y, comment: "" });
      }} />}
      {editing && annotations.map((annotation, index) => <button key={index} type="button" className={`image-annotation-marker ${selected === index ? "selected" : ""}`} style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }} onClick={() => onSelect(index)} aria-label={`选择批注 ${index + 1}`} title={`批注 ${index + 1}：${annotation.comment}`} aria-pressed={selected === index}>{index + 1}</button>)}
    </div>
  </div>;
}
