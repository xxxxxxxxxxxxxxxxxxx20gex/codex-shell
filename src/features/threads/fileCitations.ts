import { unified } from "unified";
import remarkParse from "remark-parse";

const parser = unified().use(remarkParse);

/** Adapt file directives to ordinary Markdown so rendering and resource discovery agree. */
export function normalizeFileCitations(markdown: string): string {
  if (!markdown.includes(":codex-file-citation{")) return markdown;
  const protectedRanges: [number, number][] = [];
  type Node = { type: string; position?: { start: { offset?: number }; end: { offset?: number } }; children?: Node[] };
  function visit(node: Node) {
    if (["code", "inlineCode", "link", "image", "linkReference", "imageReference", "html"].includes(node.type)) {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) protectedRanges.push([start, end]);
      return;
    }
    node.children?.forEach(visit);
  }
  visit(parser.parse(markdown));
  return markdown.replace(/:codex-file-citation\{([^{}\r\n]*)\}/g, (directive: string, body: string, offset: number) => {
    if (protectedRanges.some(([start, end]) => offset < end && offset + directive.length > start)) return directive;
    const attributes = [...body.matchAll(/([a-z_]+)="([^"\r\n]*)"/g)];
    if (body.replace(/([a-z_]+)="([^"\r\n]*)"/g, "").trim()) return directive;
    if (new Set(attributes.map(match => match[1])).size !== attributes.length) return directive;
    const path = attributes.find(match => match[1] === "path")?.[2];
    const purpose = attributes.find(match => match[1] === "purpose")?.[2];
    if (!path || !["source", "output"].includes(purpose ?? "") || [...path].some(char => char.charCodeAt(0) < 32)) return directive;
    // File citations require absolute filesystem paths, never executable or web URLs.
    if (!/^(?:[a-zA-Z]:[\\/]|\/|\\\\)/.test(path)) return directive;
    const label = (path.split(/[\\/]/).pop() || path).replace(/[\\`*_[\]<>]/g, "\\$&");
    const target = path.split(/[\\/]/).map(part => encodeURIComponent(part)).join("/");
    return `[${label}](<${target.replace(/^([a-zA-Z])%3A\//, "$1:/")}>)`;
  });
}
