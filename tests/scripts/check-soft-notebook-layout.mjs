import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Actual UI components with inert fixture data; no Runtime or credential access.
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const output = await mkdtemp(join(tmpdir(), "cs-soft-notebook-"));
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
  await page.route("**/soft-notebook", route => route.fulfill({ contentType: "text/html", body: `
<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
await import('/@vite/client');
const {default:React}=await import('/node_modules/.vite/deps/react.js');
const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
await import('/src/styles/tokens.css'); await import('/src/App.css');
const {PreferencesPanel}=await import('/src/features/preferences/PreferencesPanel.tsx');
const {SkillManagementPage}=await import('/src/features/commands/SkillManagementPage.tsx');
const {SlashCommandMenu}=await import('/src/features/commands/SlashCommandMenu.tsx');
const {EmptyWorkspace}=await import('/src/features/layout/EmptyWorkspace.tsx');
const {RuntimeLogStore}=await import('/src/features/runtime/runtimeLogStore.ts');
const {RuntimeNoticeStore}=await import('/src/features/runtime/runtimeNoticeStore.ts');
const {ContextMenu}=await import('/src/shared/ContextMenu.tsx');
const {Copy}=await import('/node_modules/.vite/deps/lucide-react.js');
const h=React.createElement, noop=()=>{}, root=ReactDOM.createRoot(document.getElementById('root'));
const skills=['image-gen','amap','project-management-docs','cs-docs','code-review'].map((name,i)=>({name,description:'提供清楚的操作说明，保持控件与文档一致。',path:'C:/fixture/skills/'+name+'/SKILL.md',enabled:i!==1,scope:'user'}));
const loadSkills=async()=>skills;
const logStore=new RuntimeLogStore(), noticeStore=new RuntimeNoticeStore();
function Host({view}) {
 const [selected,setSelected]=React.useState('');
 const [closed,setClosed]=React.useState(false);
 if(closed)return h('button',{id:'reopen',onClick:()=>setClosed(false)},'重新打开');
 const close=()=>{window.closedCount=(window.closedCount||0)+1;setClosed(true)};
 if(view==='skills')return h('div',{style:{height:'100%',overflow:'auto'}},h(SkillManagementPage,{loadSkills,revision:0,codexHome:'C:/fixture',setEnabled:async()=>true,onClose:close,readSkillContent:async()=> '# 使用说明\\n\\n维护项目文档与当前实现。',onOpenSkillPath:noop}));
 if(view==='slash')return h('div',{className:'composer-wrap',style:{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)'}},h('div',{className:'composer'},h('textarea',{defaultValue:'/', 'aria-label':'输入消息'}),h(SlashCommandMenu,{query:'',selectedIndex:0,hasThread:true,running:false,onSelect:id=>{window.selectedCommand=id;setSelected(id)}}),h('span',null,selected)));
 if(view==='empty')return h(EmptyWorkspace);
 if(view==='context')return h(React.Fragment,null,h('button',{id:'anchor'},'操作'),h(ContextMenu,{label:'测试菜单',anchor:document.body,x:80,y:80,actions:[{label:'复制',icon:h(Copy),run:noop}],onClose:close,onError:noop}));
 return h(PreferencesPanel,{initialSection:view,settings:{customInstructions:'',theme:'light'},providerSettings:{schemaVersion:2,activeChannelId:null,channels:[]},onSaveProviderSettings:async()=>{},codexHome:'C:/fixture',codexHomeDisabled:true,windowsSandboxReadiness:'ready',noticeStore,logStore,onSetupWindowsSandbox:async()=>true,onRestart:async()=>{},onClose:close,onSave:async()=>{}});
}
window.show=view=>root.render(h(Host,{key:view+Date.now(),view})); window.show('skills');
</script></body></html>` }));
  for (const [width, height] of [[1440, 900], [1280, 780], [1024, 720], [900, 700]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1435}/soft-notebook`);
    await page.waitForFunction(() => typeof window.show === "function");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      if (theme === "dark") {
        const tinted = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          return ['--surface-canvas','--surface-sidebar','--surface-panel','--surface-raised','--surface-selected','--surface-input','--surface-action','--accent-action'].filter(name => {
            const rgb = css.getPropertyValue(name).trim().slice(1).match(/../g).map(x => parseInt(x, 16));
            return Math.max(...rgb) - Math.min(...rgb) > 8;
          });
        });
        assert.deepEqual(tinted, [], 'dark surfaces and actions stay neutral gray');
      }
      const contrast = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        const color = name => css.getPropertyValue(name).trim();
        const luminance = hex => {
          const values = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
          return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
        };
        const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        const result = [];
        for (const foreground of ['--text-primary','--text-secondary','--text-muted','--accent-action']) {
          for (const background of ['--surface-canvas','--surface-panel','--surface-selected','--surface-input']) {
            result.push({foreground,background,ratio:ratio(luminance(color(foreground)),luminance(color(background)))});
          }
        }
        result.push({foreground:'action ink',ratio:ratio(luminance(color('--text-on-action')),luminance(color('--surface-action')))});
        for (const background of ['--accent-action','--accent-info']) {
          result.push({foreground:'marker ink',background,ratio:ratio(luminance(color('--text-on-accent')),luminance(color(background)))});
        }
        result.push({foreground:'danger ink',ratio:ratio(luminance(color('--text-on-danger')),luminance(color('--accent-danger')))});
        return result;
      });
      assert.deepEqual(contrast.filter(x => x.ratio < 4.5), [], `${theme} readable text contrast`);
      for (const view of ["skills", "slash", "appearance", "personalization", "runtime", "diagnostics", "empty", "context"]) {
        await page.evaluate(view => window.show(view), view);
        const locator = page.locator(view === "skills" ? ".skill-management-page" : view === "slash" ? ".slash-command-menu" : view === "empty" ? ".conversation-empty" : view === "context" ? ".explorer-context-menu" : ".preferences-modal");
        await locator.waitFor();
        assert(await locator.evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
        }), `${view} ${width} bounds`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (view === "skills") {
          await page.getByText("兔子生图", { exact: true }).waitFor();
          assert.equal(await page.locator('.skill-management-icon svg').first().evaluate(el => el.getBoundingClientRect().width), 16);
          assert.equal(await page.locator('.skill-management-card').first().evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
          await page.getByRole('button', {name:/项目文档管理/}).first().click();
          await page.getByRole('dialog').waitFor();
          await page.getByText('维护项目文档与当前实现。',{exact:true}).waitFor();
          await page.screenshot({path:join(output,`skill-detail-${theme}-${width}.png`)});
          await page.keyboard.press('Escape');
          await page.getByRole('dialog').waitFor({state:'detached'});
          await page.getByRole('button', {name:/项目文档管理/}).first().click();
          await page.getByRole('dialog').waitFor();
          await page.mouse.click(2,2);
          await page.getByRole('dialog').waitFor({state:'detached'});
        }
        if (view === "slash") {
          assert.equal(await page.getByRole('option').count(), 7);
          assert.equal(await page.getByRole('option').first().evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
          await page.getByRole('option').first().click();
          assert.equal(await page.evaluate(()=>window.selectedCommand),'skills');
        }
        if (view === "appearance") {
          await page.keyboard.press('Tab');
          await page.getByRole('radio',{name:/浅色/}).focus();
          assert.equal(await page.getByRole('radio',{name:/浅色/}).evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
          await page.getByRole('radio',{name:/深色/}).click();
          assert.equal(await page.getByRole('radio',{name:/深色/}).getAttribute('aria-checked'),'true');
          await page.getByRole('radio',{name:theme === 'light' ? /浅色/ : /深色/}).click();
        }
        const undersized = await locator.locator('button,input,textarea,small,p,strong,span').evaluateAll(elements => elements.filter(el=>el.getClientRects().length && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize)<11).map(el=>el.textContent));
        assert.deepEqual(undersized, [], `${view} minimum typography`);
        await page.screenshot({path:join(output,`${view}-${theme}-${width}.png`)});
        if (!["skills","slash","empty"].includes(view)) {
          await page.keyboard.press('Escape');
          await page.getByRole('button',{name:'重新打开'}).waitFor();
        }
      }
    }
    await page.evaluate(()=>document.documentElement.dataset.theme='system');
    await page.emulateMedia({colorScheme:'dark'});
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--surface-canvas').trim()),'#101112');
    await page.emulateMedia({colorScheme:'light'});
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--surface-canvas').trim()),'#FCF9F4');
    console.log(`${width}x${height}: skills, menus, settings, empty state, portals, contrast and system theme passed`);
  }
  assert.deepEqual(errors, []);
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
