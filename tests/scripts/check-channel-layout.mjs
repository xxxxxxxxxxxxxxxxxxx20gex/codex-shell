import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 模型中转渠道设置与对话高级设置的四尺寸布局、字号、焦点与 reduced-motion 检查。
// 与 check-extension-layout.mjs 相同，需要外部提供 Playwright 模块和浏览器可执行文件：
//   pnpm dev --host 127.0.0.1 --port 1435
//   pnpm test:channel-layout <playwright/index.mjs 绝对路径> <浏览器可执行文件绝对路径> [端口]
const module = await import(pathToFileURL(process.argv[2]).href);
const { chromium } = module.default ?? module;
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const port = process.argv[4] ?? "1435";
const output = await mkdtemp(join(tmpdir(), "cs-channel-layout-"));
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const fixture = `
const conversation = {modelId:"deepseek-flash",reasoningEffort:null,reasoningSummary:null,verbosity:null,serviceTier:"default"};
const providerSettings = {schemaVersion:2,activeChannelId:"openai-1",channels:[
 {id:"openai-1",vendor:"openai",name:"OpenAI 官方",baseUrl:"https://api.openai.com/v1",catalog:{kind:"vendorDefault"},conversation:{modelId:"gpt-5.6-sol",reasoningEffort:null,reasoningSummary:null,verbosity:null,serviceTier:"default"}},
 {id:"deepseek-2",vendor:"deepseek",name:"DeepSeek 官方直连备用路由",baseUrl:"https://api.deepseek.com",catalog:{kind:"vendorDefault"},conversation},
 {id:"deepseek-3",vendor:"deepseek",name:"备用中转",baseUrl:"https://relay.example.test/v1",catalog:{kind:"vendorDefault"},conversation},
]};
const models = [{id:"deepseek-flash",model:"deepseek-flash",upgrade:null,upgradeInfo:null,availabilityNux:null,displayName:"DeepSeek Flash",description:"",modelSpecialty:null,hidden:false,supportedReasoningEfforts:[{reasoningEffort:"low",description:""}],defaultReasoningEffort:"low",inputModalities:["text"],supportsPersonality:false,multiAgentVersion:null,additionalSpeedTiers:[],serviceTiers:[],defaultServiceTier:null,isDefault:true}];
function SettingsHost() {
  return React.createElement(PreferencesPanel,{settings:{customInstructions:"",theme:"dark"},providerSettings,onSaveProviderSettings:async()=>{},initialSection:"providers",codexHome:"C:/cs",codexHomeDisabled:false,windowsSandboxReadiness:"notConfigured",noticeStore:new RuntimeNoticeStore(),logStore:new RuntimeLogStore(),onSetupWindowsSandbox:async()=>true,onRestart:async()=>{},onClose:()=>{window.__closed=(window.__closed||0)+1;},onSave:async()=>{}});
}
window.show = (kind) => {
  const content = kind === "providers"
    ? React.createElement(SettingsHost)
    : React.createElement(ModelSettingsPanel,{settings:conversation,providerSettings,loadModels:async()=>models,loadProviderCapabilities:async()=>({namespaceTools:false,imageGeneration:false,webSearch:false}),onManageChannels:()=>{window.__managed=(window.__managed||0)+1;},onClose:noop,onSave:noop});
  root.render(content);
};
`;

