import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type ListRange, type VirtuosoHandle } from "react-virtuoso";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import { userMessageText } from "../runtime/sessionState";
import { ConversationTurn } from "./ConversationTurn";
import "./ConversationTimeline.css";

interface Props {
  turns: Turn[];
  running: boolean;
  threadId?: string | null;
  onFork?: (threadId: string) => void;
  plansByTurnId?: Record<string, TurnPlanUpdatedNotification>;
  activeItemTurnIds?: Record<string, string>;
  mcpProgressByItemId?: Record<string, McpToolCallProgressNotification>;
}

interface UserTurnLink {
  index: number;
  label: string;
}

function userTurnLinks(turns: Turn[]): UserTurnLink[] {
  return turns.flatMap((turn, index) => {
    const message = turn.items.find((item) => item.type === "userMessage");
    if (!message || message.type !== "userMessage") return [];
    const text = userMessageText(message).replace(/\s+/g, " ").trim();
    return [{ index, label: text || `第 ${index + 1} 条用户消息` }];
  });
}

export function ConversationTimeline({
  turns,
  running,
  threadId = null,
  onFork,
  plansByTurnId = {},
  activeItemTurnIds = {},
  mcpProgressByItemId = {},
}: Props) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [visibleStartIndex, setVisibleStartIndex] = useState(Math.max(0, turns.length - 1));
  const links = useMemo(() => userTurnLinks(turns), [turns]);

  const activeLinkIndex = useMemo(() => {
    if (atBottom) return Math.max(0, links.length - 1);
    let activeIndex = 0;
    links.forEach((link, index) => {
      if (link.index <= visibleStartIndex) activeIndex = index;
    });
    return activeIndex;
  }, [atBottom, links, visibleStartIndex]);

  useEffect(() => {
    if (!atBottom) setHasNewActivity(true);
  }, [running, turns]);

  const handleAtBottomChange = useCallback((nextAtBottom: boolean) => {
    setAtBottom(nextAtBottom);
    if (nextAtBottom) setHasNewActivity(false);
  }, []);

  const scrollToTurn = useCallback((index: number) => {
    virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "smooth" });
    setVisibleStartIndex(index);
    const scrollingToLatest = index === turns.length - 1;
    setAtBottom(scrollingToLatest);
    if (scrollingToLatest) setHasNewActivity(false);
  }, [turns.length]);

  const handleRangeChanged = useCallback((range: ListRange) => {
    setVisibleStartIndex(range.startIndex);
  }, []);

  const scrollToLatest = useCallback(() => {
    scrollToTurn(turns.length - 1);
    setHasNewActivity(false);
  }, [scrollToTurn, turns.length]);

  return (
    <div className="timeline-shell">
      <Virtuoso
        ref={virtuosoRef}
        className="timeline"
        data={turns}
        atBottomThreshold={96}
        atBottomStateChange={handleAtBottomChange}
        computeItemKey={(_index, turn) => turn.id}
        followOutput={(isAtBottom) => isAtBottom ? "auto" : false}
        initialTopMostItemIndex={Math.max(0, turns.length - 1)}
        rangeChanged={handleRangeChanged}
        itemContent={(turnIndex, turn) => (
          <div className={`conversation-turn-frame ${turnIndex === 0 ? "first" : "separated"} ${turnIndex === turns.length - 1 ? "last" : ""}`}>
            <ConversationTurn
              turn={turn}
              active={running && turnIndex === turns.length - 1}
              canFork={Boolean(onFork && threadId && !running && turnIndex === turns.length - 1)}
              onFork={threadId && onFork ? () => onFork(threadId) : undefined}
              plan={plansByTurnId[turn.id]}
              activeItemTurnIds={activeItemTurnIds}
              mcpProgressByItemId={mcpProgressByItemId}
            />
          </div>
        )}
      />
      {links.length > 1 && (
        <nav className="user-message-navigation" aria-label="用户消息导航">
          {links.map((link, index) => (
            <button
              key={`${link.index}:${link.label}`}
              type="button"
              className={index === activeLinkIndex ? "active" : undefined}
              onClick={() => scrollToTurn(link.index)}
              aria-label={`跳到消息：${link.label}`}
              title={link.label}
            ><span aria-hidden="true" /></button>
          ))}
        </nav>
      )}
      {!atBottom && (
        <button className="timeline-latest-button" type="button" onClick={scrollToLatest}>
          {hasNewActivity ? "有新内容 · 返回最新" : "返回最新"}
        </button>
      )}
    </div>
  );
}
