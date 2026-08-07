import type { FuzzyFileSearchResult } from "../../generated/app-server/FuzzyFileSearchResult";

interface Props {
  query: string;
  results: FuzzyFileSearchResult[];
  loading: boolean;
  onSelect: (result: FuzzyFileSearchResult) => void;
}

export function FileMentionMenu({ query, results, loading, onSelect }: Props) {
  return (
    <div className="file-mention-menu" role="listbox" aria-label="工作区文件">
      <header><span>@ 工作区文件</span><small>{loading ? "搜索中…" : `${results.length} 项`}</small></header>
      {!loading && results.length === 0 && <p>{query ? "没有找到匹配文件。" : "当前工作区为空，请先在左侧选择项目目录。"}</p>}
      {results.map((result) => (
        <button key={`${result.root}:${result.path}`} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(result)}>
          <strong>{result.match_type === "directory" ? "▸ " : ""}{result.file_name}</strong><small>{result.match_type === "directory" ? "目录" : result.path}</small>
        </button>
      ))}
    </div>
  );
}
