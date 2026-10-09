import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium} = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({executablePath:process.argv[3],headless:true});
const output = await mkdtemp(join(tmpdir(),'cs-workbench-review-'));
try {
 const page=await browser.newPage(); const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log(e.message);});
 await page.route('**/workbench-review',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
 import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
 window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type; window.__vite_plugin_react_preamble_installed__=true;
 await import('/@vite/client');
 const {default:React}=await import('/node_modules/.vite/deps/react.js');
 const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
 await import('/src/styles/tokens.css'); await import('/src/App.css');
 await import('/src/features/threads/ConversationTimeline.css');
 const {ThreadHistoryList}=await import('/src/features/threads/ThreadHistoryList.tsx');
 const {MarkdownContent}=await import('/src/features/threads/MarkdownContent.tsx');
 const {ComposerAddMenu}=await import('/src/features/composer/ComposerAddMenu.tsx');
 const {PermissionModeSelector}=await import('/src/features/approvals/PermissionModeSelector.tsx');
 const {ComposerGoalStatus}=await import('/src/features/composer/ComposerGoalStatus.tsx');
 const {CompactIconButton}=await import('/src/shared/CompactIconButton.tsx');
 const {PanelLeft,PanelRight,Plus,Settings,Folder,MessageSquare}=await import('/node_modules/.vite/deps/lucide-react.js');
 const h=React.createElement,noop=()=>{};
 const threads=Array.from({length:9},(_,i)=>({id:'thread-'+i,name:i===0?'优化工作台布局、统一按钮及提示信息并检查长标题显示':'检查项目界面与交互 '+(i+1),preview:'',path:null,updatedAt:1786334400-i*1000,cwd:'C:/fixture',source:'cli',modelProvider:'openai'}));
 const fence=String.fromCharCode(96).repeat(3);
 const content=['已完成界面调整。菜单与操作按钮使用统一尺寸，长文本在空间不足时截断。','','检查当前改动：',fence+'powershell','git status',fence].join('\\n');
 const history=h(ThreadHistoryList,{threads,archived:false,activeThreadId:'thread-0',loading:false,error:'',disabled:false,actionThreadId:null,runningThreadIds:new Set(),hasMore:false,onOpen:noop,onRename:noop,onTogglePin:noop,onArchive:noop,onUnarchive:noop,onDelete:noop,onShowArchived:noop,onLoadMore:noop});
 const iconButton=(label,Icon,cls)=>h(CompactIconButton,{className:cls,label,icon:h(Icon)});
 ReactDOM.createRoot(document.getElementById('root')).render(h('div',{className:'app-shell'},h('div',{style:{padding:'4px 12px',fontSize:13}},'Codex Shell'),h('div',{className:'workspace-grid'+(innerWidth<1180?' inspector-hidden':''),style:{'--sidebar-width':'248px','--inspector-width':'288px'}},
 h('aside',{className:'sidebar panel'},h('div',{className:'sidebar-actions'},h('button',{className:'sidebar-action'},h(Plus),'新建对话')),history,h('button',{className:'sidebar-footer'},h(Settings),h('span',null,h('strong',null,'设置')))),
 h('section',{className:'conversation panel'},h('header',{className:'conversation-header'},iconButton('显示左侧',PanelLeft,'drawer-toggle'),h('strong',null,'工作台 UI 优化'),iconButton('显示右侧',PanelRight,'drawer-toggle drawer-toggle-right')),
 h('div',{className:'timeline-shell'},h('div',{className:'timeline'},h('div',{className:'conversation-turn-frame first'},h('div',{className:'user-message-group'},h('div',{className:'user-message'},'请优化工作台的 UI 设计')),h('div',{className:'agent-block'},h('div',{className:'agent-accent'}),h('div',{className:'agent-content'},h(MarkdownContent,{className:'agent-response'},content)))))),
 h('div',{className:'composer-wrap'},h(ComposerGoalStatus,{goal:{objective:'统一交互与视觉层级',status:'active',tokensUsed:0,tokenBudget:null,timeUsedSeconds:80},onClear:noop}),h('div',{className:'composer'},h('textarea',{placeholder:'交给 Codex 一个任务…'}),h('div',{className:'composer-toolbar'},h('div',{className:'composer-tools'},h(ComposerAddMenu,{hasThread:true,running:false,onSelectPaths:noop,onCommand:noop,onError:noop,onOpen:noop})),h('div',{className:'composer-actions'},h(PermissionModeSelector,{value:'read',reviewer:'user',onChange:noop,onReviewerChange:noop}),h('button',{className:'model-button'},'GPT-6')))))),
 h('aside',{className:'inspector panel'},h('header',{className:'inspector-heading'},h('strong',null,'工作区')),h('div',{className:'inspector-home'},h('button',{className:'inspector-feature-entry'},h('span',{className:'inspector-feature-icon'},h(Folder)),h('span',null,h('strong',null,'项目文件'),h('small',null,'浏览项目目录'))))))));
 </script></body></html>`}));
 for(const [width,height] of [[1440,900],[1280,780],[1024,720],[900,700]]) {
  await page.setViewportSize({width,height});
  await page.goto(`http://127.0.0.1:${process.argv[4] ?? 1435}/workbench-review`);
  const title=page.locator('.thread-title').first(); await title.waitFor();
  await page.evaluate(()=>{
    const meta=document.createElement('div'); meta.className='user-message-meta';
    meta.innerHTML='<span class="user-message-timing">2026/10/09 10:22</span><div class="message-actions user-message-actions"><button aria-label="复制消息"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg></button><button aria-label="编辑后再次发送"><svg viewBox="0 0 24 24"><path d="M4 16 16 4l4 4L8 20H4Z"/></svg></button></div>';
    document.querySelector('.user-message-group').append(meta);
  });
  const userCopy=page.getByRole('button',{name:'复制消息',exact:true});
  assert.equal(await userCopy.evaluate(el=>el.getBoundingClientRect().width),24);
  assert.equal(await userCopy.locator('svg').evaluate(el=>el.getBoundingClientRect().width),14);
  await userCopy.hover(); assert.equal(await userCopy.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
  await page.keyboard.press('Tab'); await userCopy.focus();
  assert.equal(await userCopy.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
  await page.mouse.move(width-1,height-1);
  const before=await title.boundingBox(); await title.hover(); const after=await title.boundingBox();
  assert.equal(after.width,before.width,'history hover changes title width');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const trigger=page.getByRole('button',{name:'添加与命令',exact:true});
  await trigger.click(); const menu=page.getByRole('menu',{name:'添加与命令',exact:true}); await menu.waitFor();
  assert(await menu.evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),'menu overflow');
  await page.keyboard.press('End'); assert(await menu.getByRole('menuitem').last().evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Home'); assert(await menu.getByRole('menuitem').first().evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Escape'); assert.equal(await menu.count(),0); assert(await trigger.evaluate(el=>el===document.activeElement));
  await trigger.click(); await page.locator('.conversation-header strong').click(); assert.equal(await menu.count(),0);
  await trigger.click(); await page.keyboard.press('Tab'); assert.equal(await menu.count(),0);
  assert(await page.locator('.permission-trigger').evaluate(el=>el===document.activeElement));
  const row=page.locator('.thread-main').first(); await row.focus(); await page.keyboard.press('Shift+F10');
  const context=page.getByRole('menu',{name:'会话操作'}); await context.waitFor();
  assert(await context.evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));
  await page.keyboard.press('Escape'); assert(await row.evaluate(el=>el===document.activeElement));
  const permission=page.locator('.permission-trigger'); await permission.click();
  const permissionMenu=page.getByRole('menu',{name:'权限模式'}); await permissionMenu.waitFor();
  await page.keyboard.press('End'); assert(await permissionMenu.locator('button').last().evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Escape'); assert(await permission.evaluate(el=>el===document.activeElement));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.screenshot({path:join(output,'workbench-'+width+'.png')});
  const geometry=await page.evaluate(()=>{
   const f=document.querySelector('.conversation-turn-frame'),c=document.querySelector('.composer'),t=document.querySelector('.timeline');
   const box=f.getBoundingClientRect(),style=getComputedStyle(f),composer=c.getBoundingClientRect();
   return {left:box.left+parseFloat(style.paddingLeft),right:box.right-parseFloat(style.paddingRight),composerLeft:composer.left,composerRight:composer.right,header:document.querySelector('.conversation-header').getBoundingClientRect().height,overflow:getComputedStyle(t).overflowX};
  });
  assert(Math.abs(geometry.left-geometry.composerLeft)<1,'message/composer left alignment');
  assert(Math.abs(geometry.right-geometry.composerRight)<1,'message/composer right alignment');
  assert.equal(geometry.header,48); assert.equal(geometry.overflow,'hidden');
  assert.equal(await title.evaluate(el=>el.scrollWidth>el.clientWidth),true,'long title truncation');
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  await trigger.click();
  assert(await menu.getByRole('menuitem').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=11));
  await page.screenshot({path:join(output,'workbench-light-'+width+'.png')});
  await page.keyboard.press('Escape');
  console.log(width+'x'+height+' passed');
 }
 assert.deepEqual(errors,[]); console.log('Screenshots: '+output);
}finally{await browser.close();}
