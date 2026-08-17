import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { ChevronRight, File, Files } from "lucide-react";
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
        <Files className="turn-file-changes-icon" aria-hidden="true" />
        <strong>文件变更 · {files.length}</strong>
        <small className="turn-file-changes-total">
          {additions > 0 && <span className="added">+{additions}</span>}
          {deletions > 0 && <span className="removed">-{deletions}</span>}
        </small>
        <ChevronRight className="turn-file-changes-chevron" aria-hidden="true" />
      </summary>
      <ul>
        {files.map((file) => (
          <li key={file.path}>
            <File className="turn-file-icon" aria-label={kindLabels[file.kind] ?? file.kind} />
            <code title={file.path}>{file.path}</code>
            {(file.additions > 0 || file.deletions > 0) && <small>
              {file.additions > 0 && <span className="added">+{file.additions}</span>}
              {file.deletions > 0 && <span className="removed">-{file.deletions}</span>}
            </small>}
          </li>
        ))}
      </ul>
    </details>
  );
}
