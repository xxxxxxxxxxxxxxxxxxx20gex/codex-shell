import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Real side-chat hook and panel, inert IPC fixture; no user history or API keys.
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const output = await mkdtemp(join(tmpdir(), "cs-side-chat-"));
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/side-chat-fixture", route => route.fulfill({ contentType: "text/html", body: `
<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
await import('/@vite/client');
const {default:React}=await import('/node_modules/.vite/deps/react.js');
const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
await import('/src/styles/tokens.css'); await import('/src/App.css');
const {useSideChat}=await import('/src/features/runtime/useSideChat.ts');
const {SideChatPanel}=await import('/src/features/runtime/SideChatPanel.tsx');
const {fakeThread,fakeTurn,settings}=await import('/src/features/runtime/sideChatTestFixtures.ts');
const h=React.createElement, noop=()=>{};
let next=0;
window.released=[]; window.interrupted=[];
const client={connectionStatus:'ready', startThread:async()=>({thread:{...fakeThread(),id:'side-'+(++next)}}),
 startTurn:async()=>({turn:fakeTurn('inProgress')}),
 unsubscribeThread:async({threadId})=>{window.released.push(threadId);return {status:'unsubscribed'}},
 interruptTurn:async({threadId})=>{window.interrupted.push(threadId);return {}}};
const clientRef={current:client}, ensureConnected=async()=>client;
function Host(){
 const [parentId,setParentId]=React.useState('A');
 const [visible,setVisible]=React.useState(true);
 const [maximized,setMaximized]=React.useState(false);
 const chat=useSideChat({clientRef,ensureConnected,mainThread:{...fakeThread(),id:parentId},mainTurns:[],settings,markThreadRunning:noop,markThreadStopped:noop});
 window.finishA=()=>chat.subscriptionHandlers.onTurnCompleted({threadId:'side-1',turn:{...fakeTurn('completed'),items:[
  {type:'userMessage',id:'user-A',content:[{type:'text',text:'问题 A',text_elements:[]}]},
  {type:'agentMessage',id:'answer-A',text:'后台回答 A',phase:'final_answer',memoryCitation:null,delivery:null,questions:null}
 ]}});
 return h('div',{style:{height:'100vh',display:'grid',gridTemplateRows:'40px minmax(0,1fr)'}},
  h('nav',null,...['A','B'].map(id=>h('button',{key:id,onClick:()=>{setParentId(id);setVisible(true)}},'主会话 '+id)),h('button',{onClick:()=>chat.reset()},'模拟 Runtime 重置')),
  h('aside',{style:{width:maximized?'100%':'288px',maxWidth:'100%',justifySelf:'end',minHeight:0}},
   chat.thread && visible ? h(SideChatPanel,{key:chat.thread.id,chat,maximized,onToggleMaximize:()=>setMaximized(v=>!v),onBack:()=>setVisible(false),onClose:()=>chat.close()})
    : h('button',{onClick:async()=>{await chat.openChat();setVisible(true)}},'打开侧聊')));
}
ReactDOM.createRoot(document.getElementById('root')).render(h(Host));
</script></body></html>` }));
  for (const [width, height] of [[1440, 900], [1280, 780], [1024, 720], [900, 700]]) {
    await page.setViewportSize({ width, height });
    for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1436}/side-chat-fixture`);
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await page.getByRole("button", { name: "打开侧聊" }).click();
      await page.getByRole("textbox").fill("问题 A");
      await page.getByRole("textbox").press("Enter");
      await page.getByRole("button", { name: "停止侧边聊天" }).waitFor();
      await page.getByRole("textbox").fill("草稿 A");
      await page.getByRole("button", { name: "主会话 B" }).click();
      await page.getByRole("button", { name: "打开侧聊" }).click();
      assert.equal(await page.getByRole("textbox").inputValue(), "");
      await page.getByRole("textbox").fill("草稿 B");
      await page.evaluate(() => window.finishA());
      assert.equal(await page.getByText("后台回答 A", { exact: true }).count(), 0);
      await page.getByRole("button", { name: "主会话 A" }).click();
      await page.getByText("后台回答 A", { exact: true }).waitFor();
      assert.equal(await page.getByRole("textbox").inputValue(), "草稿 A");
      assert.deepEqual(await page.evaluate(() => window.released), []);
      assert.deepEqual(await page.evaluate(() => window.interrupted), []);
      await page.getByRole("button", { name: "返回功能区" }).click();
      await page.getByRole("button", { name: "打开侧聊" }).click();
      assert.equal(await page.getByRole("textbox").inputValue(), "草稿 A");
      const panel = page.getByRole("region", { name: "侧边聊天" });
      const bounds = await panel.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1);
      assert.equal(await panel.locator('.side-chat-actions svg').first().evaluate(el => el.getBoundingClientRect().width), 16);
      const small = await panel.locator('button,small,strong,textarea').evaluateAll(elements => elements.filter(el => el.getClientRects().length && parseFloat(getComputedStyle(el).fontSize)<11).length);
      assert.equal(small, 0, await panel.locator('button,small,strong,textarea').evaluateAll(elements => JSON.stringify(elements.filter(el => el.getClientRects().length && parseFloat(getComputedStyle(el).fontSize)<11).map(el => ({html:el.outerHTML,font:getComputedStyle(el).fontSize})))));
      await page.getByRole("textbox").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), "发送");
      await page.keyboard.press("Escape");
      await page.screenshot({ path: join(output, `retained-${theme}-${width}.png`) });
      await page.getByRole("button", { name: "关闭侧边聊天" }).click();
      await page.getByRole("button", { name: "打开侧聊" }).waitFor();
      await page.getByRole("button", { name: "主会话 B" }).click();
      assert.equal(await page.getByRole("textbox").inputValue(), "草稿 B");
      await page.getByRole("button", { name: "模拟 Runtime 重置" }).click();
      await page.getByRole("button", { name: "打开侧聊" }).waitFor();
      assert.deepEqual(await page.evaluate(() => window.released), ["side-1", "side-2"]);
    }
    console.log(`${width}x${height}: retained side chat, background reply, drafts, close/reset and layout passed`);
  }
  assert.deepEqual(errors, []);
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
