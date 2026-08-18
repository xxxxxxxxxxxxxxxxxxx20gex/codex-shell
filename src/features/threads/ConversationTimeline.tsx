import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  retryingMessage?: string | null;
  threadId?: string | null;
  forkDisabled?: boolean;
  onFork?: (threadId: string, lastTurnId: string) => void;
  plansByTurnId?: Record<string, TurnPlanUpdatedNotification>;
  activeItemTurnIds?: Record<string, string>;
  mcpProgressByItemId?: Record<string, McpToolCallProgressNotification>;
  readFile?: (path: string) => Promise<string>;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenError?: (message: string) => void;
}

interface UserTurnLink {
  index: number;
  label: string;
}

const EMPTY_PLANS: Record<string, TurnPlanUpdatedNotification> = {};
const EMPTY_ACTIVE_ITEMS: Record<string, string> = {};
const EMPTY_MCP_PROGRESS: Record<string, McpToolCallProgressNotification> = {};

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
  retryingMessage = null,
  threadId = null,
  forkDisabled = false,
  onFork,
  plansByTurnId = EMPTY_PLANS,
  activeItemTurnIds = EMPTY_ACTIVE_ITEMS,
  mcpProgressByItemId = EMPTY_MCP_PROGRESS,
  readFile,
  onOpenPath,
  onOpenError,
}: Props) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const followLatestRef = useRef(true);
  const scrollerCleanupRef = useRef<(() => void) | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [visibleStartIndex, setVisibleStartIndex] = useState(Math.max(0, turns.length - 1));
  const previousActivityRef = useRef({ running, turns });
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
    const previous = previousActivityRef.current;
    previousActivityRef.current = { running, turns };
    if (!atBottom && (previous.running !== running || previous.turns !== turns)) {
      setHasNewActivity(true);
    }
  }, [atBottom, running, turns]);

  useEffect(() => () => scrollerCleanupRef.current?.(), []);

  useLayoutEffect(() => {
    if (followLatestRef.current) virtuosoRef.current?.autoscrollToBottom();
  }, [activeItemTurnIds, mcpProgressByItemId, plansByTurnId, running, turns]);

  const handleAtBottomChange = useCallback((nextAtBottom: boolean) => {
    setAtBottom(nextAtBottom);
    if (nextAtBottom) {
      followLatestRef.current = true;
      setHasNewActivity(false);
    }
  }, []);

  const handleScrollerRef = useCallback((scroller: HTMLElement | Window | null) => {
    scrollerCleanupRef.current?.();
    scrollerCleanupRef.current = null;
    if (!scroller) return;

    const eventTarget: EventTarget = scroller;
    const scrollTop = () => scroller instanceof Window ? scroller.scrollY : scroller.scrollTop;
    let pointerScrolling = false;
    let previousScrollTop = scrollTop();
    const stopFollowing = () => {
      followLatestRef.current = false;
    };
    const handleWheel = (event: Event) => {
      if ((event as WheelEvent).deltaY < 0) stopFollowing();
    };
    const handlePointerDown = () => {
      pointerScrolling = true;
    };
    const handlePointerUp = () => {
      pointerScrolling = false;
    };
    const handleKeyDown = (event: Event) => {
      if (["ArrowUp", "PageUp", "Home"].includes((event as KeyboardEvent).key)) stopFollowing();
    };
    const handleScroll = () => {
      const nextScrollTop = scrollTop();
      if (pointerScrolling && nextScrollTop < previousScrollTop - 1) stopFollowing();
      previousScrollTop = nextScrollTop;
    };
    eventTarget.addEventListener("wheel", handleWheel, { passive: true });
    eventTarget.addEventListener("pointerdown", handlePointerDown, { passive: true });
    eventTarget.addEventListener("keydown", handleKeyDown);
    eventTarget.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    scrollerCleanupRef.current = () => {
      eventTarget.removeEventListener("wheel", handleWheel);
      eventTarget.removeEventListener("pointerdown", handlePointerDown);
      eventTarget.removeEventListener("keydown", handleKeyDown);
      eventTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const scrollToTurn = useCallback((index: number) => {
    followLatestRef.current = false;
    virtuosoRef.current?.scrollToIndex({ index, align: "start", behavior: "smooth" });
    setVisibleStartIndex(index);
  }, []);

  const handleRangeChanged = useCallback((range: ListRange) => {
    setVisibleStartIndex(range.startIndex);
  }, []);

  const scrollToLatest = useCallback(() => {
    followLatestRef.current = true;
    virtuosoRef.current?.scrollToIndex({ index: "LAST", align: "end", behavior: "smooth" });
    setHasNewActivity(false);
  }, []);

  return (
    <div className="timeline-shell">
      <Virtuoso
        ref={virtuosoRef}
        className="timeline"
        data={turns}
        atBottomThreshold={8}
        atBottomStateChange={handleAtBottomChange}
        computeItemKey={(_index, turn) => turn.id}
        followOutput="auto"
        initialTopMostItemIndex={Math.max(0, turns.length - 1)}
        rangeChanged={handleRangeChanged}
        scrollerRef={handleScrollerRef}
        itemContent={(turnIndex, turn) => (
          <div className={`conversation-turn-frame ${turnIndex === 0 ? "first" : "separated"} ${turnIndex === turns.length - 1 ? "last" : ""}`}>
            <ConversationTurn
              turn={turn}
              active={running && turnIndex === turns.length - 1}
              retryingMessage={running && turnIndex === turns.length - 1 ? retryingMessage : null}
              canFork={Boolean(onFork && threadId && !forkDisabled && turn.status !== "inProgress" && !(running && turnIndex === turns.length - 1))}
              onFork={threadId && onFork ? () => onFork(threadId, turn.id) : undefined}
              plan={plansByTurnId[turn.id]}
              activeItemTurnIds={activeItemTurnIds}
              mcpProgressByItemId={mcpProgressByItemId}
              readFile={readFile}
              onOpenPath={onOpenPath}
              onOpenError={onOpenError}
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
