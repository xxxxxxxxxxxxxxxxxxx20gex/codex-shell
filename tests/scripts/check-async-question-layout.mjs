import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const {chromium} = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({executablePath: process.argv[3], headless: true});
const output = await mkdtemp(join(tmpdir(), 'cs-async-questions-'));
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/async-question-review', route => route.fulfill({contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type; window.__vite_plugin_react_preamble_installed__=true;
    await import('/@vite/client');
    const {default:React}=await import('/node_modules/.vite/deps/react.js');
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
    await import('/src/styles/tokens.css'); await import('/src/App.css'); await import('/src/features/threads/ConversationTimeline.css');
    const {AsyncQuestionCard}=await import('/src/features/threads/AsyncQuestionCard.tsx');
    window.sent=[];
    const h=React.createElement;
    ReactDOM.createRoot(document.getElementById('root')).render(h('main',{className:'conversation-turn-frame'},h(AsyncQuestionCard,{
      itemId:'probe-question', questions:[{title:'需要哪种项目？请选择或填写自己的需求。',options:['成品工具','可部署或二次开发的开源项目，包含中文说明和本地运行方式']},{title:'补充说明',options:null}],
      onSubmit:text=>{window.sent.push(text); return new Promise(resolve=>{window.finish=resolve;});}
    })));
  </script></body></html>`}));
  for (const [width,height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
    for (const theme of ['dark','light']) {
      await page.setViewportSize({width,height});
      await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1436}/async-question-review`);
      await page.locator('.async-question-card').waitFor();
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      const first=page.getByRole('textbox').first();
      await first.fill('自定义方向');
      await page.getByRole('textbox').last().fill('中文资料');
      await page.keyboard.press('Tab');
      assert.equal(await page.getByRole('button',{name:'发送回答',exact:true}).evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
      await page.keyboard.press('Escape');
      await page.locator('body').click({position:{x:2,y:2}});
      assert.equal(await first.inputValue(),'自定义方向','non-modal draft lost');
      await page.emulateMedia({reducedMotion:'reduce'});
      assert(await page.locator('.async-question-card').evaluate(el=>{
        const r=el.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth;
      }),'card overflow');
      assert(await page.locator('.async-question legend').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=11));
      await page.screenshot({path:join(output,`${theme}-${width}.png`)});
      await page.getByRole('button',{name:'发送回答',exact:true}).click();
      assert(await first.isDisabled());
      assert.equal(await page.evaluate(()=>window.sent.length),1);
      const wire=await page.evaluate(()=>window.sent[0]);
      assert(wire.includes('questionItemId'));
      await page.evaluate(()=>window.finish(true));
      await page.getByRole('button',{name:'已发送回答',exact:true}).waitFor();
    }
    console.log(`${width}x${height} passed (dark/light)`);
  }
  assert.deepEqual(errors,[]);
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
