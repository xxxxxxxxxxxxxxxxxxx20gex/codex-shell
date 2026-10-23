export function EmptyWorkspace() {
  return <div className="conversation-empty">
    <svg className="conversation-empty-mark" viewBox="0 0 96 80" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 19c4-7 11-10 20-10s16 3 20 10M27 32c-1 12 6 20 21 20s22-8 21-20" />
        <path d="M29 17c-6-5-13 1-17 10-4 8-1 15 5 15 7 0 10-11 12-25Zm38 0c6-5 13 1 17 10 4 8 1 15-5 15-7 0-10-11-12-25Z" />
        <path d="M36 31h1m22 0h1M44 36q4-2 8 0l-4 4-4-4Zm4 4v3m-8-1c2 5 6 5 8 1 2 4 6 4 8-1" />
        <path d="M32 49c-4 8-5 16-4 22 1 5 10 5 13 1 3 3 11 3 14 0 3 4 12 4 13-1 1-6 0-14-4-22M40 61v10m16-10v10M68 66c9 2 14-3 12-9M32 52q16 8 32 0" />
      </g>
    </svg>
    <h2>有什么想一起完成的？</h2>
    <p>选择项目，写下一个任务。从一个小想法开始。</p>
  </div>;
}
