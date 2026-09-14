import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.error(error.message); });
  await page.route("**/image-check", (route) => route.fulfill({ contentType: "text/html", body: `
    <div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
    await import('/@vite/client');
    const {default:React}=await import('/node_modules/.vite/deps/react.js');
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
    await import('/src/styles/tokens.css');
    const {AttachmentGallery}=await import('/src/features/attachments/AttachmentGallery.tsx');
    const {ImageAnnotationContext}=await import('/src/features/attachments/ImageAnnotationContext.ts');
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;
    canvas.getContext('2d').fillRect(0,0,1200,800);
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ImageAnnotationContext.Provider,{value:(image,text)=>window.result={image,text}},React.createElement(AttachmentGallery,{files:[],images:[{name:'sample.png',url:canvas.toDataURL()}],readFile:async()=>''})));
    </script>` }));
  for (const [width, height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1435}/image-check`);
    await page.getByTitle("预览 sample.png").click();
    await page.getByLabel("添加图片批注", { exact: true }).click();
    const target = page.getByLabel("在图片上添加批注（键盘添加到中心）");
    await target.click();
    await page.getByPlaceholder("描述这个位置").fill("这里调整");
    const rect = await page.locator('.attachment-preview-dialog').boundingBox();
    assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByText('插入到消息', {exact:true}).click();
    assert.match((await page.evaluate(() => window.result)).text, /这里调整/);
    await page.getByTitle("预览 sample.png").click();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByTitle("预览 sample.png").click();
    await page.locator('.attachment-preview-scrim').click({position:{x:2,y:2}});
    assert.equal(await page.getByRole('dialog').count(), 0);
    console.log(`${width}x${height} passed`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
