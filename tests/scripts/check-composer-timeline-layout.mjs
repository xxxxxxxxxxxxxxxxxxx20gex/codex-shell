import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/composer-timeline-check', route => route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><body><div id="root" style="height:100vh"></div><script type="module">
    import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
    await import('/@vite/client');
    const {default:React}=await import('/node_modules/.vite/deps/react.js');
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
    await import('/src/styles/tokens.css');await import('/src/App.css');
    const {ConversationTimeline}=await import('/src/features/threads/ConversationTimeline.tsx');
    const {ComposerResizeHandle}=await import('/src/features/composer/ComposerResizeHandle.tsx');
    const h=React.createElement;
    const turns=Array.from({length:12},(_,i)=>({id:'turn-'+i,status:'completed',itemsView:'full',items:[{id:'u'+i,type:'userMessage',content:[{type:'text',text:'用户消息 '+i,text_elements:[]}]},{id:'a'+i,type:'agentMessage',text:('这是用于验证布局的回复内容。\\n\\n').repeat(4),phase:null}],error:null}));
    function Fixture(){const ref=React.useRef(null);return h('section',{className:'conversation panel'},h('header',{className:'conversation-header'},'布局验证'),h(ConversationTimeline,{turns,running:false}),h('div',{className:'composer-wrap'},h('div',{className:'composer'},h(ComposerResizeHandle,{inputRef:ref}),h('textarea',{ref,style:{height:80},'aria-label':'输入'}),h('div',{className:'composer-toolbar'},'输入工具栏'))));}
    ReactDOM.createRoot(document.getElementById('root')).render(h(Fixture));
  </script></body></html>`}));
  const geometry = () => page.evaluate(() => {
    const rect = selector => {const b=document.querySelector(selector).getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height};};
    const el=document.querySelector('.timeline');
    return {nav:rect('.user-message-navigation'),scroll:rect('.timeline'),composer:rect('.composer'),last:rect('.conversation-turn-frame.last'),input:rect('textarea'),top:el.scrollTop,sh:el.scrollHeight,ch:el.clientHeight,pad:el.style.paddingBottom};
  });
  for(const [width,height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
    await page.setViewportSize({width,height});await page.goto('http://localhost:1436/composer-timeline-check');
    await page.locator('.user-message-navigation').waitFor();
    await page.waitForFunction(()=>parseFloat(document.querySelector('.timeline').style.getPropertyValue('--composer-clearance'))>0);
    await page.locator('.timeline').evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll'));});
    await page.waitForTimeout(100);
    const before=await geometry();
    const handle=page.getByRole('button',{name:'调整输入框高度'});
    const box=await handle.boundingBox();
    await page.mouse.move(box.x+12,box.y+12);await page.mouse.down();await page.mouse.move(box.x+12,box.y-160,{steps:10});await page.mouse.up();
    await page.waitForFunction(()=>document.querySelector('textarea').getBoundingClientRect().height>200);
    await page.waitForTimeout(100);
    const after=await geometry();
    assert.equal(after.nav.top,before.nav.top,'left navigation stays fixed');
    assert.equal(after.scroll.height,before.scroll.height,'scrollbar track stays fixed');
    assert.equal(after.composer.bottom,before.composer.bottom,'composer bottom stays fixed');
    assert(after.composer.top<before.composer.top-150);
    assert(after.last.bottom<=after.composer.top+1,`last reply is above composer: ${JSON.stringify({before,after})}`);
    await page.locator('.timeline').evaluate(el=>{el.scrollTop=300;el.dispatchEvent(new Event('scroll'));});
    await page.waitForTimeout(100);
    const reading=await geometry();
    await handle.focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(100);
    assert.equal((await geometry()).top,reading.top,'resizing preserves history scroll position');
    const original=(await geometry()).input.height;
    const second=await handle.boundingBox();
    await page.mouse.move(second.x+12,second.y+12);await page.mouse.down();await page.mouse.move(second.x+12,second.y-30,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();
    assert.equal((await geometry()).input.height,original,'Escape restores input height');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.mouse.click(width-3,10);
    assert(await page.locator('.timeline-shell').evaluate(el=>el.scrollWidth<=el.clientWidth));
    console.log(width+'x'+height+' passed');
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
