import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { parseUnifiedDiff } from "../diff/unifiedDiff";

interface Props {
  items: Extract<ThreadItem, { type: "fileChange" }>[];
}

interface FileSummary {
  path: string;
  kind: string;
  additions: number;
  deletions: number;
}

function summarize(items: Props["items"]): FileSummary[] {
  const summaries = new Map<string, FileSummary>();
  for (const item of items) {
    for (const change of item.changes) {
      const parsed = parseUnifiedDiff(change.diff);
      const additions = parsed.reduce((total, file) => total + file.additions, 0);
      const deletions = parsed.reduce((total, file) => total + file.deletions, 0);
      const existing = summaries.get(change.path);
      summaries.set(change.path, {
        path: change.path,
        kind: change.kind.type,
        additions: (existing?.additions ?? 0) + additions,
        deletions: (existing?.deletions ?? 0) + deletions,
      });
    }
  }
  return [...summaries.values()];
}

const kindLabels: Record<string, string> = { add: "新增", delete: "删除", update: "修改" };

export function TurnFileChanges({ items }: Props) {
  const files = summarize(items);
  if (files.length === 0) return null;
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);
  return (
    <details className="turn-file-changes" open>
      <summary>
        <span className="turn-file-changes-icon">±</span>
        <strong>已编辑 {files.length} 个文件</strong>
        <small>{additions > 0 && `+${additions} `}{deletions > 0 && `-${deletions}`}</small>
        <i>⌄</i>
      </summary>
      <ul>
        {files.map((file) => (
          <li key={file.path}>
            <span data-kind={file.kind}>{kindLabels[file.kind] ?? file.kind}</span>
            <code title={file.path}>{file.path}</code>
            {(file.additions > 0 || file.deletions > 0) && <small>+{file.additions} -{file.deletions}</small>}
          </li>
        ))}
      </ul>
    </details>
  );
}
