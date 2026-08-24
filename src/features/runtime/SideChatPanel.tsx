import { ChevronLeft, Maximize2, Minimize2, Send, Square, X } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ConversationTimeline } from "../threads/ConversationTimeline";
import type { SideChat } from "./useSideChat";
import "./SideChatPanel.css";

interface Props {
  chat: SideChat;
  maximized: boolean;
  onToggleMaximize: () => void;
  onClose: () => void;
  onBack?: () => void;
}

export function SideChatPanel({ chat, maximized, onToggleMaximize, onClose, onBack }: Props) {
  const [draft, setDraft] = useState("");

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = draft.trim();
    if (!chat.thread || !message || chat.running || chat.submitting) return;
    if (await chat.send(message)) setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <section className="side-chat-panel" aria-label="侧边聊天">
      <header className="side-chat-header">
        <div className="side-chat-title-group">
          {onBack && <button type="button" className="side-chat-icon side-chat-back" onClick={onBack} title="返回功能区" aria-label="返回功能区"><ChevronLeft aria-hidden="true" /></button>}
          <div>
          <span className="eyebrow">SIDE CHAT</span>
          <strong>侧边聊天</strong>
          </div>
        </div>
        <div className="side-chat-actions">
          <button type="button" className="side-chat-icon" onClick={onToggleMaximize} title={maximized ? "恢复侧边栏宽度" : "最大化侧边栏"} aria-label={maximized ? "恢复侧边栏宽度" : "最大化侧边栏"}>
            {maximized ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </button>
          <button type="button" className="side-chat-icon" onClick={onClose} title="关闭侧边聊天" aria-label="关闭侧边聊天"><X aria-hidden="true" /></button>
        </div>
      </header>
      {chat.error && <div className="side-chat-error" role="alert">{chat.error}</div>}
      <div className="side-chat-body">
        {chat.turns.length > 0 ? (
          <ConversationTimeline
            turns={chat.turns}
            running={chat.running}
            threadId={chat.thread?.id}
            forkDisabled
            plansByTurnId={chat.plansByTurnId}
            activeItemTurnIds={chat.activeItemTurnIds}
            mcpProgressByItemId={chat.mcpProgressByItemId}
            processEventsByTurnId={chat.processEventsByTurnId}
          />
        ) : (
          <div className="side-chat-empty"><strong>从当前对话开始旁聊</strong><span>侧聊会继承已完成的主对话上下文，不会写入主会话历史。</span></div>
        )}
      </div>
      <form className="side-chat-composer" onSubmit={submit}>
        <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={!chat.thread ? "正在准备侧聊…" : chat.running ? "正在处理…" : "继续询问…"} disabled={!chat.thread || chat.submitting} rows={2} />
        <div className="side-chat-composer-footer">
          <small>Enter 发送 · Shift+Enter 换行</small>
          {chat.running ? (
            <button type="button" className="side-chat-send stop" onClick={() => void chat.interrupt()} title="停止侧边聊天" aria-label="停止侧边聊天"><Square aria-hidden="true" /></button>
          ) : (
            <button type="submit" className="side-chat-send" disabled={!chat.thread || !draft.trim() || chat.submitting} title="发送" aria-label="发送"><Send aria-hidden="true" /></button>
          )}
        </div>
      </form>
    </section>
  );
}
