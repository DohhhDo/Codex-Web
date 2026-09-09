import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
import { WebSocket } from 'ws';

test('demo is self-contained and uses fictional APIs and inert terminal input', async () => {
 const child=spawn(process.execPath,['scripts/demo/serve.mjs'],{env:{...process.env,DEMO_PORT:'0'},stdio:['ignore','pipe','pipe']});
 try {
  const base=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('demo did not start')),5000);
   child.on('error',reject);child.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/localhost:(\d+)/);if(match){clearTimeout(timer);resolve('http://127.0.0.1:'+match[1]);}});
  });
  const get=async route=>(await fetch(base+route)).json();
  assert.equal((await get('/api/auth/user')).user.username,'DOhhhDO');
  assert.equal((await get('/api/projects')).length,5);
  assert.equal((await get('/api/providers/sessions/recent')).data.conversations.length,18);
  assert.equal((await get('/api/providers/sessions/demo-1/messages')).data.messages[0].kind,'text');
  assert.equal((await get('/api/providers/sessions/demo-1/token-usage')).data.cacheReadTokens,23920);
  assert.equal((await fetch(base+'/api/not-implemented')).status,404);
  assert.equal((await fetch(base+'/sw.js')).status,404);
  assert.equal((await fetch(base+'/.env')).status,404);
  const html=await (await fetch(base+'/?theme=light')).text();
  assert.match(html,/dataset.demo='true'/);assert.match(html,/not-a-real-signature/);
  const avatar=await fetch(base+'/demo/dohhhdo-avatar.png');assert.equal(avatar.status,200);assert.match(avatar.headers.get('content-type'),/image\/png/);
  await fetch(base+'/api/providers/sessions/demo-1',{method:'DELETE'});
  assert.equal((await get('/api/providers/sessions/archived')).data.sessions[0].sessionId,'demo-1');
  await fetch(base+'/api/providers/sessions/demo-1/restore',{method:'POST'});
  assert.equal((await get('/api/providers/sessions/recent')).data.conversations.length,18);
  const socket=new WebSocket(base.replace('http:','ws:')+'/shell');
  await once(socket,'open');
  const output=once(socket,'message');socket.send(JSON.stringify({type:'init'}));
  assert.match(JSON.parse(String((await output)[0])).data,/Moon Radio/);
  const chunks=[];socket.on('message',raw=>chunks.push(JSON.parse(String(raw)).data));
  socket.send(JSON.stringify({type:'input',data:'echo screenshot-only\r'}));
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.match(chunks.join(''),/命令仅用于演示，不会执行/);socket.close();
 } finally {child.kill('SIGTERM');await once(child,'exit');}
});
