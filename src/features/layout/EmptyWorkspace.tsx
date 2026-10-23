import emptyWorkspaceDogs from "../../../assets/illustrations/empty-workspace-dogs.png";
import animatedWorkspaceDogs from "../../../assets/illustrations/empty-workspace-dogs.webp";

export function EmptyWorkspace() {
  return <div className="conversation-empty">
    <picture className="conversation-empty-art" aria-hidden="true">
      <source srcSet={animatedWorkspaceDogs} type="image/webp" />
      <img className="conversation-empty-mark" src={emptyWorkspaceDogs} width={162} height={137} alt="" draggable={false} />
    </picture>
    <h2>有什么想一起完成的？</h2>
    <p>选择项目，写下一个任务。从一个小想法开始。</p>
  </div>;
}
