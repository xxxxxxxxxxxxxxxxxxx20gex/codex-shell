import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Uses an externally supplied Playwright module and the local Vite dev server.
const module = await import(pathToFileURL(process.argv[2]).href);
const { chromium } = module.default ?? module;
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const output = await mkdtemp(join(tmpdir(), "cs-extension-layout-"));
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/extension-check", (route) => route.fulfill({ contentType: "text/html", body: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
import RefreshRuntime from "/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
await import("/@vite/client");
const {default: React} = await import("/node_modules/.vite/deps/react.js");
const {default: ReactDOM} = await import("/node_modules/.vite/deps/react-dom_client.js");
await import("/src/styles/tokens.css");
await import("/src/features/commands/CommandPanels.css");
await import("/src/features/commands/ExtensionManagement.css");
const {SkillManagementPage} = await import("/src/features/commands/SkillManagementPage.tsx");
const {PluginManagementPage} = await import("/src/features/commands/PluginManagementPage.tsx");
const {McpStatusPanel} = await import("/src/features/commands/McpStatusPanel.tsx");
document.body.style.cssText = "margin:0;background:var(--surface-canvas);color:var(--text-primary);font:13px Segoe UI";
const root = ReactDOM.createRoot(document.getElementById("root"));
const noop = () => {};
const skill = {name:"example-skill",description:"这是一个用于验证长中文描述和操作区域的技能",enabled:true,scope:"user",pluginId:null,path:"C:/cs/skills/demo/SKILL.md"};
const plugin = {id:"demo",name:"本地插件",installed:false,enabled:true,availability:"AVAILABLE",installPolicy:"AVAILABLE",authPolicy:"ON_USE",interface:null};
const extensions = {listPlugins:async()=>({marketplaces:[{name:"local-marketplace",path:"C:/market.json",plugins:[plugin]}],marketplaceLoadErrors:[]}),installPlugin:async()=>({appsNeedingAuth:[]}),readPlugin:async()=>({plugin:{summary:plugin,skills:[],hooks:[],apps:[],mcpServers:[]}})};
window.show = (kind) => {
 const content = kind === "skills" ? React.createElement(SkillManagementPage,{loadSkills:async()=>[skill],revision:0,codexHome:"C:/cs",setEnabled:async()=>false,onClose:noop,onAddSkill:noop}) :
 kind === "plugins" ? React.createElement(PluginManagementPage,{extensions,revision:0,onClose:noop,onChanged:noop}) :
 React.createElement(McpStatusPanel,{loadServers:async()=>[],loginServer:async()=>"",reloadServers:async()=>{},readResource:async()=>[],onClose:noop,readConfig:async()=>({version:"v",servers:{}}),writeConfig:async()=>{}});
 root.render(React.createElement("main",{style:{marginLeft:248,marginRight:innerWidth>=1180?288:0,height:"100vh",position:"relative",display:"flex",overflow:"hidden"}},content));
};
window.show("skills");
</script></body></html>` }));
try {
  await page.goto("http://127.0.0.1:1435/extension-check");
  await page.waitForFunction(() => typeof window.show === "function");
  for (const [width, height] of [[1440, 900], [1280, 780], [1024, 720], [900, 700]]) {
    await page.setViewportSize({ width, height });
    for (const kind of ["skills", "plugins", "mcp"]) {
      await page.evaluate((view) => window.show(view), kind);
      await page.getByText(kind === "skills" ? /^example-skill/ : kind === "plugins" ? "本地插件" : "添加 MCP").first().waitFor();
      await page.screenshot({ path: join(output, `${kind}-${width}.png`) });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `${kind} ${width} horizontal overflow`);
      const badText = await page.locator("button,input,label,small,p,strong").evaluateAll((elements) => elements.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 11).map((el) => el.textContent));
      assert.deepEqual(badText, [], `${kind} text minimum`);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement !== document.body), true);
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.show("skills"));
  await page.getByText("从目录安装").waitFor();
  const transition = await page.getByText("从目录安装").evaluate((element) => getComputedStyle(element).transitionDuration);
  assert.equal(transition, "0s");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "PASS", viewports: 4, views: 3, output }));
} catch (error) {
  console.error(JSON.stringify({ pageErrors: errors }));
  throw error;
} finally { await browser.close(); }
