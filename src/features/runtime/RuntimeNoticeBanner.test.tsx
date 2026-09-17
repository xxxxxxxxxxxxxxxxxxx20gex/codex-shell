// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RuntimeNoticeBanner } from "./RuntimeNoticeBanner";
import { RuntimeNoticeStore } from "./runtimeNoticeStore";

afterEach(cleanup);

it("opens the destination carried by the latest app-server notice", () => {
  const store = new RuntimeNoticeStore();
  const onShowStatus = vi.fn();
  const view = render(<RuntimeNoticeBanner store={store} onShowStatus={onShowStatus} />);
  act(() => store.push({ kind: "warning", destination: "diagnostics", title: "配置警告", message: "检查日志" }));
  fireEvent.click(screen.getByText("配置警告"));
  expect(onShowStatus).toHaveBeenLastCalledWith("diagnostics");

  act(() => store.push({ kind: "security", destination: "runtime", title: "Windows Sandbox 尚未就绪", message: "需要配置" }));
  view.rerender(<RuntimeNoticeBanner store={store} onShowStatus={onShowStatus} />);
  fireEvent.click(screen.getByText("Windows Sandbox 尚未就绪"));
  expect(onShowStatus).toHaveBeenLastCalledWith("runtime");
});
