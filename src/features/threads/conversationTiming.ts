import type { Turn } from "../../generated/app-server/v2/Turn";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatMessageTimestamp(timestamp: number | null) {
  if (timestamp === null) return null;
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return [
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

export function formatTurnDuration(durationMs: number) {
  const milliseconds = Math.max(0, Math.round(durationMs));
  if (milliseconds < 1000) return `${milliseconds} 毫秒`;
  if (milliseconds < 60_000) {
    const seconds = (milliseconds / 1000).toFixed(1).replace(/\.0$/, "");
    return `${seconds} 秒`;
  }

  const totalSeconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} 小时 ${minutes} 分 ${pad(seconds)} 秒`;
  return `${minutes} 分 ${pad(seconds)} 秒`;
}

function turnDurationMs(turn: Turn) {
  if (turn.durationMs !== null) return turn.durationMs;
  if (turn.startedAt === null || turn.completedAt === null) return null;
  return Math.max(0, (turn.completedAt - turn.startedAt) * 1000);
}

export function userMessageTiming(turn: Turn) {
  const sentAt = formatMessageTimestamp(turn.startedAt);
  return sentAt ? `发送于 ${sentAt}` : null;
}

export function agentMessageTiming(turn: Turn, active: boolean) {
  const answeredAt = formatMessageTimestamp(turn.completedAt);
  if (!answeredAt) return active || turn.status === "inProgress" ? "回答生成中" : null;
  const durationMs = turnDurationMs(turn);
  return durationMs === null
    ? `回答于 ${answeredAt}`
    : `回答于 ${answeredAt} · 耗时 ${formatTurnDuration(durationMs)}`;
}
