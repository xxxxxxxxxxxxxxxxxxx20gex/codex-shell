import { useEffect, useMemo, useState } from "react";
import { parseUnifiedDiff } from "./unifiedDiff";
import "./DiffInspector.css";

interface Props {
  diff: string;
  onOpenFile?: (path: string) => void;
}

const changeLabels = {
  added: "新增",
  deleted: "删除",
  renamed: "重命名",
  modified: "修改",
} as const;

export function DiffInspector({ diff, onOpenFile }: Props) {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const [selectedPath, setSelectedPath] = useState("");

  useEffect(() => {
    if (!files.some((file) => file.path === selectedPath)) setSelectedPath(files[0]?.path ?? "");
  }, [files, selectedPath]);

  const selected = files.find((file) => file.path === selectedPath) ?? files[0];
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);
  const changeCounts = files.reduce((counts, file) => ({
    ...counts,
    [file.changeType]: counts[file.changeType] + 1,
  }), { added: 0, deleted: 0, renamed: 0, modified: 0 });

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
      <div className="diff-change-counts" aria-label="文件变更摘要">
        {Object.entries(changeCounts).map(([type, count]) => count > 0 && (
          <span key={type} data-type={type}>{changeLabels[type as keyof typeof changeLabels]} {count}</span>
        ))}
      </div>
      <nav className="diff-files" aria-label="变更文件">
        {files.map((file) => (
          <button
            key={file.path}
            className={file.path === selected.path ? "active" : ""}
            onClick={() => setSelectedPath(file.path)}
            title={file.path}
          >
            <span><i data-type={file.changeType}>{changeLabels[file.changeType]}</i>{file.path}</span>
            <small><b>+{file.additions}</b> <i>-{file.deletions}</i></small>
          </button>
        ))}
      </nav>
      <div className="diff-code" aria-label={`${selected.path} 的代码差异`}>
        <header>
          <span title={selected.oldPath && selected.oldPath !== selected.path ? `${selected.oldPath} → ${selected.path}` : selected.path}>
            {selected.oldPath && selected.oldPath !== selected.path ? `${selected.oldPath} → ${selected.path}` : selected.path}
          </span>
          {onOpenFile && selected.changeType !== "deleted" && selected.path !== "本轮变更" && (
            <button type="button" onClick={() => onOpenFile(selected.path)}>在工作区查看</button>
          )}
        </header>
        <pre>{selected.lines.map((line, index) => (
          <span key={`${index}:${line.text}`} data-kind={line.kind}>{line.text || " "}</span>
        ))}</pre>
      </div>
    </div>
  );
}
