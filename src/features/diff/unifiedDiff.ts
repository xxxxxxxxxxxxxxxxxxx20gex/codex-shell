interface DiffLine {
  kind: "add" | "delete" | "context" | "header";
  text: string;
}

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

function cleanPath(value: string) {
  const path = value.split("\t", 1)[0].trim();
  return path.replace(/^[ab]\//, "");
}

export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diff.split(/\r?\n/);
  let current: DiffFile | null = null;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      current = { path: match?.[2] ?? "未知文件", additions: 0, deletions: 0, lines: [] };
      files.push(current);
    } else if (line.startsWith("+++ ")) {
      if (!current) {
        current = { path: cleanPath(line.slice(4)), additions: 0, deletions: 0, lines: [] };
        files.push(current);
      } else if (line.slice(4).trim() !== "/dev/null") {
        current.path = cleanPath(line.slice(4));
      }
      current.lines.push({ kind: "header", text: line });
    } else if (line.startsWith("--- ") || line.startsWith("@@") || line.startsWith("index ")) {
      if (current) current.lines.push({ kind: "header", text: line });
    } else if (current && line.startsWith("+")) {
      current.additions += 1;
      current.lines.push({ kind: "add", text: line });
    } else if (current && line.startsWith("-")) {
      current.deletions += 1;
      current.lines.push({ kind: "delete", text: line });
    } else if (current) {
      current.lines.push({ kind: "context", text: line });
    }
  }

  if (files.length === 0 && diff.trim()) {
    return [{
      path: "本轮变更",
      additions: lines.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length,
      deletions: lines.filter((line) => line.startsWith("-") && !line.startsWith("---")).length,
      lines: lines.map((text) => ({ kind: "context", text })),
    }];
  }

  return files;
}
