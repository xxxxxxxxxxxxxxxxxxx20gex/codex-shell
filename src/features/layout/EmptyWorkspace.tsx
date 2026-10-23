export function EmptyWorkspace() {
  return <div className="conversation-empty">
    <svg className="conversation-empty-mark" viewBox="0 0 96 72" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 47c-5-5-6-14-2-20l-1-12 13 8c7-2 12-1 17 2l10-8 1 14c13 1 23 9 23 19 0 11-12 15-30 15H29c-12 0-19-4-19-10 0-5 5-8 12-8Z" />
        <path d="M26 36c2 2 5 2 7 0m10 0c2 2 5 2 7 0M36 42l3 2 3-2m-3 2v3m-8 0c4 3 10 3 14 0M62 48c15-2 17 11 2 12H43M16 42l-8-2m9 7-8 1" />
        <path d="M71 18h7l-7 7h7m4-20h6l-6 6h6" opacity=".65" />
      </g>
    </svg>
    <h2>有什么想一起完成的？</h2>
    <p>选择项目，写下一个任务。从一个小想法开始。</p>
  </div>;
}
