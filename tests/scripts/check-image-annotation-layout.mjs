import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1.5 });
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
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ImageAnnotationContext.Provider,{value:(image,text)=>window.result={image,text}},React.createElement(AttachmentGallery,{files:[],images:[{name:'sample.png',url:canvas.toDataURL()},{name:'hosted image',fileId:'file-probe'}],readFile:async()=>{throw new Error('Unexpected file read')}})));
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
    await page.getByTitle("预览 hosted image").click();
    assert.equal(await page.getByText("此图片暂不支持本地预览").count(), 1);
    assert.equal(await page.getByLabel("添加图片批注", { exact: true }).count(), 0);
    const hostedRect = await page.locator('.attachment-preview-dialog').boundingBox();
    assert(hostedRect.x >= 0 && hostedRect.y >= 0 && hostedRect.x + hostedRect.width <= width && hostedRect.y + hostedRect.height <= height);
    const messageSize = await page.getByText("图片引用已保留，编辑消息时仍会随消息发送。").evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    assert(messageSize >= 11);
    await page.locator('.attachment-preview-actions button').focus();
    assert(await page.locator('.attachment-preview-actions button').evaluate((element) => document.activeElement === element));
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByTitle("预览 sample.png").click();
    await page.locator('.attachment-preview-scrim').click({position:{x:2,y:2}});
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByTitle("预览 sample.png").click();
    await page.getByLabel("编辑草图", { exact: true }).click();
    const slider = page.getByRole("slider", { name: "笔刷粗细" });
    const marker = page.locator(".image-sketch-size-marker");
    await slider.focus();
    await page.keyboard.press("End");
    assert.equal(await slider.inputValue(), "32");
    await page.waitForFunction(() => document.querySelector(".image-sketch-size-marker").style.getPropertyValue("--brush-size") === "32px");
    assert.equal(await marker.evaluate((element) => getComputedStyle(element.firstElementChild).width), "24px");
    await page.screenshot({ path: join(tmpdir(), `cs-sketch-size-max-${width}x${height}.png`) });
    await page.keyboard.press("Home");
    assert.equal(await slider.inputValue(), "2");
    await page.waitForFunction(() => document.querySelector(".image-sketch-size-marker").style.getPropertyValue("--brush-size") === "2px");
    assert.equal(await marker.evaluate((element) => getComputedStyle(element.firstElementChild).width), "6px");
    const railRect = await page.locator(".image-sketch-size-rail").boundingBox();
    const dialogRect = await page.locator(".attachment-preview-dialog").boundingBox();
    assert(railRect.x >= dialogRect.x && railRect.x + railRect.width <= dialogRect.x + dialogRect.width);
    assert(railRect.y >= dialogRect.y && railRect.y + railRect.height <= dialogRect.y + dialogRect.height);
    assert(await page.locator(".image-sketch-size-rail").evaluate((element) => getComputedStyle(element).outlineWidth) === "2px");
    await page.screenshot({ path: join(tmpdir(), `cs-sketch-size-${width}x${height}.png`) });
    await slider.fill("18");
    const canvasRect = await page.locator(".image-sketch-canvas-wrap canvas").boundingBox();
    assert(Math.abs(canvasRect.width / canvasRect.height - 1.5) < .01, `Canvas aspect ratio changed: ${canvasRect.width}x${canvasRect.height}`);
    const startX = canvasRect.x + canvasRect.width * .25;
    const startY = canvasRect.y + canvasRect.height * .5;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let step = 1; step <= 40; step++) {
      await page.mouse.move(startX + step * canvasRect.width * .012, startY - Math.sin(step / 7) * canvasRect.height * .14);
    }
    await page.mouse.up();
    const strokePixels = await page.locator(".image-sketch-canvas-wrap canvas").evaluate((canvas) => {
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let solid = 0;
      let blended = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 1] === 217) solid++;
        else if (pixels[index + 1] > 0 && pixels[index + 1] < 217) blended++;
      }
      return { solid, blended };
    });
    assert(strokePixels.solid > 100 && strokePixels.blended > 100, `Missing smooth stroke pixels: ${JSON.stringify(strokePixels)}`);
    await page.screenshot({ path: join(tmpdir(), `cs-sketch-stroke-${width}x${height}.png`) });
    const strokeCenter = async () => page.locator(".image-sketch-canvas-wrap canvas").evaluate((canvas, position) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.round((position.x - rect.left) * canvas.width / rect.width);
      const y = Math.round((position.y - rect.top) * canvas.height / rect.height);
      return Array.from(canvas.getContext("2d").getImageData(x, y, 1, 1).data);
    }, { x: startX, y: startY });
    assert((await strokeCenter())[1] > 0, "Stroke did not cover its starting point");
    await page.getByRole("button", { name: "撤销" }).click();
    assert.equal((await strokeCenter())[1], 0, "Undo did not restore the canvas");
    await page.getByRole("button", { name: "重做" }).click();
    assert((await strokeCenter())[1] > 0, "Redo did not restore the stroke");
    await page.getByRole("button", { name: "橡皮擦" }).click();
    await page.mouse.click(startX, startY);
    assert.equal((await strokeCenter())[3], 0, "Single-click eraser did not clear the stroke");
    await page.getByRole("button", { name: "画笔" }).click();
    await page.mouse.click(startX, startY);
    assert((await strokeCenter())[1] > 0, "Single-click pen did not draw a round dot");
    await page.getByLabel("取消编辑").click();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    console.log(`${width}x${height} passed`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
