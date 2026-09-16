import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const module = await import(pathToFileURL(process.argv[2]).href);
const { chromium } = module.default ?? module;
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/terminal-interaction-check", (route) => route.fulfill({ contentType: "text/html", body: `
    <div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
    await import('/@vite/client');
    const {default:React}=await import('/node_modules/.vite/deps/react.js');
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
    await import('/src/styles/tokens.css');
    await import('/src/App.css');
    const {TurnProcessEvents}=await import('/src/features/threads/TurnProcessEvents.tsx');
    const {ConversationTurn}=await import('/src/features/threads/ConversationTurn.tsx');
    const events=Array.from({length:20},(_,index)=>({kind:'terminalInteraction',itemId:'command-'+index,processId:String(index),stdinLength:1}));
    const command={type:'commandExecution',id:'command-complete',pluginId:null,scriptPath:null,command:'pnpm exec vitest run src/features/threads/ConversationTimeline.test.tsx --reporter=verbose',cwd:'C:\\work',processId:null,source:'agent',status:'completed',commandActions:[],aggregatedOutput:'26 tests passed',exitCode:0,durationMs:1200};
    const tool={type:'mcpToolCall',id:'tool-complete',server:'docs',tool:'search',status:'completed',arguments:{query:'app-server'},appContext:null,pluginId:null,readOnlyHint:true,result:{content:[],structuredContent:null,_meta:null},error:null,durationMs:500};
    const fileChange={type:'fileChange',id:'file-complete',status:'completed',changes:[{path:'src/App.tsx',kind:{type:'update',move_path:null},diff:'@@ -1 +1 @@\\n-old\\n+new'}]};
    const answer={type:'agentMessage',id:'answer-complete',text:'已完成检查。',phase:'final_answer',memoryCitation:null,questions:null,delivery:null};
    const turn={id:'turn-complete',items:[tool,fileChange,command,answer],itemsView:'full',status:'completed',error:null,startedAt:100,completedAt:108,durationMs:8000};
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('main',{style:{maxWidth:'760px',margin:'32px auto'}},React.createElement(TurnProcessEvents,{events}),React.createElement(ConversationTurn,{turn,active:false,canFork:false,activeItemTurnIds:{},mcpProgressByItemId:{}})));
    </script>` }));

  for (const [width, height] of [[1440, 900], [1280, 780], [1024, 720], [900, 700]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1435}/terminal-interaction-check`);
    const disclosure = page.locator(".terminal-interaction-disclosure");
    const summary = disclosure.locator("summary");
    assert.equal(await disclosure.getAttribute("open"), null);
    assert.equal(await page.getByText("终端交互 · 20 次").count(), 1);
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.notEqual(await disclosure.getAttribute("open"), null);
    await page.keyboard.press("Enter");
    assert.equal(await disclosure.getAttribute("open"), null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert(Number.parseFloat(await summary.evaluate((element) => getComputedStyle(element).fontSize)) >= 11);
    const processDisclosure = page.locator(".turn-process-disclosure");
    const processSummary = processDisclosure.locator(":scope > summary");
    assert.equal(await page.getByText("调用了工具、编辑了文件并运行了命令 · 8s").count(), 1);
    await processSummary.focus();
    await page.keyboard.press("Enter");
    const commandSummary = page.locator(".command-drawer > summary");
    assert.equal(await page.getByText("运行了命令", { exact: true }).count(), 1);
    assert.equal(await commandSummary.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    assert.equal(await commandSummary.locator(".command-drawer-label").evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    await processSummary.focus();
    await page.keyboard.press("Enter");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(errors.length, 0);
    console.log(`${width}x${height} passed`);
  }
} finally {
  await browser.close();
}
