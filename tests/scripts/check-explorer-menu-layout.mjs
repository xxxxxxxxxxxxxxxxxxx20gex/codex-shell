import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/explorer-menu-check", (route) => route.fulfill({ contentType: "text/html", body: `
    <meta charset="utf-8"><div id="root" style="height:100vh"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
    await import('/@vite/client');
    const {default:React}=await import('/node_modules/.vite/deps/react.js');
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
    await import('/src/styles/tokens.css'); await import('/src/App.css');
    const {WorkspaceExplorer}=await import('/src/features/workspaces/WorkspaceExplorer.tsx');
    const {ContextMenuPolicy}=await import('/src/features/window/ContextMenuPolicy.tsx');
    const {TurnResourceOutputs}=await import('/src/features/threads/TurnResourceOutputs.tsx');
    const {MarkdownContent}=await import('/src/features/threads/MarkdownContent.tsx');
    const {TurnFileChanges}=await import('/src/features/threads/TurnFileChanges.tsx');
    function Draft(){const [value,setValue]=React.useState('hello world');return React.createElement('textarea',{id:'draft',value,onChange:e=>setValue(e.target.value),onPaste:e=>{if(e.clipboardData.files.length){e.preventDefault();window.imagePasted=true;}}});}
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,
    React.createElement(ContextMenuPolicy,{projectPath:'C:/work'}),React.createElement('p',{id:'selection-text'},'正文复制测试'),
    React.createElement(MarkdownContent,null,'[文档链接](docs/guide.md:12)'),
    React.createElement(TurnFileChanges,{items:[{type:'fileChange',id:'f',status:'completed',changes:[{path:'src/main.ts',kind:{type:'update',move_path:null},diff:''}]}],onOpenPath:()=>{}}),
    React.createElement(TurnResourceOutputs,{items:[{type:'agentMessage',id:'reply',text:'[文档](C:/skills/SKILL.md) [图片](result.png)',phase:'final_answer'}],onOpenPath:()=>{}}),
    React.createElement(Draft),
    React.createElement('div',{id:'editable',contentEditable:true,suppressContentEditableWarning:true},'可编辑'),
    React.createElement(WorkspaceExplorer,{
      rootPath:'C:/work',maximized:false,onToggleMaximize:()=>{},onClose:()=>{window.closedExplorer=true},
      readDirectory:async()=>[{fileName:'audio.m4s',isFile:true,isDirectory:false}],
      readFile:async()=> 'AA==',watchPath:async()=>()=>{},
      onAddToConversation:()=>{},onRevealPath:async()=>{}
    })));
    </script>` }));
  for (const [width,height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
    await page.setViewportSize({width,height});
    await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1435}/explorer-menu-check`);
    const row = page.getByRole("button",{name:"audio.m4s"});
    await page.getByRole('region',{name:'回复中的图片'}).waitFor();
    assert.equal(await page.getByText('SKILL.md',{exact:true}).count(),0);
    assert.equal(await page.getByText('result.png',{exact:true}).count(),1);
    await row.evaluate((el, point) => el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: point.x, clientY: point.y })), { x: width-2, y: height-2 });
    await page.getByText("二进制文件",{exact:true}).waitFor();
    const menu = page.getByRole("menu");
    await page.waitForFunction(() => {
      const bounds = document.querySelector('[role="menu"]')?.getBoundingClientRect();
      return bounds && bounds.right <= innerWidth && bounds.bottom <= innerHeight;
    });
    const bounds = await menu.boundingBox();
    assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x+bounds.width <= width && bounds.y+bounds.height <= height, JSON.stringify(bounds));
    assert.equal(await menu.getByRole("menuitem").count(),5);
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),"在资源管理器中显示");
    await page.keyboard.press("Escape");
    assert.equal(await menu.count(),0);
    assert.equal(await page.evaluate(()=>Boolean(window.closedExplorer)),false);
    await row.focus(); await page.keyboard.press("Shift+F10");
    await menu.waitFor();
    await page.mouse.click(width-20,20);
    assert.equal(await menu.count(),0);
    await page.emulateMedia({reducedMotion:"reduce"});
    await row.click({button:"right"});
    assert(Number.parseFloat(await menu.locator("button").first().evaluate(el=>getComputedStyle(el).fontSize))>=11);
    await page.screenshot({path:process.env.TEMP+`/cs-explorer-menu-${width}.png`});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#editable').evaluate(el => el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false);
    assert.deepEqual(await page.getByRole('menuitem').allTextContents(),['全选','复制','粘贴']);
    await page.keyboard.press('Escape');
    await page.context().grantPermissions(['clipboard-read','clipboard-write']);
    await page.getByText('文件变更 · 1',{exact:true}).click();
    for (const [label,path] of [['文档链接','C:/work/docs/guide.md'],['result.png','C:/work/result.png'],['src/main.ts','C:/work/src/main.ts']]) {
      await page.getByText(label,{exact:true}).click({button:'right'});
      assert.deepEqual(await page.getByRole('menuitem').allTextContents(),['复制绝对路径']);
      await page.getByRole('menuitem',{name:'复制绝对路径'}).click();
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),path);
    }
    await page.getByText('文档链接',{exact:true}).focus();
    await page.keyboard.press('Shift+F10');
    await page.getByRole('menuitem',{name:'复制绝对路径'}).waitFor();
    await page.screenshot({path:process.env.TEMP+`/cs-resource-menu-${width}.png`});
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('menu').count(),0);
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'文档链接');
    await page.evaluate(()=>navigator.clipboard.writeText('替换'));
    const draft=page.locator('#draft');
    await draft.focus();
    await draft.evaluate(el=>{el.setSelectionRange(6,11);el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));});
    await page.getByRole('menuitem',{name:'粘贴',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#draft').value==='hello 替换');
    await page.keyboard.press('Control+z');
    await page.waitForFunction(()=>document.querySelector('#draft').value==='hello world');
    await draft.evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));
    await page.getByRole('menuitem',{name:'全选',exact:true}).click();
    assert.deepEqual(await draft.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,11]);
    await draft.evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));
    await page.getByRole('menuitem',{name:'复制',exact:true}).click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'hello world');
    await page.evaluate(async()=>{
      const canvas=document.createElement('canvas'); canvas.width=1; canvas.height=1;
      const blob=await new Promise(resolve=>canvas.toBlob(resolve));
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
    });
    await draft.evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));
    await page.screenshot({path:process.env.TEMP+`/cs-input-menu-${width}.png`});
    await page.getByRole('menuitem',{name:'粘贴',exact:true}).click();
    await page.waitForFunction(()=>window.imagePasted===true);
    assert.equal(await draft.inputValue(),'hello world');
    assert.equal(await page.locator('body').evaluate(el => el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false);
    await page.locator('#selection-text').evaluate(el=>{
      const range=document.createRange(); range.selectNodeContents(el); window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
      const rect=range.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.left+2,clientY:rect.top+2}));
    });
    const copyMenu=page.getByRole('menu',{name:'文本操作'});
    await copyMenu.waitFor();
    assert.equal(await copyMenu.getByRole('menuitem').count(),1);
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'复制');
    await page.screenshot({path:process.env.TEMP+`/cs-text-menu-${width}.png`});
    await page.keyboard.press('Escape');
    assert.equal(await copyMenu.count(),0);
    await page.locator('#selection-text').evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:innerWidth-10,clientY:10})));
    assert.equal(await copyMenu.count(),0);
    assert.equal(errors.length,0);
    console.log(`${width}x${height} passed`);
  }
} finally { await browser.close(); }
