const assets = import.meta.glob<string>([
  "/node_modules/pdfjs-dist/cmaps/*.bcmap",
  "/node_modules/pdfjs-dist/standard_fonts/*.{ttf,pfb}",
], { query: "?url", import: "default", eager: true });

/** Resolve only bundled PDF.js resources; PDF content cannot choose a network URL. */
export class PdfBinaryDataFactory {
  async fetch({ kind, filename }: { kind: string; filename: string }) {
    const folder = kind === "cMapUrl" ? "cmaps" : kind === "standardFontDataUrl" ? "standard_fonts" : null;
    const url = folder && assets[`/node_modules/pdfjs-dist/${folder}/${filename}`];
    if (!url) throw new Error("不支持的 PDF 字体或图像资源");
    const response = await fetch(url);
    if (!response.ok) throw new Error("PDF 字体资源加载失败");
    return new Uint8Array(await response.arrayBuffer());
  }
}
