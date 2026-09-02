import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { ArrowDown, ArrowDownToLine, ArrowUp } from "lucide-react";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import { userMessageText, type ThreadProcessEvent } from "../runtime/sessionState";
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
  processEventsByTurnId?: Record<string, ThreadProcessEvent[]>;
  readFile?: (path: string) => Promise<string>;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenInExplorer?: (path: string) => void | Promise<void>;
  onOpenError?: (message: string) => void;
}

interface UserTurnLink {
  index: number;
  label: string;
}

const AT_BOTTOM_THRESHOLD = 8;
const MANUAL_SCROLL_SETTLE_MS = 320;
const EMPTY_PLANS: Record<string, TurnPlanUpdatedNotification> = {};
const EMPTY_ACTIVE_ITEMS: Record<string, string> = {};
const EMPTY_MCP_PROGRESS: Record<string, McpToolCallProgressNotification> = {};
const EMPTY_PROCESS_EVENTS: Record<string, ThreadProcessEvent[]> = {};

function userTurnLinks(turns: Turn[]): UserTurnLink[] {
  return turns.flatMap((turn, index) => {
    const message = turn.items.find((item) => item.type === "userMessage");
    if (!message || message.type !== "userMessage") return [];
    const text = userMessageText(message).replace(/\s+/g, " ").trim();
    return [{ index, label: text || `第 ${index + 1} 条用户消息` }];
  });
}

