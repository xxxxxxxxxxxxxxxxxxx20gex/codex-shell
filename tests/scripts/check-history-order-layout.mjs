import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const output = await mkdtemp(join(tmpdir(), 'cs-history-order-'));
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/history-order-probe', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type; window.__vite_plugin_react_preamble_installed__=true;
    await import('/@vite/client');
    const {default:React}=await import('/node_modules/.vite/deps/react.js');
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
    await import('/src/styles/tokens.css'); await import('/src/App.css');
    const {ThreadHistoryList}=await import('/src/features/threads/ThreadHistoryList.tsx');
    const h=React.createElement, noop=()=>{};
    window.opened=[];
    const threads=Array.from({length:30},(_,i)=>({id:'t'+i,name:i===1?'用于验证历史会话长标题省略以及中英文混排的 Session 名称':'历史会话 '+i,preview:'',path:null,cwd:'C:/fixture',updatedAt:1786334400-i,section:i===0?{id:'01984de2-8f74-7c91-a3b2-5c5e937cf318'}:null}));
    ReactDOM.createRoot(document.getElementById('root')).render(h('aside',{className:'sidebar panel',style:{width:248,height:'100vh'}},h(ThreadHistoryList,{threads,orderScope:'probe',archived:false,activeThreadId:'t1',loading:false,error:'',disabled:false,actionThreadId:null,runningThreadIds:new Set(['t2']),hasMore:false,onOpen:id=>window.opened.push(id),onRename:noop,onTogglePin:noop,onArchive:noop,onUnarchive:noop,onDelete:noop,onShowArchived:noop,onLoadMore:noop})));
  </script></body></html>` }));
  const order = () => page.locator('[data-history-thread]').evaluateAll(rows => rows.map(row => row.dataset.historyThread));
  const button = id => page.locator(`[data-history-thread="${id}"] .thread-main`);
  const dragTo = async (source, target, cancel = false) => {
    const a = await button(source).boundingBox();
    const b = await button(target).boundingBox();
    await page.mouse.move(a.x + 40, a.y + 25); await page.mouse.down();
    await page.mouse.move(b.x + 40, b.y + 6, { steps: 8 });
    if (cancel) await page.keyboard.press('Escape');
    else if (target !== 't0') {
      assert.equal(await page.locator('.thread-drop-marker.before').count(), 1);
      await page.screenshot({ path: join(output, 'drop-' + page.viewportSize().width + '.png') });
    }
    await page.mouse.up();
  };
  for (const [width, height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://localhost:1436/history-order-probe');
    await button('t1').waitFor();
    await page.evaluate(() => localStorage.clear()); await page.reload(); await button('t1').waitFor();
    await dragTo('t3', 't1');
    assert.deepEqual((await order()).slice(0,4), ['t0','t3','t1','t2']);
    assert.deepEqual(await page.evaluate(() => window.opened), []);
    await page.reload(); await button('t1').waitFor();
    assert.deepEqual((await order()).slice(0,4), ['t0','t3','t1','t2']);
    await dragTo('t2','t1',true);
    assert.deepEqual((await order()).slice(0,4), ['t0','t3','t1','t2']);
    await dragTo('t2','t0');
    assert.equal((await order())[0], 't0');
    await button('t2').focus(); await page.keyboard.press('Alt+ArrowUp');
    assert.deepEqual((await order()).slice(0,4), ['t0','t3','t2','t1']);
    assert(await button('t2').evaluate(el => el === document.activeElement));
    await page.keyboard.press('Shift+F10'); await page.getByRole('menu', {name:'会话操作'}).waitFor();
    await page.keyboard.press('Escape');
    assert(await button('t2').evaluate(el => el === document.activeElement));
    await button('t2').click({button:'right'}); await page.mouse.click(500,200);
    assert.equal(await page.getByRole('menu', {name:'会话操作'}).count(),0);
    await button('t2').click({button:'right'}); await page.getByRole('menuitem',{name:'重置手动排序'}).click();
    assert.deepEqual((await order()).slice(0,4), ['t0','t1','t2','t3']);
    assert.equal(await button('t1').evaluate(el=>el.getBoundingClientRect().height),56);
    assert(await button('t1').locator('.thread-title-text').evaluate(el=>el.scrollWidth>el.clientWidth));
    assert(await page.locator('.thread-list').evaluate(el=>el.scrollWidth<=el.clientWidth));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>document.documentElement.dataset.theme='light');
    await dragTo('t3','t1');
    // Holding at the viewport edge must scroll without further pointer movement.
    const start = await button('t3').boundingBox();
    const list = await page.locator('.thread-list').boundingBox();
    await page.mouse.move(start.x+40,start.y+20); await page.mouse.down();
    await page.mouse.move(start.x+40,list.y+list.height-5,{steps:8});
    await page.waitForFunction(()=>document.querySelector('.thread-list').scrollTop>60);
    await page.keyboard.press('Escape'); await page.mouse.up();
    console.log(width+'x'+height+' passed');
  }
  assert.deepEqual(errors, []);
  console.log('Screenshots: '+output);
} finally { await browser.close(); }
