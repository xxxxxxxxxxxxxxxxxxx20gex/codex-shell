import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { CompactIconButton } from "../../shared/CompactIconButton";
import { writeClipboardText } from "./clipboard";

export function MarkdownTable({ children }: { children?: ReactNode }) {
  const table = useRef<HTMLTableElement>(null);
  const pending = useRef(false);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copy() {
    if (!table.current || pending.current) return;
    // TSV keeps cell boundaries when pasted into spreadsheets; embedded tabs/newlines
    // become spaces so one rendered cell cannot create additional rows or columns.
    const text = Array.from(table.current.rows, row => Array.from(row.cells, cell =>
      (cell.textContent ?? "").replace(/[\t\r\n]+/g, " ").trim()).join("\t")).join("\r\n");
    pending.current = true;
    try { await writeClipboardText(text); setStatus("copied"); }
    catch { setStatus("failed"); }
    finally { pending.current = false; }
  }

  return <section className="markdown-table-block">
    <div className="markdown-table-actions">
      <span role="status">{status === "failed" ? "复制失败，请重试" : status === "copied" ? "已复制" : ""}</span>
      <CompactIconButton label="复制表格" title={status === "copied" ? "已复制表格" : "复制表格"} icon={status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} onClick={() => void copy()} />
    </div>
    <div className="markdown-table-scroll"><table ref={table}>{children}</table></div>
  </section>;
}
