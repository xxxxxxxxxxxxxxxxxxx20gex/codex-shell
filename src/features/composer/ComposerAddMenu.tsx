import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Paperclip, Plus } from "lucide-react";
import { commandDisabled } from "../commands/SlashCommandMenu";
import { matchingSlashCommands, type SlashCommandId } from "../commands/slashCommands";
import { errorMessage } from "../../shared/errors";
import { useDismissiblePopover } from "../../shared/useDismissiblePopover";

interface Props {
  hasThread: boolean;
  running: boolean;
  onSelectPaths: (paths: string[]) => void;
  onCommand: (id: SlashCommandId) => void;
  onError: (message: string) => void;
  onOpen: () => void;
}

export function ComposerAddMenu({ hasThread, running, onSelectPaths, onCommand, onError, onOpen }: Props) {
  const [openState, setOpenState] = useState(false);
  const rootRef = useDismissiblePopover<HTMLDivElement>({
    open: openState,
    onClose: () => setOpenState(false),
  });
  const commands = matchingSlashCommands("");

  async function choosePaths() {
    try {
      const selected = await open({ multiple: true, directory: false, title: "添加文件和文件夹" });
      if (Array.isArray(selected)) onSelectPaths(selected);
      else if (typeof selected === "string") onSelectPaths([selected]);
      setOpenState(false);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  function toggleMenu() {
    if (!openState) onOpen();
    setOpenState(!openState);
  }

  function selectCommand(id: SlashCommandId) {
    setOpenState(false);
    onCommand(id);
  }

  return (
    <div ref={rootRef} className="composer-add-menu-anchor">
      <button type="button" className={`composer-add-button${openState ? " active" : ""}`} aria-label="添加与命令" title="添加文件或使用 Codex 命令" onClick={toggleMenu}><Plus aria-hidden="true" /></button>
      {openState && <div className="composer-add-menu" role="menu" aria-label="添加与命令">
        <strong>添加</strong>
        <button type="button" role="menuitem" onClick={() => void choosePaths()}>
          <i><Paperclip aria-hidden="true" /></i>
          <span><b>添加文件和文件夹</b><small>图片、文件；文件夹可直接拖入</small></span>
        </button>
        <hr />
        <strong>Codex</strong>
        {commands.map((command) => {
          const disabled = commandDisabled(command, hasThread, running);
          const Icon = command.icon;
          return <button key={command.id} type="button" role="menuitem" disabled={disabled} onClick={() => selectCommand(command.id)}>
            <i><Icon aria-hidden="true" /></i>
            <span><b>{command.label}</b><small>{command.description}</small></span>
            <kbd>/{command.id}</kbd>
          </button>;
        })}
      </div>}
    </div>
  );
}
