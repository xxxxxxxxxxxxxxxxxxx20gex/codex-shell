import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({executablePath:process.argv[3],headless:true});
const output=await mkdtemp(join(tmpdir(),'cs-citations-'));
try {
 const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/citation-check',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script type="module">
 import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 await import('/@vite/client');const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
 await import('/src/styles/tokens.css');await import('/src/App.css');await import('/src/features/threads/ConversationTimeline.css');
 const {MarkdownContent}=await import('/src/features/threads/MarkdownContent.tsx');const {TurnResourceOutputs}=await import('/src/features/threads/TurnResourceOutputs.tsx');
 const text='已生成两页竖版 A4 PDF。\\n\\n:codex-file-citation{path="C:/work/绩效表_竖版.pdf" purpose="output"}';
 window.opened=[];const onOpenPath=path=>window.opened.push(path);
 const item={type:'agentMessage',id:'a',text,phase:'final_answer',memoryCitation:null,questions:null,delivery:null};
 ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('main',{style:{maxWidth:760,width:'calc(100% - 80px)',margin:'40px auto'}},React.createElement(MarkdownContent,{className:'agent-response',onOpenPath},text),React.createElement(TurnResourceOutputs,{items:[item],onOpenPath})));
 </script></body></html>`}));
 for(const [width,height] of [[1440,900],[1280,780],[1024,720],[900,700]]) for(const theme of ['light','dark']) {
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:1436/citation-check');await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  const link=page.getByRole('link',{name:'绩效表_竖版.pdf'});await link.waitFor();await link.focus();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'打开 C:/work/绩效表_竖版.pdf',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.opened),['C:/work/绩效表_竖版.pdf','C:/work/绩效表_竖版.pdf']);
  assert.equal(await page.getByRole('region',{name:'回复附件'}).count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('body').innerText().then(t=>t.includes(':codex-file-citation')),false);
  await page.keyboard.press('Escape');await page.locator('main').click({position:{x:2,y:2}});
  await page.screenshot({path:join(output,`${theme}-${width}.png`)});
 }
 assert.deepEqual(errors,[]);console.log('PASS four sizes, two themes, file links, attachment discovery, keyboard and overflow. Screenshots: '+output);
} finally {await browser.close();}
