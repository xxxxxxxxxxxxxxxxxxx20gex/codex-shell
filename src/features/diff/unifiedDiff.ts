interface DiffLine {
  kind: "add" | "delete" | "context" | "header";
  text: string;
}

type DiffChangeType = "added" | "deleted" | "renamed" | "modified";

export interface DiffFile {
  path: string;
  oldPath: string | null;
  changeType: DiffChangeType;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

function cleanPath(value: string) {
  const path = value.split("\t", 1)[0].trim();
  if (path === "/dev/null") return path;
  return path.replace(/^[ab]\//, "");
}

function createFile(path: string, oldPath: string | null = null): DiffFile {
  return {
    path,
    oldPath,
    changeType: oldPath && oldPath !== path ? "renamed" : "modified",
    additions: 0,
    deletions: 0,
    lines: [],
  };
}

export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diff.split(/\r?\n/);
  let current: DiffFile | null = null;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      current = createFile(match?.[2] ?? "未知文件", match?.[1] ?? null);
      files.push(current);
    } else if (line.startsWith("new file mode ")) {
      if (current) current.changeType = "added";
    } else if (line.startsWith("deleted file mode ")) {
      if (current) current.changeType = "deleted";
    } else if (line.startsWith("rename from ")) {
      if (current) {
        current.oldPath = cleanPath(line.slice("rename from ".length));
        current.changeType = "renamed";
      }
    } else if (line.startsWith("rename to ")) {
      if (current) {
        current.path = cleanPath(line.slice("rename to ".length));
        current.changeType = "renamed";
      }
    } else if (line.startsWith("--- ")) {
      if (current) {
        const oldPath = cleanPath(line.slice(4));
        if (oldPath === "/dev/null") current.changeType = "added";
        else current.oldPath = oldPath;
        current.lines.push({ kind: "header", text: line });
      }
    } else if (line.startsWith("+++ ")) {
      if (!current) {
        const path = cleanPath(line.slice(4));
        current = createFile(path);
        files.push(current);
      } else {
        const newPath = cleanPath(line.slice(4));
        if (newPath === "/dev/null") {
          current.changeType = "deleted";
          current.path = current.oldPath ?? current.path;
        } else {
          current.path = newPath;
          if (current.oldPath && current.oldPath !== newPath && current.changeType === "modified") {
            current.changeType = "renamed";
          }
        }
      }
      current.lines.push({ kind: "header", text: line });
    } else if (line.startsWith("@@") || line.startsWith("index ")) {
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
      ...createFile("本轮变更"),
      additions: lines.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length,
      deletions: lines.filter((line) => line.startsWith("-") && !line.startsWith("---")).length,
      lines: lines.map((text) => ({ kind: "context", text })),
    }];
  }

  return files;
}
