import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const data='data:application/pdf;base64,'+(await readFile(process.argv[4])).toString('base64');
const browser=await chromium.launch({executablePath:process.argv[3],headless:true});
const output=await mkdtemp(join(tmpdir(),'cs-pdf-'));
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/pdf-check',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script type="module">
 import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 await import('/@vite/client');const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
 await import('/src/styles/tokens.css');await import('/src/App.css');const {PdfPreview}=await import('/src/features/workspaces/PdfPreview.tsx');
 const root=ReactDOM.createRoot(document.getElementById('root'));
 window.showPdf=dataUrl=>root.render(React.createElement('div',{style:{height:'90vh',width:'calc(100vw - 340px)',marginLeft:320}},React.createElement(PdfPreview,{dataUrl,name:'测试 PDF'})));
 window.clearPdf=()=>root.render(null);
 </script></body></html>`}));
 for(const [width,height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:1436/pdf-check');await page.waitForFunction(()=>!!window.showPdf);await page.evaluate(data=>window.showPdf(data),data);
  await page.locator('canvas:visible').waitFor({timeout:30000});
  assert.equal(await page.getByRole('button',{name:'上一页'}).isDisabled(),true);
  const pixels=()=>page.locator('canvas').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]<200)n++;return n;});
  assert(await pixels()>100);await page.getByRole('button',{name:'下一页'}).click();await page.getByText('2 / 2',{exact:true}).waitFor();await page.locator('canvas:visible').waitFor();await page.waitForFunction(()=>{const c=document.querySelector('canvas');if(!c||getComputedStyle(c).display==='none')return false;const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return a.some((v,i)=>i%4===0&&v<200)});assert(await pixels()>100);
  await page.screenshot({path:join(output,`${width}.png`)});
  await page.getByRole('button',{name:'上一页'}).focus();await page.keyboard.press('Enter');await page.getByText('1 / 2',{exact:true}).waitFor();
  await page.evaluate(()=>window.showPdf('data:application/pdf;base64,YmFk'));await page.getByRole('alert').waitFor();
  await page.evaluate(data=>{window.showPdf(data);setTimeout(()=>window.clearPdf(),0);},data);
 }
 assert.deepEqual(errors,[]);console.log('PASS real PDF pixels, pagination, keyboard, corrupt-file error, unmount; four sizes. '+output);
}finally{await browser.close();}
