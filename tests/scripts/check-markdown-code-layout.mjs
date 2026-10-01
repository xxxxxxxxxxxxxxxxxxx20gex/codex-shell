import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const module = await import(pathToFileURL(process.argv[2]).href);
const { chromium } = module.default ?? module;
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const output = await mkdtemp(join(tmpdir(), "cs-markdown-code-"));

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/markdown-code-check", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><meta charset="utf-8"><style>
    .fixture-column { width: min(760px, calc(100vw - 536px)); margin: 10vh 0 0 280px; }
    @media (max-width: 1179px) { .fixture-column { width: calc(100vw - 312px); } }
  </style></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    await import("/@vite/client");
    const {default: React} = await import("/node_modules/.vite/deps/react.js");
    const {default: ReactDOM} = await import("/node_modules/.vite/deps/react-dom_client.js");
    await import("/src/styles/tokens.css");
    await import("/src/App.css");
    const {MarkdownContent} = await import("/src/features/threads/MarkdownContent.tsx");
    const fence = String.fromCharCode(96).repeat(3);
    const content = ["PowerShell 安装命令：",fence+"powershell","irm https://claude.ai/install.ps1 | iex",fence,"短命令：",fence+"bash","git status",fence,"长输出：",fence+"text","x".repeat(240),fence].join("\\n");
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement("main",{className:"fixture-column"},React.createElement(MarkdownContent,{className:"agent-response"},content)));
  </script></body></html>` }));

  for (const [width, height] of [[1440, 900], [1280, 780], [1024, 720], [900, 700]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1435}/markdown-code-check`);
    const blocks = page.locator(".markdown-code-block");
    await blocks.first().waitFor();
    assert.equal(await blocks.count(), 3);
    const geometry = await page.evaluate(() => {
      const column = document.querySelector(".fixture-column");
      const blocks = [...document.querySelectorAll(".markdown-code-block")];
      return { column: column.getBoundingClientRect().width, widths: blocks.map((block) => block.getBoundingClientRect().width), longScrolls: blocks[2].querySelector("pre").scrollWidth > blocks[2].querySelector("pre").clientWidth, pageOverflows: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(geometry.pageOverflows, false);
    assert(geometry.widths[0] < geometry.column * 0.8);
    assert(geometry.widths[1] < geometry.widths[0]);
    assert(geometry.widths[2] <= geometry.column);
    assert.equal(geometry.longScrolls, true);
    const copy = blocks.first().getByRole("button", { name: "复制代码" });
    await copy.focus();
    assert.equal(await copy.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
    assert.equal(await blocks.first().locator("header").evaluate((element) => element.getBoundingClientRect().height), 28);
    assert.equal(await copy.evaluate((element) => element.getBoundingClientRect().width), 24);
    assert.equal(await copy.locator("svg").evaluate((element) => element.getBoundingClientRect().width), 14);
    assert.equal(await blocks.first().locator("header span").evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 11), true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.screenshot({ path: join(output, `markdown-code-${width}.png`) });
    assert.deepEqual(errors, []);
    console.log(`${width}x${height} passed`);
  }
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
