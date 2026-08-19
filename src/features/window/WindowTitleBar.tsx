import { useEffect, useState } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ProductMark } from "../../shared/ProductMark";
import "./WindowTitleBar.css";

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

export function WindowTitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    const appWindow = getCurrentWindow();
    let active = true;
    let dispose: (() => void) | undefined;
    const updateMaximized = () => {
      void appWindow.isMaximized().then((value) => {
        if (active) setMaximized(value);
      }).catch(() => undefined);
    };
    updateMaximized();
    void appWindow.onResized(updateMaximized).then((unlisten) => {
      if (active) dispose = unlisten;
      else unlisten();
    });
    return () => {
      active = false;
      dispose?.();
    };
  }, []);

  function run(action: "minimize" | "toggle" | "close") {
    if (!isTauri()) return;
    const appWindow = getCurrentWindow();
    if (action === "minimize") void appWindow.minimize().catch(() => undefined);
    else if (action === "toggle") void appWindow.toggleMaximize().then(() => appWindow.isMaximized()).then(setMaximized).catch(() => undefined);
    else void appWindow.close().catch(() => undefined);
  }

  return (
    <header
      className="window-titlebar"
      data-tauri-drag-region
      onDoubleClick={() => run("toggle")}
    >
      <div className="window-title" data-tauri-drag-region>
        <ProductMark className="window-title-mark" />
        <span data-tauri-drag-region>Codex Shell</span>
      </div>
      <div className="window-controls">
        <button type="button" onClick={() => run("minimize")} onDoubleClick={(event) => event.stopPropagation()} aria-label="最小化窗口" title="最小化"><Minus aria-hidden="true" /></button>
        <button type="button" onClick={() => run("toggle")} onDoubleClick={(event) => event.stopPropagation()} aria-label={maximized ? "还原窗口" : "最大化窗口"} title={maximized ? "还原" : "最大化"}>{maximized ? <Copy aria-hidden="true" /> : <Square aria-hidden="true" />}</button>
        <button type="button" className="window-close" onClick={() => run("close")} onDoubleClick={(event) => event.stopPropagation()} aria-label="关闭窗口" title="关闭"><X aria-hidden="true" /></button>
      </div>
    </header>
  );
}
