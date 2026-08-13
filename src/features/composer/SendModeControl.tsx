export type ComposerSubmitAction = "queue" | "steer" | "steerUnavailable";

interface ComposerKeyModifiers {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export function composerSubmitAction(event: ComposerKeyModifiers, canSteer: boolean): ComposerSubmitAction | null {
  if (event.key !== "Enter") return null;
  if (event.shiftKey && (event.ctrlKey || event.metaKey)) return canSteer ? "steer" : "steerUnavailable";
  if (event.shiftKey) return null;
  return "queue";
}

interface SendModeControlProps {
  canSteer: boolean;
  hasDraft: boolean;
  running: boolean;
  onQueue: () => void;
  onSteer: () => void;
}

export function SendModeControl(props: SendModeControlProps) {
  return (
    <div className="send-mode-anchor">
      {props.running && (
        <div className="send-mode-menu-bridge">
          <div className="send-mode-menu" role="menu" aria-label="发送方式">
            <button type="button" role="menuitem" disabled={!props.hasDraft} onClick={props.onQueue}>
              <span className="send-mode-label"><strong>Queue</strong><kbd>Enter</kbd></span>
              <small>等待当前任务完成后发送</small>
            </button>
            <button type="button" role="menuitem" disabled={!props.hasDraft || !props.canSteer} onClick={props.onSteer}>
              <span className="send-mode-label"><strong>Steer</strong><kbd>Ctrl + Shift + Enter</kbd></span>
              <small>{props.canSteer ? "立即引导当前任务" : "当前阶段不可引导"}</small>
            </button>
          </div>
        </div>
      )}
      <button className="send-button" disabled={!props.hasDraft} onClick={props.onQueue} aria-label={props.running ? "排队发送" : "发送任务"}>↑</button>
    </div>
  );
}
