// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { TurnResourceOutputs } from "./TurnResourceOutputs";

afterEach(cleanup);
it("extracts reply references, ignores code and web links, and lazily retains process images", () => {
  const readFile = vi.fn(async () => "AA==");
  const items: ThreadItem[] = [
    { type: "agentMessage", id: "a", text: '[result][r]\n\n[r]: </C:/work/final.png>\n\n`[fake](fake.png)` [web](https://example.com/a.png)', phase: "final_answer", memoryCitation: null, questions: null, delivery: null },
    { type: "imageView", id: "v", path: "C:\\work\\final.png" },
    { type: "imageView", id: "p", path: "C:/work/mask.png" },
  ];
  const view = render(<TurnResourceOutputs items={items} readFile={readFile} />);
  expect(view.getByRole("region", { name: "回复中的文件" })).toBeTruthy();
  expect(view.queryByLabelText("本轮产出")).toBeNull();
  expect(readFile).toHaveBeenCalledTimes(1);
  const details = view.getByText("过程资源 · 1 个").parentElement as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  expect(readFile).toHaveBeenCalledWith("C:/work/mask.png");
});
