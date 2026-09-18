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
await import("/src/App.css");
await import("/src/features/commands/CommandPanels.css");
await import("/src/features/commands/ExtensionManagement.css");
const {SkillManagementPage} = await import("/src/features/commands/SkillManagementPage.tsx");
const {PluginManagementPage} = await import("/src/features/commands/PluginManagementPage.tsx");
const {PluginDetailView} = await import("/src/features/commands/PluginDetailView.tsx");
const {McpStatusPanel} = await import("/src/features/commands/McpStatusPanel.tsx");
document.body.style.cssText = "margin:0;background:var(--surface-canvas);color:var(--text-primary);font:13px Segoe UI";
const root = ReactDOM.createRoot(document.getElementById("root"));
const noop = () => {};
const skill = {name:"example-skill",description:"这是一个用于验证长中文描述和操作区域的技能",enabled:true,scope:"user",pluginId:null,path:"C:/cs/skills/demo/SKILL.md"};
const plugin = {id:"demo",name:"本地插件",installed:true,enabled:true,availability:"AVAILABLE",installPolicy:"AVAILABLE",authPolicy:"ON_USE",interface:null};
const office = {summary:{...plugin,name:'cs-office',installed:false,version:'0.1.0',interface:{displayName:'CS Office',shortDescription:'创建和编辑本地办公文件',longDescription:'在 Codex Shell 中创建、编辑并验证 PDF、Word 文档和电子表格。所有处理均在本机完成。',developerName:'Codex Shell Contributors'}},skills:['文档','PDF','电子表格'].map((name,i)=>({...skill,name,path:'C:/cs/'+i+'/SKILL.md',description:'创建、编辑并验证本地办公文件'})),apps:[],hooks:[],mcpServers:[]};
const extensions = {listPlugins:async()=>({marketplaces:[{name:"local-marketplace",path:"C:/market.json",plugins:[plugin,{...plugin,id:'hidden',name:'Game Studio',installed:false}]}],marketplaceLoadErrors:[]}),readPlugin:async()=>({plugin:{summary:plugin,description:'本地办公插件',skills:[skill],hooks:[],apps:[],mcpServers:[]}}),readSkillContent:async()=>('# 技能内容\\n\\n可读取和编辑文档。\\n\\n'.repeat(40)),setSkillEnabled:async(path,enabled)=>enabled};
window.show = (kind) => {
 const content = kind === 'preview' ? React.createElement('div',{className:'skill-management-page extension-page plugin-detail-page'},React.createElement(PluginDetailView,{detail:office,extensions,onClose:noop,onChanged:noop,onInstall:noop})) : kind === "skills" ? React.createElement(SkillManagementPage,{loadSkills:async()=>[skill,{...skill,name:"system-example",scope:"system",path:"C:/cs/skills/.system/example/SKILL.md"},{...skill,name:"cs-office:cs-pdf",pluginId:"cs-office@cs-curated",path:"C:/cs/plugins/pdf/SKILL.md"}],revision:0,codexHome:"C:/cs",setEnabled:async()=>false,readSkillContent:extensions.readSkillContent,onOpenSkillPath:async()=>{},onClose:noop}) :
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
    await page.evaluate(() => window.show('preview'));
    await page.getByRole('button', {name:'安装插件'}).waitFor();
    assert.equal(await page.getByRole('switch').count(), 3);
    for (const control of await page.getByRole('switch').all()) {
      assert.equal(await control.isDisabled(), true);
      assert.equal(await control.isChecked(), false);
    }
    assert.equal(await page.locator('.plugin-detail-heading h1').evaluate(el=>getComputedStyle(el).fontSize),'14px');
    await page.screenshot({path:join(output, `office-preview-${width}.png`)});
    await page.getByRole('button', {name:/PDF/}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('dialog').getByText('可读取和编辑文档。').first().waitFor();
    await page.screenshot({path:join(output, `office-content-${width}.png`)});
    await page.getByRole('button', {name:'关闭技能详情'}).click();
    await page.getByRole('dialog').waitFor({state:'detached'});
    for (const kind of ["skills", "plugins", "mcp"]) {
      await page.evaluate((view) => window.show(view), kind);
      await page.getByText(kind === "skills" ? /^example-skill/ : kind === "plugins" ? "本地插件" : "添加 MCP").first().waitFor();
      if (kind === 'skills') {
        const row = page.getByRole('switch', {name:'example-skill 启用状态'}).locator('..');
        const toggle = await row.getByRole('switch').boundingBox();
        const remove = await row.getByRole('button', {name:'卸载'}).boundingBox();
        assert.ok(remove.x + remove.width <= toggle.x && Math.abs(remove.y + remove.height / 2 - toggle.y - toggle.height / 2) < 2);
        assert.equal(await row.locator('button').last().getAttribute('role'), 'switch');
        for (const group of ['CS 内置','个人','系统']) assert.equal(await page.getByRole('region', {name:group,exact:true}).count(),1);
        assert.equal(await page.getByText('当前环境技能',{exact:true}).count(),0);
        await page.getByRole('button', {name:/example-skill/}).click();
        await page.getByRole('dialog').waitFor();
        await page.getByRole('button', {name:'更多操作'}).click();
        assert.equal(await page.getByRole('menuitem', {name:'在资源管理器中显示'}).count(),1);
        await page.screenshot({path:join(output, `skill-detail-${width}.png`)});
        await page.getByRole('button', {name:'关闭技能详情'}).click();
        await page.getByRole('dialog').waitFor({state:'detached'});
      }
      if (kind === 'plugins') {
        assert.equal(await page.getByRole('heading',{level:2}).count(),0);
        assert.equal(await page.getByText('Game Studio',{exact:true}).count(),0);
        assert.equal(await page.getByText('添加来源',{exact:true}).count(),0);
        await page.getByText('详情',{exact:true}).last().click();
        await page.screenshot({ path: join(output, `plugin-detail-${width}.png`) });
        await page.getByRole('switch').click();
        await page.getByRole('button', { name: /example-skill/ }).click();
        await page.getByRole('dialog').waitFor();
        await page.getByRole('dialog').getByText('可读取和编辑文档。').first().waitFor();
        const modalSwitch = await page.getByRole('dialog').getByRole('switch').boundingBox();
        const closeButton = await page.getByRole('button', {name:'关闭技能详情'}).boundingBox();
        assert.ok(closeButton.x + closeButton.width <= modalSwitch.x);
        assert.equal(await page.getByRole('dialog').getByRole('switch').isChecked(), false);
        await page.screenshot({ path: join(output, `plugin-skill-${width}.png`) });
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({state:'detached'});
        assert.equal(await page.getByRole('button', {name:/example-skill/}).evaluate(el=>el===document.activeElement),true);
        await page.getByRole('button', { name: /example-skill/ }).click();
        await page.getByRole('dialog').waitFor();
        await page.mouse.click(5,5);
        await page.getByRole('dialog').waitFor({state:'detached'});
        await page.getByRole('button',{name:'关闭详情',exact:true}).click();
      }
      await page.screenshot({ path: join(output, `${kind}-${width}.png`) });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `${kind} ${width} horizontal overflow`);
      const badText = await page.locator("button,input,label,small,p,strong").evaluateAll((elements) => elements.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 11).map((el) => el.textContent));
      assert.deepEqual(badText, [], `${kind} text minimum`);
      await page.locator("button:enabled").first().focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement !== document.body), true);
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.show("skills"));
  await page.getByText("从目录安装").waitFor();
  const transition = await page.getByText("从目录安装").evaluate((element) => getComputedStyle(element).transitionDuration);
  assert.ok(parseFloat(transition) <= 0.001, `reduced-motion transition: ${transition}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "PASS", viewports: 4, views: 3, output }));
} catch (error) {
  console.error(JSON.stringify({ pageErrors: errors }));
  throw error;
} finally { await browser.close(); }
