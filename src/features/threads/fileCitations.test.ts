import { expect, it } from "vitest";
import { normalizeFileCitations } from "./fileCitations";
const citation = ':codex-file-citation{path="C:/work/report.pdf" purpose="output"}';
it("supports source citations and attribute order", () => {
  expect(normalizeFileCitations('见 :codex-file-citation{purpose="source" path="/tmp/report.pdf"}。')).toBe('见 [report.pdf](</tmp/report.pdf>)。');
});
it.each([`\`${citation}\``, `\`\`\`text\n${citation}\n\`\`\``, `[${citation}](https://example.com)`, `    ${citation}`])("preserves code and existing links: %s", text => {
  expect(normalizeFileCitations(text)).toBe(text);
});
it.each(['javascript:alert(1)', 'https://example.com/report.pdf', 'relative.pdf'])('rejects non-filesystem citation %s', path => {
  const text = `:codex-file-citation{path="${path}" purpose="output"}`;
  expect(normalizeFileCitations(text)).toBe(text);
});
it.each([citation.slice(0, -1), citation.replace('output', 'unknown'), citation.replace('purpose=', 'path="/other.pdf" purpose=')])('preserves incomplete or invalid syntax: %s', text => {
  expect(normalizeFileCitations(text)).toBe(text);
});