await page.route("**/channel-check", (route) => route.fulfill({ contentType: "text/html", body: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
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
await import("/src/features/preferences/PreferencesPanel.css");
const {PreferencesPanel} = await import("/src/features/preferences/PreferencesPanel.tsx");
const {ModelSettingsPanel} = await import("/src/features/models/ModelSettingsPanel.tsx");
const {RuntimeLogStore} = await import("/src/features/runtime/runtimeLogStore.ts");
const {RuntimeNoticeStore} = await import("/src/features/runtime/runtimeNoticeStore.ts");
const root = ReactDOM.createRoot(document.getElementById("root"));
const noop = () => {};
${fixture}
window.show("providers");
</script></body></html>` }));

async function assertSurface(kind, viewport) {
  const label = kind === "providers" ? "模型渠道" : "网关与自定义模型";
  await page.getByText(label).first().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, `${kind} ${viewport} horizontal overflow`);
  const smallText = await page.locator("button,input,label,small,p,strong,span").evaluateAll((elements) => elements
    .filter((element) => element.offsetParent !== null && element.textContent.trim() !== "" && parseFloat(getComputedStyle(element).fontSize) < 11)
    .map((element) => `${getComputedStyle(element).fontSize}:${element.textContent.trim().slice(0, 24)}`));
  assert.deepEqual(smallText, [], `${kind} ${viewport} text minimum`);
  const modalOutside = await page.evaluate(() => {
    const modal = document.querySelector(".preferences-modal, .settings-modal");
    if (!modal) return "missing modal";
    const rect = modal.getBoundingClientRect();
    return rect.left < 0 || rect.top < 0 || rect.right > innerWidth + 0.5 || rect.bottom > innerHeight + 0.5
      ? `modal ${JSON.stringify(rect)} in ${innerWidth}x${innerHeight}`
      : "";
  });
  assert.equal(modalOutside, "", `${kind} ${viewport} modal bounds`);
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement !== document.body), true, `${kind} ${viewport} focus`);
}

try {
  await page.goto(`http://127.0.0.1:${port}/channel-check`);
  await page.waitForFunction(() => typeof window.show === "function");
  for (const [width, height] of [[1440, 900], [1280, 780], [1024, 720], [900, 700]]) {
    const viewport = `${width}x${height}`;
    await page.setViewportSize({ width, height });
    for (const kind of ["providers", "advanced"]) {
      await page.evaluate((view) => window.show(view), kind);
      await assertSurface(kind, viewport);
      await page.screenshot({ path: join(output, `${kind}-${width}.png`) });
      if (kind === "advanced") {
        const manage = page.getByRole("button", { name: "管理渠道", exact: true });
        assert.equal(await manage.evaluate(el => el.closest(".channel-picker")), null);
        assert.equal((await manage.boundingBox()).height, 28);
        await manage.focus();
        const managed = await page.evaluate(() => window.__managed ?? 0);
        await page.keyboard.press("Enter");
        assert.equal(await page.evaluate(() => window.__managed), managed + 1);
        const choice = page.getByRole("button", { name: /DeepSeek 官方直连备用路由/ });
        await choice.click();
        assert.equal(await choice.getAttribute("aria-pressed"), "true");
        assert.equal((await choice.boundingBox()).height, 32);
        await choice.locator("strong").evaluate(el => { el.textContent = "长渠道名称".repeat(30); });
        await assertSurface(kind, viewport);
        assert.equal(await page.locator('.channel-picker button[aria-pressed="true"] strong').evaluate(el => el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === "ellipsis"), true);
      }
      if (kind === "providers") {
        await page.getByRole("button", { name: "编辑 DeepSeek 官方直连备用路由" }).click();
        await page.getByLabel("名称", { exact: true }).fill("未保存的渠道名称");
        await assertSurface(kind, viewport);
        await page.screenshot({ path: join(output, `editor-${width}.png`) });
        assert.equal(await page.getByRole("button", { name: /最大化设置|最小化设置|恢复设置|还原设置窗口/ }).count(), 0);
        const bounds = await page.getByRole("dialog").boundingBox();
        assert.equal(bounds.width, Math.min(1040, width - 32));
        assert.equal(bounds.height, Math.min(760, height - 32));
        const before = await page.evaluate(() => window.__closed ?? 0);
        assert.equal(await page.getByLabel("名称", { exact: true }).inputValue(), "未保存的渠道名称");
        await page.getByRole("button", { name: "取消", exact: true }).click();
        await page.getByRole("button", { name: "关闭设置", exact: true }).focus();
        await page.keyboard.press("Tab");
        assert.equal(await page.getByRole("button", { name: "个性化提示词" }).evaluate(el => el === document.activeElement), true);
        await page.getByRole("button", { name: "关闭", exact: true }).focus();
        await page.keyboard.press("Tab");
        assert.equal(await page.getByRole("button", { name: "关闭设置", exact: true }).evaluate(el => el === document.activeElement), true);
        await page.mouse.click(2, 2);
        assert.equal(await page.evaluate(() => window.__closed ?? 0), before + 1);
      }
    }
  }

  await page.setViewportSize({ width: 1024, height: 720 });
  await page.evaluate(() => window.show("providers"));
  await page.getByRole("button", { name: "编辑 DeepSeek 官方直连备用路由" }).waitFor();
  await page.getByRole("button", { name: "删除 备用中转" }).click();
  await page.getByRole("button", { name: "确认删除" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "delete confirmation overflow");
  await page.screenshot({ path: join(output, "providers-delete-confirm-1024.png") });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => (window.__closed ?? 0) > 0, null, { timeout: 3000 });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.show("providers"));
  const transition = await page.getByRole("button", { name: /模型渠道/ }).first().evaluate((element) => getComputedStyle(element).transitionDuration);
  assert.ok(parseFloat(transition) <= 0.001, `reduced motion transition ${transition}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "PASS", viewports: 4, views: 2, output }));
} catch (error) {
  console.error(JSON.stringify({ pageErrors: errors, output }));
  throw error;
} finally {
  await browser.close();
}
