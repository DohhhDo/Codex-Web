import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { user, usage, sessions, projects, histories, files, sourceCode, terminalOutput } from './data.mjs';

// A separate, memory-only demo server. It never loads the application backend,
// connects to providers, reads a user database, or executes terminal input.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const capabilities = JSON.parse(await readFile(new URL('./capabilities.json', import.meta.url)));
const models = JSON.parse(await readFile(new URL('./models.json', import.meta.url)));
const template = await readFile(path.join(dist, 'index.html'), 'utf8').catch(() => {
  throw new Error('Build the frontend first: npm run build:client');
});
const token = `demo.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString('base64url')}.not-a-real-signature`;
const profile = { ...user, displayName: user.username, customDisplayName: null, customAvatarUrl: null, codex: { connected: true, displayName: user.username, avatarUrl: user.avatarUrl, email: 'hello@example.com' } };
const preferences = { selectedProvider: 'codex', userLanguage: 'zh-CN', tasksEnabled: false, uiPreferences: { showThinking: true }, codexPermissions: { permissionMode: 'default', model: 'gpt-6-astra', effort: 'high' } };
const success = data => ({ success: true, data });
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
const activeModels = new Map();
const activeEfforts = new Map();
const archived = new Set();
const drafts = {};
function recent(showArchived = false) { return sessions.filter(s => archived.has(s.id) === showArchived).map(s => ({ sessionId:s.id, provider:'codex', projectId:s.projectId, projectDisplayName:s.projectDisplayName, sessionTitle:s.title, lastActivity:s.lastActivity })); }
async function readBody(req) {
  let body = ''; for await (const chunk of req) { body += chunk; if(body.length > 1000000) throw new Error('Demo request too large'); }
  if(!body)return {}; try{return JSON.parse(body);}catch{return {};}
}
const server = http.createServer(async (req, res) => {
 try {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const send = (value, status=200) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); };
  if(p === '/health')return send({ status:'ok', version:'1.37.3', installMode:'demo' });
  if(p.startsWith('/api/')) {
   const body = await readBody(req);
   const theme = /(?:^|;\s*)demo-theme=(light|dark)/.exec(req.headers.cookie || '')?.[1] || 'dark';
   if(p === '/api/auth/status')return send({ needsSetup:false });
   if(p === '/api/auth/user')return send({ user: profile });
   if(p === '/api/auth/profile' && req.method === 'PUT') {
    Object.assign(profile, { displayName: body.displayName || user.username, username: body.displayName || user.username, avatarUrl: body.avatarUrl || user.avatarUrl, customDisplayName: body.displayName, customAvatarUrl: body.avatarUrl });
    return send({ user: profile });
   }
   if(p.startsWith('/api/auth/'))return send({ success:true, user, token });
   if(p === '/api/user/onboarding-status')return send({ hasCompletedOnboarding:true });
   if(p === '/api/user/preferences') {
    if(req.method !== 'GET') {
     Object.assign(preferences, body);
     if(['light','dark'].includes(body.theme))res.setHeader('Set-Cookie',`demo-theme=${body.theme}; Path=/; SameSite=Lax`);
    }
    return send({ preferences:{ ...preferences, theme: body.theme || theme } });
   }
   if(p.startsWith('/api/user/drafts'))return send({ drafts });
   if(p === '/api/user/git-config')return send({ gitName:'DOhhhDO', gitEmail:'hello@example.com', configured:true });
   if(p === '/api/browser-use/settings')return send(success({ settings:{ enabled:false } }));
   if(p === '/api/projects')return send(projects);
   if(p === '/api/projects/archived')return send(success({ projects:[] }));
   const projectMatch = p.match(/^\/api\/projects\/([^/]+)(?:\/(.*))?$/);
   if(projectMatch) {
    const project=projects.find(item=>item.projectId===projectMatch[1]);
    if(projectMatch[2]==='sessions')return send({ sessions:project?.sessions || [], total:project?.sessions.length || 0, hasMore:false });
    if(projectMatch[2]==='toggle-star' && project)project.isStarred=!project.isStarred;
    return send(project || {});
   }
   if(p === '/api/providers/capabilities')return send(capabilities);
   if(p.endsWith('/auth/status'))return send(success({ provider:'codex', installed:true, authenticated:true, email:'hello@example.com', method:'credentials_file', subscriptionLevel:'pro' }));
   if(p.endsWith('/models'))return send(models);
   if(p === '/api/providers/sessions/recent')return send(success({ conversations:recent(), total:recent().length, hasMore:false }));
   if(p === '/api/providers/sessions/running')return send(success({ sessions:[] }));
   if(p === '/api/providers/sessions/archived')return send(success({ sessions:recent(true) }));
   if(p === '/api/providers/sessions' && req.method==='POST') {
    const project=projects.find(item=>item.fullPath===body.projectPath) || projects[0];
    const id=`demo-${sessions.length+1}`;
    const session={ ...sessions[0], id, title:'新的灵感', summary:'新的灵感', projectId:project.projectId, __projectId:project.projectId, projectDisplayName:project.displayName, lastActivity:new Date().toISOString() };
    sessions.unshift(session);project.sessions.unshift(session);histories.set(id,[]);
    return send(success({ sessionId:id, provider:'codex', projectPath:project.fullPath }));
   }
   const sessionMatch=p.match(/^\/api\/providers\/sessions\/([^/]+)(?:\/(.*))?$/);
   if(sessionMatch) {
    const s=sessions.find(item=>item.id===sessionMatch[1]);
    if(!s)return send({ error:'Demo session not found' },404);
    const action=sessionMatch[2];
    if(action==='messages')return send(success({ messages:histories.get(s.id)||[], total:(histories.get(s.id)||[]).length, hasMore:false, tokenUsage:usage }));
    if(action==='token-usage')return send(success(usage));
    if(action==='provider-id')return send(success({ providerSessionId:s.id }));
    if(action==='restore')archived.delete(s.id);
    if(req.method==='DELETE')archived.add(s.id);
    if(req.method==='PUT'&&body.summary){s.title=body.summary;s.summary=body.summary;}
    return send(success({ sessionId:s.id, provider:'codex', summary:s.title, createdAt:s.createdAt, lastActivity:s.lastActivity, project:projects.find(item=>item.projectId===s.projectId) }));
   }
   const modelMatch=p.match(/\/sessions\/([^/]+)\/active-(model|effort)$/);
   if(modelMatch) {
    const map=modelMatch[2]==='model'?activeModels:activeEfforts;
    if(req.method!=='GET')map.set(modelMatch[1],body[modelMatch[2]]);
    return send(success({ model:activeModels.get(modelMatch[1])||'gpt-6-astra', effort:activeEfforts.get(modelMatch[1])||'high' }));
   }
   if(p.startsWith('/api/file-tree/')) {
    if(p.endsWith('/files'))return send(files);
    if(p.endsWith('/file'))return send({ content:sourceCode, path:url.searchParams.get('filePath') });
    return send({ success:true });
   }
   if(p === '/api/commands/list')return send({ commands:[{name:'review',description:'看看代码里有没有藏着小问题',content:'Review the current changes.'},{name:'test',description:'运行项目测试',content:'Run the tests.'}] });
   if(p === '/api/scheduled-messages')return send(success({ messages:[] }));
   if(p === '/api/git/status')return send({ branch:'feature/tonight-playlist', currentBranch:'feature/tonight-playlist', isGitRepo:true, files:[{path:'src/lib/tonight.ts',status:'M'},{path:'src/components/TonightCard.tsx',status:'A'}], staged:[], unstaged:[], untracked:[], ahead:2, behind:0 });
   if(p === '/api/git/branches')return send({ branches:['main','feature/tonight-playlist'], current:'feature/tonight-playlist' });
   if(p === '/api/git/remote-status')return send({ hasRemote:true, ahead:2, behind:0 });
   if(p === '/api/git/commits')return send({ commits:[] });
   if(p === '/api/git/diff')return send({ diff:'diff --git a/src/lib/tonight.ts b/src/lib/tonight.ts\n+// A playlist for tonight\n+'+sourceCode.replaceAll('\n','\n+') });
   if(p === '/api/plugins')return send({ plugins:[] });
   if(p.includes('/skills'))return send(success({ skills:[] }));
   if(p.includes('/mcp/servers'))return send(success({ servers:[] }));
   if(p.includes('/settings/'))return send({ success:true, credentials:[], apiKeys:[], enabled:false });
   if(p.includes('version')||p.includes('update'))return send({ currentVersion:'1.37.3', latestVersion:'1.37.3', updateAvailable:false, restartRequired:false });
   if(p.includes('taskmaster'))return send({ enabled:false, installed:false, tasks:[] });
   console.log(`[demo] Unconfigured route: ${req.method} ${p}`);
   return send({ success:false, error:'This action is not available in the screenshot demo.' },404);
  }
  // Resolve only inside the build. No filesystem/project reads are served.
  if(p === '/' || p === '/index.html' || p.startsWith('/session/')) {
   const theme=['light','dark'].includes(url.searchParams.get('theme'))?url.searchParams.get('theme'):null;
   if(theme)res.setHeader('Set-Cookie',`demo-theme=${theme}; Path=/; SameSite=Lax`);
   const bootstrap=`<script>document.documentElement.dataset.demo='true';localStorage.setItem('auth-token',${JSON.stringify(token)});localStorage.setItem('userLanguage','zh-CN');const demoFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input.url||String(input),location.href);if(url.origin!==location.origin)return Promise.resolve(new Response(JSON.stringify(url.hostname==='api.github.com'?{tag_name:'v1.37.3'}:{error:'External requests are disabled in the demo'}),{status:url.hostname==='api.github.com'?200:403,headers:{'Content-Type':'application/json'}}));return demoFetch(input,init);};${theme?`localStorage.setItem('theme',${JSON.stringify(theme)});`:''}if(location.pathname==='/'&&!new URLSearchParams(location.search).has('home'))history.replaceState(null,'','/session/demo-1'+location.search);</script>`;
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
   return res.end(template.replace('<head>','<head>'+bootstrap).replace('<title>Codex-Web</title>','<title>Codex-Web · 示例</title>'));
  }
  if(p==='/sw.js') {res.writeHead(404);return res.end();}
  const target=path.resolve(dist,'.'+decodeURIComponent(p));
  if(!target.startsWith(dist+path.sep)){res.writeHead(403);return res.end();}
  if(!(await stat(target)).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target));
 } catch(error) {res.writeHead(error.code==='ENOENT'?404:500);res.end('Demo resource unavailable');}
});
const sockets=new WebSocketServer({server});
sockets.on('connection',(socket,req)=>{
 const shell=new URL(req.url,'http://localhost').pathname==='/shell';
 let input='';
 const send=data=>{if(socket.readyState===1)socket.send(JSON.stringify(data));};
 socket.on('message',raw=>{
  let data;try{data=JSON.parse(raw.toString());}catch{return;}
  if(shell) {
   if(data.type==='init')send({type:'output',data:terminalOutput});
   if(data.type==='input') {
    for(const char of data.data||'') {
     if(char==='\r'||char==='\n'){send({type:'output',data:`\r\n${input.trim()==='clear'?'\x1b[2J\x1b[H':'Demo terminal · 命令仅用于演示，不会执行。\r\n'}$ `});input='';}
     else if(char==='\x7f'){input=input.slice(0,-1);send({type:'output',data:'\b \b'});}
     else if(char>=' '){input+=char;send({type:'output',data:char});}
    }
   }
   return;
  }
  if(data.type==='chat.subscribe')send({kind:'chat_subscribed',sessionId:data.sessionId,isProcessing:false,pendingPermissions:[]});
  if(data.type==='chat.send'||data.type==='chat.edit-send') {
   const id=data.sessionId;
   const common={sessionId:id,provider:'codex',timestamp:new Date().toISOString()};
   const reply={...common,id:`reply-${Date.now()}`,kind:'text',role:'assistant',content:'收到。这里是截图演示，回复由示例数据生成。\n\n可以切换左侧项目、展开测试结果，或打开终端和设置，继续看看不同页面的效果。'};
   const history=histories.get(id)||[];
   history.push({...common,id:`prompt-${Date.now()}`,kind:'text',role:'user',content:String(data.content)},reply);histories.set(id,history);
   setTimeout(()=>{send(reply);send({...common,id:`complete-${Date.now()}`,kind:'complete',exitCode:0,success:true,aborted:false,actualSessionId:id});},400);
  }
 });
});
const port=Number(process.env.DEMO_PORT||3002);
server.listen(port,'127.0.0.1',()=>console.log(`Codex-Web screenshot demo: http://localhost:${server.address().port}\nFictional data only · DOhhhDO · Ctrl+C to stop`));
