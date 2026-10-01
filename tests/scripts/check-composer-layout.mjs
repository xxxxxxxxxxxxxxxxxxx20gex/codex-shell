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
    .fixture-center { position: absolute; bottom: 0; width: calc(100% - 536px); margin-left: 248px; }
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
    const {QueuedMessageList} = await import("/src/features/composer/QueuedMessageList.tsx");
    const {ComposerAddMenu} = await import("/src/features/composer/ComposerAddMenu.tsx");
    const {PermissionModeSelector} = await import("/src/features/approvals/PermissionModeSelector.tsx");
    const {SendModeControl} = await import("/src/features/composer/SendModeControl.tsx");
    const {ComposerResizeHandle} = await import("/src/features/composer/ComposerResizeHandle.tsx");
    const thumbnail = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#292d2e"/><path d="M4 23L12 11L19 19L24 13L29 23" fill="none" stroke="#b8d957"/></svg>');
    const queued = Array.from({length:6},(_,i)=>({id:String(i),text:i===0?"请参考这张图优化输入区域":"请检查最近的界面改动，统一按钮、提示和列表的大小比例，同时保留现有的消息和附件内容，并检查不同窗口尺寸下长消息截断和操作按钮的稳定布局",mentions:[],images:i===0?[{name:"参考图.svg",url:thumbnail}]:[]}));
    const store = new RuntimeNoticeStore();
    store.push({kind:"warning",destination:"runtime",title:"运行环境提示",message:"检查当前项目的运行环境和权限设置"});
    const goal = {threadId:"thread-1",objective:"检查文档记录，确认最新内容，并逐项处理需要修复的问题；随后检查所有相关项目，逐项记录和处理还需要修复的问题",status:"active",tokenBudget:null,tokensUsed:0,timeUsedSeconds:131,createdAt:1,updatedAt:1};
    function Fixture() { const inputRef=React.useRef(null); return React.createElement("div",{className:"fixture-center"},React.createElement("div",{className:"composer-wrap"},
      React.createElement(RuntimeNoticeBanner,{store,onShowStatus:()=>{}}),
      React.createElement(TransientNotice,{message:"已保存当前任务的设置",tone:"success",onDismiss:()=>{}}),
      React.createElement(QueuedMessageList,{items:queued,running:true,canSteer:true,readFile:async()=>"",onEdit:()=>{},onSteer:async()=>{},onRemove:()=>{},onResume:()=>{},onError:()=>{}}),
      React.createElement(ComposerGoalStatus,{goal,onClear:()=>{window.__cleared=true;}}),
      React.createElement("div",{className:"composer has-context-heatbar"},
        React.createElement(ComposerResizeHandle,{inputRef}),
        React.createElement("textarea",{ref:inputRef,placeholder:"交给 Codex 一个任务…"}),
        React.createElement("div",{className:"composer-toolbar"},
          React.createElement("div",{className:"composer-tools"},
            React.createElement(ComposerAddMenu,{hasThread:true,running:true,onSelectPaths:()=>{},onCommand:()=>{},onError:()=>{},onOpen:()=>{}}),
            React.createElement(PermissionModeSelector,{value:"workspace",reviewer:"user",onChange:()=>{},onReviewerChange:()=>{}})),
          React.createElement("div",{className:"composer-actions"},
            React.createElement("button",{className:"model-button"},"GPT-6",React.createElement("small",null,"high")),
            React.createElement(SendModeControl,{canSteer:true,hasDraft:false,running:true,onQueue:()=>{},onSteer:()=>{}})))))); }
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
    const list = page.locator(".queued-message-list");
    assert.equal(await list.evaluate((el) => el.clientHeight), 160);
    assert.equal(await list.evaluate((el) => el.scrollHeight > el.clientHeight), true);
    assert.equal(await page.locator(".queued-message-row").first().evaluate((el) => el.getBoundingClientRect().height), 40);
    assert.equal(await page.locator(".queued-message-thumbnail").evaluate((el) => el.getBoundingClientRect().width), 32);
    assert.equal(await page.locator(".queued-message-text").nth(1).evaluate((el) => el.scrollWidth > el.clientWidth), true);
    const trigger = page.getByRole("button", {name:/消息操作/}).first();
    assert.equal(await trigger.evaluate((el) => el.getBoundingClientRect().height), 28);
    await trigger.click();
    const menu = page.getByRole("menu", {name:"待发送消息操作"});
    await menu.waitFor();
    assert.equal(await menu.evaluate((el) => el.parentElement === document.body), true);
    assert.equal(await menu.evaluate((el) => { const r=el.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight; }), true);
    await page.screenshot({ path: join(output, `composer-menu-${width}.png`) });
    await page.keyboard.press("Escape");
    assert.equal(await menu.count(), 0);
    assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
    await trigger.click();
    await page.locator("textarea").click();
    assert.equal(await menu.count(), 0);
    const input = page.locator("textarea");
    const handle = page.getByRole("button", {name:"调整输入框高度"});
    const composerBefore = await page.locator(".composer").boundingBox();
    const toolbarBefore = await page.locator(".composer-toolbar").boundingBox();
    const inputBefore = await input.boundingBox();
    const grip = await handle.boundingBox();
    assert.ok(grip.y - composerBefore.y < 8);
    assert.ok(composerBefore.x + composerBefore.width - grip.x - grip.width < 8);
    assert.equal(await input.evaluate(el => getComputedStyle(el).resize), "none");
    assert.equal(await handle.evaluate(el => getComputedStyle(el).cursor), "ns-resize");
    await page.mouse.move(grip.x + 14, grip.y + 14);
    await page.mouse.down();
    await page.mouse.move(grip.x + 14, grip.y + 14 - 80, {steps:8});
    await page.waitForFunction(height => document.querySelector("textarea").getBoundingClientRect().height === height, inputBefore.height + 80);
    assert.equal(await input.evaluate(el => el.getBoundingClientRect().height), inputBefore.height + 80);
    assert.equal(await page.locator(".composer").evaluate(el => el.getBoundingClientRect().y), composerBefore.y - 80);
    assert.equal(await page.locator(".composer-toolbar").evaluate(el => el.getBoundingClientRect().y), toolbarBefore.y);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.equal(await input.evaluate(el => el.getBoundingClientRect().height), inputBefore.height);
    await handle.focus();
    await page.keyboard.press("ArrowUp");
    assert.equal(await input.evaluate(el => el.getBoundingClientRect().height), inputBefore.height + 16);
    await page.keyboard.press("ArrowDown");
    assert.equal(await input.evaluate(el => el.getBoundingClientRect().height), inputBefore.height);
    await page.mouse.move(grip.x + 14, grip.y + 14);
    await page.mouse.down();
    await page.mouse.move(grip.x + 14, grip.y - 350, {steps:8});
    await page.waitForFunction(() => document.querySelector("textarea").getBoundingClientRect().height === 320);
    assert.equal(await input.evaluate(el => el.getBoundingClientRect().height), 320);
    await page.mouse.move(grip.x + 14, grip.y + 50, {steps:8});
    await page.waitForFunction(() => document.querySelector("textarea").getBoundingClientRect().height === 64);
    assert.equal(await input.evaluate(el => el.getBoundingClientRect().height), 64);
    await page.mouse.up();
    assert.deepEqual(errors, []);
    console.log(`${width}x${height} passed`);
  }
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
