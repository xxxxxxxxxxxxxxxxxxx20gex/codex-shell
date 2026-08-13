import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect, useRef, type RefObject } from "react";
import { errorMessage } from "../../shared/errors";

export function useComposerDropPaths(
  composerRef: RefObject<HTMLElement | null>,
  onDropPaths: (paths: string[]) => void,
  onError: (message: string) => void,
) {
  const onDropPathsRef = useRef(onDropPaths);
  const onErrorRef = useRef(onError);
  onDropPathsRef.current = onDropPaths;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return;
      const scale = window.devicePixelRatio || 1;
      const target = document.elementFromPoint(
        event.payload.position.x / scale,
        event.payload.position.y / scale,
      );
      if (composerRef.current?.contains(target)) onDropPathsRef.current(event.payload.paths);
    }).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    }).catch((error) => {
      if (!disposed) onErrorRef.current(errorMessage(error));
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [composerRef]);
}