function isAtBottom(scroller: HTMLElement): boolean {
  return scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= AT_BOTTOM_THRESHOLD;
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
  processEventsByTurnId = EMPTY_PROCESS_EVENTS,
  readFile,
  onOpenPath,
  onOpenInExplorer,
  onOpenError,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const followLatestRef = useRef(true);
  const atBottomRef = useRef(true);
  const initializedRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const manualScrollLockRef = useRef(false);
  const manualScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousThreadIdRef = useRef(threadId);
  const [atBottom, setAtBottom] = useState(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [visibleStartIndex, setVisibleStartIndex] = useState(Math.max(0, turns.length - 1));
  const previousActivityRef = useRef({ running, turns, processEventsByTurnId });
  const links = useMemo(() => userTurnLinks(turns), [turns]);

  const setProgrammaticScroll = useCallback((callback: () => void) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    programmaticScrollRef.current = true;
    callback();
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, []);

  const updateVisibleStart = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const children = Array.from(scroller.querySelectorAll<HTMLElement>("[data-turn-index]"));
    const threshold = scroller.scrollTop + 24;
    let nextIndex = 0;
    children.forEach((child) => {
      if (child.offsetTop <= threshold) nextIndex = Number(child.dataset.turnIndex ?? nextIndex);
    });
    setVisibleStartIndex(nextIndex);
  }, []);

  const updateBottomState = useCallback((nextAtBottom: boolean) => {
    atBottomRef.current = nextAtBottom;
    setAtBottom((current) => current === nextAtBottom ? current : nextAtBottom);
  }, []);

  const markManualScroll = useCallback(() => {
    manualScrollLockRef.current = true;
    followLatestRef.current = false;
    if (manualScrollTimerRef.current !== null) clearTimeout(manualScrollTimerRef.current);
    manualScrollTimerRef.current = setTimeout(() => {
      manualScrollTimerRef.current = null;
      manualScrollLockRef.current = false;
      const scroller = scrollerRef.current;
      if (scroller && isAtBottom(scroller)) {
        atBottomRef.current = true;
        followLatestRef.current = true;
        setAtBottom(true);
        setHasNewActivity(false);
      }
    }, MANUAL_SCROLL_SETTLE_MS);
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    const userInitiated = !programmaticScrollRef.current;
    if (userInitiated) markManualScroll();
    const nextAtBottom = isAtBottom(scroller);
    updateBottomState(nextAtBottom);
    updateVisibleStart();
    if (userInitiated && nextAtBottom) setHasNewActivity(false);
  }, [markManualScroll, updateBottomState, updateVisibleStart]);

  const scrollToTop = useCallback((top: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setProgrammaticScroll(() => {
      if (typeof scroller.scrollTo === "function") scroller.scrollTo({ top, behavior: "auto" });
      if (scroller.scrollTop !== top) scroller.scrollTop = top;
    });
  }, [setProgrammaticScroll]);

  const scrollToTurn = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const target = scroller?.querySelector<HTMLElement>(`[data-turn-index="${index}"]`);
    if (!target) return;
    followLatestRef.current = false;
    updateBottomState(false);
    scrollToTop(target.offsetTop);
    setVisibleStartIndex(index);
  }, [scrollToTop, updateBottomState]);

  const scrollToLatest = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    followLatestRef.current = true;
    setHasNewActivity(false);
    scrollToTop(Math.max(0, scroller.scrollHeight - scroller.clientHeight));
    updateBottomState(true);
  }, [scrollToTop, updateBottomState]);

  const activeLinkIndex = useMemo(() => {
    if (atBottom) return Math.max(0, links.length - 1);
    let activeIndex = 0;
    links.forEach((link, index) => {
      if (link.index <= visibleStartIndex) activeIndex = index;
    });
    return activeIndex;
  }, [atBottom, links, visibleStartIndex]);

  const scrollToRelativeUserTurn = useCallback((offset: -1 | 1) => {
    const nextLink = links[activeLinkIndex + offset];
    if (nextLink) scrollToTurn(nextLink.index);
  }, [activeLinkIndex, links, scrollToTurn]);

  useEffect(() => {
    const previous = previousActivityRef.current;
    previousActivityRef.current = { running, turns, processEventsByTurnId };
    if (!atBottom && (
      previous.running !== running
      || previous.turns !== turns
      || previous.processEventsByTurnId !== processEventsByTurnId
    )) setHasNewActivity(true);
  }, [atBottom, processEventsByTurnId, running, turns]);

  useEffect(() => () => {
    if (manualScrollTimerRef.current !== null) clearTimeout(manualScrollTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || turns.length === 0) return;
    if (previousThreadIdRef.current !== threadId) {
      previousThreadIdRef.current = threadId;
      initializedRef.current = false;
      followLatestRef.current = true;
      manualScrollLockRef.current = false;
      if (manualScrollTimerRef.current !== null) {
        clearTimeout(manualScrollTimerRef.current);
        manualScrollTimerRef.current = null;
      }
      setHasNewActivity(false);
      updateBottomState(true);
    }
    if (!initializedRef.current) {
      initializedRef.current = true;
      scrollToTop(Math.max(0, scroller.scrollHeight - scroller.clientHeight));
      updateBottomState(true);
      return;
    }
    if (running && followLatestRef.current && atBottomRef.current && !manualScrollLockRef.current) {
      scrollToTop(Math.max(0, scroller.scrollHeight - scroller.clientHeight));
      updateBottomState(true);
    }
    updateVisibleStart();
  }, [activeItemTurnIds, mcpProgressByItemId, plansByTurnId, processEventsByTurnId, running, scrollToTop, threadId, turns, updateBottomState, updateVisibleStart]);

  return (
    <div className="timeline-shell">
      <div
        ref={scrollerRef}
        className="timeline"
        data-testid="timeline-scroller"
        onScroll={handleScroll}
        onPointerDown={() => { programmaticScrollRef.current = false; }}
        tabIndex={0}
      >
        {turns.map((turn, turnIndex) => (
          <div
            className={`conversation-turn-frame ${turnIndex === 0 ? "first" : "separated"} ${turnIndex === turns.length - 1 ? "last" : ""}`}
            data-turn-index={turnIndex}
            key={turn.id}
          >
            <ConversationTurn
              turn={turn}
              active={running && turn.status === "inProgress"}
              retryingMessage={running && turn.status === "inProgress" ? retryingMessage : null}
              canFork={Boolean(onFork && threadId && !forkDisabled && turn.status !== "inProgress" && !(running && turnIndex === turns.length - 1))}
              onFork={threadId && onFork ? () => onFork(threadId, turn.id) : undefined}
              plan={plansByTurnId[turn.id]}
              activeItemTurnIds={activeItemTurnIds}
              mcpProgressByItemId={mcpProgressByItemId}
              processEvents={processEventsByTurnId[turn.id] ?? []}
              readFile={readFile}
              onOpenPath={onOpenPath}
              onOpenInExplorer={onOpenInExplorer}
              onOpenError={onOpenError}
            />
          </div>
        ))}
      </div>
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
        <nav className="timeline-scroll-controls" aria-label="消息滚动控制">
          <button
            className="timeline-scroll-button"
            type="button"
            onClick={() => scrollToRelativeUserTurn(-1)}
            disabled={links.length === 0 || activeLinkIndex <= 0}
            aria-label="跳转到上一个用户消息"
            title="上一个用户消息"
          ><ArrowUp aria-hidden="true" /></button>
          <button
            className="timeline-scroll-button"
            type="button"
            onClick={() => scrollToRelativeUserTurn(1)}
            disabled={links.length === 0 || activeLinkIndex >= links.length - 1}
            aria-label="跳转到下一个用户消息"
            title="下一个用户消息"
          ><ArrowDown aria-hidden="true" /></button>
          <button
            className="timeline-scroll-button timeline-latest-button"
            type="button"
            onClick={scrollToLatest}
            aria-label="返回最新"
            title={hasNewActivity ? "有新内容 · 返回最新" : "返回最新"}
          ><ArrowDownToLine aria-hidden="true" /></button>
        </nav>
      )}
    </div>
  );
}
