// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
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
  expect(view.getByRole("region", { name: "回复中的图片" })).toBeTruthy();
  expect(view.queryByLabelText("本轮产出")).toBeNull();
  expect(readFile).toHaveBeenCalledTimes(1);
  const details = view.getByText("过程资源 · 1 个").parentElement as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  expect(readFile).toHaveBeenCalledWith("C:/work/mask.png");
});

it("lists Markdown documents from reply links and opens them through the file viewer", () => {
  const message: ThreadItem = { type: "agentMessage", id: "a", text: "[skill](C:/skills/SKILL.md) [notes](notes.markdown) [pdf](report.pdf) [sheet](data.xlsx) [image](image.png)", phase: "final_answer", memoryCitation: null, questions: null, delivery: null };
  const view = render(<TurnResourceOutputs items={[message]} />);
  expect(view.getByText("image.png")).toBeTruthy();
  expect(view.getByText("SKILL.md")).toBeTruthy();
  expect(view.queryByText("report.pdf")).toBeNull();
  expect(view.queryByText("data.xlsx")).toBeNull();
  const onOpenPath = vi.fn();
  view.rerender(<TurnResourceOutputs items={[{ ...message, text: "[notes](notes.md)" }]} onOpenPath={onOpenPath} />);
  fireEvent.click(view.getByRole("button", { name: "打开 notes.md" }));
  expect(onOpenPath).toHaveBeenCalledWith("notes.md");
});

it("keeps file actions together when both actions are available", () => {
  const message: ThreadItem = { type: "agentMessage", id: "a", text: "[notes](notes.md)", phase: "final_answer", memoryCitation: null, questions: null, delivery: null };
  const view = render(<TurnResourceOutputs items={[message]} onOpenPath={vi.fn()} onOpenInExplorer={vi.fn()} />);
  const actions = view.container.querySelector(".turn-resource-file-actions");
  expect(actions?.querySelectorAll("button")).toHaveLength(2);
  expect(actions?.parentElement?.querySelectorAll(":scope > button")).toHaveLength(0);
});

it("does not present a reply link as a resource when the file is missing", async () => {
  const message: ThreadItem = { type: "agentMessage", id: "a", text: "[路线图](travel-map.png)", phase: "final_answer", memoryCitation: null, questions: null, delivery: null };
  const view = render(<TurnResourceOutputs items={[message]} pathExists={vi.fn().mockResolvedValue(false)} onOpenPath={vi.fn()} />);
  await waitFor(() => expect(view.queryByText("travel-map.png")).toBeNull());
  expect(view.container.querySelector(".turn-resource-outputs")).toBeNull();
});

it("resolves Core file URLs before checking and previewing process images", async () => {
  const readFile = vi.fn(async () => "AA==");
  const pathExists = vi.fn(async () => true);
  const view = render(<TurnResourceOutputs items={[{ type: "imageView", id: "view", path: "file:///C:/work/My%20Image.png" }]} readFile={readFile} pathExists={pathExists} />);

  await waitFor(() => expect(pathExists).toHaveBeenCalledWith("C:/work/My Image.png"));
  const details = view.getByText("过程资源 · 1 个").parentElement as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await waitFor(() => expect(readFile).toHaveBeenCalledWith("C:/work/My Image.png"));
});

it("does not read or list an invalid Core file URL", () => {
  const readFile = vi.fn(async () => "AA==");
  const pathExists = vi.fn(async () => true);
  const view = render(<TurnResourceOutputs items={[{ type: "imageView", id: "view", path: "file://" }]} readFile={readFile} pathExists={pathExists} />);

  expect(view.queryByText(/过程资源/)).toBeNull();
  expect(pathExists).not.toHaveBeenCalled();
  expect(readFile).not.toHaveBeenCalled();
});
