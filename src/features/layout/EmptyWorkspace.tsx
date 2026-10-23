import animatedWorkspaceDogs from "../../../assets/illustrations/empty-workspace-dogs.svg";

export function EmptyWorkspace() {
  return <div className="conversation-empty">
    <img className="conversation-empty-mark" src={animatedWorkspaceDogs} width={162} height={123} alt="" aria-hidden="true" draggable={false} />
    <h2>有什么想一起完成的？</h2>
    <p>选择项目，写下一个任务。从一个小想法开始。</p>
  </div>;
}
