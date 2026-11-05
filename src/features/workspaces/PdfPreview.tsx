import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CompactIconButton } from "../../shared/CompactIconButton";
import { errorMessage } from "../../shared/errors";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./PdfPreview.css";
import { PdfBinaryDataFactory } from "./pdfAssets";

export function PdfPreview({ dataUrl, name }: { dataUrl: string; name: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [width, setWidth] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = container.current!;
    const observer = new ResizeObserver(() => setWidth(Math.max(1, Math.floor(node.clientWidth))));
    observer.observe(node);
    setWidth(Math.max(1, Math.floor(node.clientWidth)));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import("pdfjs-dist")["getDocument"]> | undefined;
    setDocument(null);
    setPageNumber(1);
    setError("");
    setRendering(true);
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const data = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), char => char.charCodeAt(0));
        task = pdfjs.getDocument({ data, useSystemFonts: true, useWasm: false, useWorkerFetch: false, BinaryDataFactory: PdfBinaryDataFactory });
        const pdf = await task.promise;
        if (!cancelled) setDocument(pdf);
      } catch (failure) {
        if (!cancelled) { setError(errorMessage(failure)); setRendering(false); }
      }
    })();
    return () => { cancelled = true; void task?.destroy(); };
  }, [dataUrl]);

  useEffect(() => {
    if (!document || !width) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setRendering(true);
    setError("");
    void (async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const cssScale = Math.min(width / base.width, 2);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        // Bound the canvas allocation even for pathological page dimensions.
        const scale = Math.min(cssScale * ratio, Math.sqrt(8_000_000 / (base.width * base.height)), 8192 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        const target = canvas.current!;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        target.style.width = `${base.width * cssScale}px`;
        target.style.height = `${base.height * cssScale}px`;
        task = page.render({ canvas: target, viewport });
        try { await task.promise; } finally { page.cleanup(); }
        if (!cancelled) setRendering(false);
      } catch (failure) {
        if (!cancelled) { setError(errorMessage(failure)); setRendering(false); }
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [document, pageNumber, width]);

  return <section className="pdf-preview" aria-label={`PDF 预览 ${name}`}>
    <div className="pdf-preview-toolbar">
      <CompactIconButton label="上一页" icon={<ChevronLeft />} disabled={!document || pageNumber <= 1} onClick={() => setPageNumber(value => value - 1)} />
      <span aria-live="polite">{document ? `${pageNumber} / ${document.numPages}` : "PDF"}</span>
      <CompactIconButton label="下一页" icon={<ChevronRight />} disabled={!document || pageNumber >= document.numPages} onClick={() => setPageNumber(value => value + 1)} />
    </div>
    {error ? <p className="pdf-preview-error" role="alert">无法预览 PDF：{error}</p> : rendering && <p className="pdf-preview-status" role="status">正在加载…</p>}
    <div className="pdf-preview-pages" ref={container}>
      <canvas ref={canvas} aria-label={`第 ${pageNumber} 页`} style={{ display: document && !error && !rendering ? "block" : "none" }} />
    </div>
  </section>;
}
