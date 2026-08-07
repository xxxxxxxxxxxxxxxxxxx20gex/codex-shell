import { useEffect, useMemo, useState } from "react";
import { parseUnifiedDiff } from "./unifiedDiff";

interface Props {
  diff: string;
}

export function DiffInspector({ diff }: Props) {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const [selectedPath, setSelectedPath] = useState("");

  useEffect(() => {
    if (!files.some((file) => file.path === selectedPath)) setSelectedPath(files[0]?.path ?? "");
  }, [files, selectedPath]);

  const selected = files.find((file) => file.path === selectedPath) ?? files[0];
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);

  if (!selected) {
    return <div className="diff-empty">
      <span>±</span>
      <strong>本轮尚无文件变更</strong>
      <p>Codex 修改文件后，app-server 提供的实时 Diff 会显示在这里。</p>
    </div>;
  }

  return (
    <div className="diff-inspector">
      <div className="diff-summary">
        <span>{files.length} 个文件</span><strong>+{additions}</strong><em>-{deletions}</em>
      </div>
      <nav className="diff-files" aria-label="变更文件">
        {files.map((file) => (
          <button
            key={file.path}
            className={file.path === selected.path ? "active" : ""}
            onClick={() => setSelectedPath(file.path)}
            title={file.path}
          >
            <span>{file.path}</span><small><b>+{file.additions}</b> <i>-{file.deletions}</i></small>
          </button>
        ))}
      </nav>
      <div className="diff-code" aria-label={`${selected.path} 的代码差异`}>
        <header>{selected.path}</header>
        <pre>{selected.lines.map((line, index) => (
          <span key={`${index}:${line.text}`} data-kind={line.kind}>{line.text || " "}</span>
        ))}</pre>
      </div>
    </div>
  );
}
