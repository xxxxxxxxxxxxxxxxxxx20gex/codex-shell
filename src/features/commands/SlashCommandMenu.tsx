import { matchingSlashCommands, type SlashCommandDefinition, type SlashCommandId } from "./slashCommands";

interface Props {
  query: string;
  selectedIndex: number;
  hasThread: boolean;
  running: boolean;
  onSelect: (id: SlashCommandId) => void;
}

export function commandDisabled(command: SlashCommandDefinition, hasThread: boolean, running: boolean) {
  return Boolean((command.requiresThread && !hasThread) || (command.blockedWhileRunning && running));
}

export function SlashCommandMenu({ query, selectedIndex, hasThread, running, onSelect }: Props) {
  const commands = matchingSlashCommands(query);
  return (
    <div className="slash-command-menu" role="listbox" aria-label="Codex 命令">
      <header><span>/ 命令</span><small>↑↓ 选择 · Enter 执行</small></header>
      {commands.length === 0 && <p>没有匹配的命令。</p>}
      {commands.map((command, index) => {
        const disabled = commandDisabled(command, hasThread, running);
        return (
          <button key={command.id} className={index === selectedIndex ? "selected" : ""} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(command.id)} role="option" aria-selected={index === selectedIndex}>
            <i>{command.icon}</i>
            <span><strong>/{command.id} <em>{command.label}</em></strong><small>{command.description}</small></span>
          </button>
        );
      })}
    </div>
  );
}
