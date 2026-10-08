import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const module = await import(pathToFileURL(process.argv[2]).href);
const { chromium } = module.default ?? module;
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
const output = await mkdtemp(join(tmpdir(), "cs-mcp-layout-"));
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/mcp-layout-check", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><meta charset="utf-8"><style>
    .fixture {position:absolute; bottom:120px; left:248px; width:calc(100% - 536px)}
    @media(max-width:1179px){.fixture{width:calc(100% - 248px)}}
  </style></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type;
    window.__vite_plugin_react_preamble_installed__=true;
    await import("/@vite/client");
    const {default:React}=await import("/node_modules/.vite/deps/react.js");
    const {default:ReactDOM}=await import("/node_modules/.vite/deps/react-dom_client.js");
    await import("/src/styles/tokens.css"); await import("/src/App.css");
    await import("/src/features/commands/CommandPanels.css");
    const {McpStatusPanel}=await import("/src/features/commands/McpStatusPanel.tsx");
    const config={version:"v1",servers:{browser:{command:"npx",args:["browser-tools"]},"long-server-name-that-needs-truncation-in-a-narrow-window-123456789":{url:"https://example.com/mcp",enabled:false}}};
    const servers=[{name:"browser",runtimeStatus:"connected",authStatus:"unsupported",tools:{navigate:{},screenshot:{}},resources:[],resourceTemplates:[]}];
    const props={loadServers:async()=>servers,readConfig:async()=>config,writeConfig:async(name,value)=>{window.__writes=(window.__writes??0)+1; config.servers[name]=value;},reloadServers:async()=>{},loginServer:async()=>"",readResource:async()=>[]};
    function Fixture(){const [open,setOpen]=React.useState(true);return React.createElement("div",{className:"fixture"},open&&React.createElement(McpStatusPanel,{...props,onClose:()=>setOpen(false)}));}
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Fixture));
  </script></body></html>` }));
  for (const [width,height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
    await page.setViewportSize({width,height});
    const url=`http://127.0.0.1:${process.argv[4]??1435}/mcp-layout-check`;
    await page.goto(url);
    const panel=page.getByRole("dialog",{name:"MCP 服务器",exact:true});
    await page.getByRole("button",{name:"编辑 browser",exact:true}).waitFor();
    assert.equal(await page.locator(".mcp-server-entry").count(),2);
    assert.equal(await panel.evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth;}),true);
    assert.equal(await page.locator(".mcp-server-heading strong").last().evaluate(el=>getComputedStyle(el).textOverflow),"ellipsis");
    if(width===900) assert.equal(await page.locator(".mcp-server-heading strong").last().evaluate(el=>el.scrollWidth>el.clientWidth),true);
    const add=page.getByRole("button",{name:"添加服务器",exact:true});
    await add.focus();
    assert.equal(await add.evaluate(el=>getComputedStyle(el).outlineStyle),"solid");
    await page.emulateMedia({reducedMotion:"reduce"});
    assert.equal(await page.locator('[role="switch"] span').first().evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<=0.001),true);
    await page.screenshot({path:join(output,`list-${width}.png`)});
    await page.getByRole("button",{name:"编辑 browser",exact:true}).click();
    await page.getByLabel("可执行命令",{exact:true}).fill("uvx");
    await page.getByRole("button",{name:"刷新",exact:true}).click();
    assert.equal(await page.getByLabel("可执行命令",{exact:true}).inputValue(),"uvx");
    assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    assert.equal(await page.getByRole("button",{name:"保存修改",exact:true}).evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.mcp-panel').getBoundingClientRect();return r.y>=p.y&&r.bottom<=p.bottom;}),true);
    assert.equal(await page.getByLabel("可执行命令",{exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=11),true);
    await page.locator("fieldset").evaluate(el=>{el.scrollTop=0;});
    await page.screenshot({path:join(output,`editor-${width}.png`)});
    await page.getByRole("button",{name:"取消",exact:true}).click();
    await add.waitFor();
    await page.waitForFunction(()=>document.activeElement?.textContent==="添加服务器");
    await page.getByRole("button",{name:"删除 browser",exact:true}).click();
    const confirm=page.getByRole("dialog",{name:"删除 browser？",exact:true});
    await confirm.waitFor();
    await page.keyboard.press("Escape");
    await confirm.waitFor({state:"hidden"});
    assert.equal(await panel.count(),1);
    assert.equal(await page.evaluate(()=>window.__writes??0),0);
    await page.keyboard.press("Escape");
    await panel.waitFor({state:"detached"});
    await page.goto(url);
    await page.getByRole("button",{name:"编辑 browser",exact:true}).waitFor();
    await page.mouse.click(10,10);
    await panel.waitFor({state:"detached"});
    assert.deepEqual(errors,[]);
    console.log(width+"x"+height+" passed");
  }
  console.log("Screenshots: "+output);
} finally {await browser.close();}
