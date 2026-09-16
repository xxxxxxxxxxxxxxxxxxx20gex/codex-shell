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
    const events=Array.from({length:20},(_,index)=>({kind:'terminalInteraction',itemId:'command-'+index,processId:String(index),stdinLength:1}));
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(TurnProcessEvents,{events}));
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
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(errors.length, 0);
    console.log(`${width}x${height} passed`);
  }
} finally {
  await browser.close();
}
