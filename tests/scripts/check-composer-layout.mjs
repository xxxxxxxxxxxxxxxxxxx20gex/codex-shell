import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const module = await import(pathToFileURL(process.argv[2]).href);
const { chromium } = module.default ?? module;
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const output = await mkdtemp(join(tmpdir(), "cs-composer-layout-"));

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/composer-layout-check", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><meta charset="utf-8"><style>
    .fixture-center { width: calc(100% - 536px); margin-left: 248px; }
    @media (max-width: 1179px) { .fixture-center { width: calc(100% - 248px); } }
  </style></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    await import("/@vite/client");
    const {default: React} = await import("/node_modules/.vite/deps/react.js");
    const {default: ReactDOM} = await import("/node_modules/.vite/deps/react-dom_client.js");
    await import("/src/styles/tokens.css");
    await import("/src/App.css");
    const {ComposerGoalStatus} = await import("/src/features/composer/ComposerGoalStatus.tsx");
    const {RuntimeNoticeBanner} = await import("/src/features/runtime/RuntimeNoticeBanner.tsx");
    const {RuntimeNoticeStore} = await import("/src/features/runtime/runtimeNoticeStore.ts");
    const {TransientNotice} = await import("/src/shared/TransientNotice.tsx");
    const store = new RuntimeNoticeStore();
    store.push({kind:"warning",destination:"runtime",title:"运行环境提示",message:"检查当前项目的运行环境和权限设置"});
    const goal = {threadId:"thread-1",objective:"检查文档记录，确认最新内容，并逐项处理需要修复的问题；随后检查所有相关项目，逐项记录和处理还需要修复的问题",status:"active",tokenBudget:null,tokensUsed:0,timeUsedSeconds:131,createdAt:1,updatedAt:1};
    function Fixture() { return React.createElement("div",{className:"fixture-center"},React.createElement("div",{className:"composer-wrap",style:{marginTop:"35vh"}},
      React.createElement(RuntimeNoticeBanner,{store,onShowStatus:()=>{}}),
      React.createElement(TransientNotice,{message:"已保存当前任务的设置",onDismiss:()=>{}}),
      React.createElement(ComposerGoalStatus,{goal,onClear:()=>{window.__cleared=true;}}),
      React.createElement("div",{className:"composer has-context-heatbar"},
        React.createElement("textarea",{placeholder:"交给 Codex 一个任务…"}),
        React.createElement("div",{className:"composer-toolbar"},
          React.createElement("div",{className:"composer-tools"},"添加 · 权限"),
          React.createElement("div",{className:"composer-actions"},"模型 · 发送"))))); }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Fixture));
  </script></body></html>` }));

  for (const [width, height] of [[1440, 900], [1280, 780], [1024, 720], [900, 700]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1435}/composer-layout-check`);
    const strip = page.locator(".composer-goal-status");
    await strip.waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await strip.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    assert.equal(await page.locator(".composer-wrap").evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    assert.equal(await strip.locator("strong").evaluate((element) => element.scrollWidth > element.clientWidth), true);
    assert.equal(await strip.locator("strong").getAttribute("title"), "检查文档记录，确认最新内容，并逐项处理需要修复的问题；随后检查所有相关项目，逐项记录和处理还需要修复的问题");
    assert.equal(await page.locator(".composer-goal-status strong").evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 11), true);
    assert.equal(await page.getByText("2m 11s").count(), 1);
    await strip.locator("strong").click();
    assert.equal(await page.evaluate(() => window.__cleared ?? false), false);
    const clear = page.getByRole("button", { name: /清除当前目标/ });
    await clear.focus();
    assert.equal(await clear.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await clear.evaluate((element) => getComputedStyle(element).transitionDuration), "1e-05s");
    await page.screenshot({ path: join(output, `composer-${width}.png`) });
    assert.deepEqual(errors, []);
    console.log(`${width}x${height} passed`);
  }
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
