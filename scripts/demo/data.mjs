// Entirely fictional, deterministic screenshot content. No local account or session data.
export const user = { id: 'demo-dohhhdo', username: 'DOhhhDO', avatarUrl: '/demo/dohhhdo-avatar.png' };
export const usage = { used: 28460, total: 200000, inputTokens: 26000, outputTokens: 2460, cacheReadTokens: 23920, subscriptionLevel: 'pro', rateLimits: { primary: { usedPercent: 18, windowMinutes: 300 }, secondary: { usedPercent: 34, windowMinutes: 10080 } } };
const topics = [
 ['moon-radio', '月球电台', '把月亮装进浏览器', '给月球电台加一个「今晚听什么」功能。根据天气和心情推荐三首歌，像一封来自月亮的晚安信。'],
 ['cat-translator', '猫咪翻译器', '猫说的「喵」到底是什么意思', '把猫叫识别结果做成时间轴，区分撒娇、开饭和「请离开我的键盘」。'],
 ['coffee-atlas', '周末咖啡地图', '找到那家有橘猫的咖啡馆', '做一个步行可达的咖啡馆地图，可以按手冲、插座和店猫筛选。'],
 ['moon-radio', '月球电台', '给播放器加一点黑胶的温度', '让唱片随音乐转动，暂停时缓缓停下。'],
 ['tiny-garden', '阳台小森林', '薄荷又快被我养死了', '给植物浇水提醒加上天气预报，雨天不要催我浇水。'],
 ['pocket-museum', '口袋博物馆', '把一张地铁票变成展品', '设计一张藏品详情页，让日常小物件也值得被认真收藏。'],
 ['cat-translator', '猫咪翻译器', '识别深夜跑酷的三种模式', '把夜间活动分成巡逻、追逐和突然想起自己是豹子。'],
 ['coffee-atlas', '周末咖啡地图', '给周末留一条不赶时间的路线', '串联书店、公园和咖啡馆，整条路线控制在三公里以内。'],
 ['moon-radio', '月球电台', '凌晨两点的白噪音实验', '混合雨声和远处的列车声，支持单独调节音量。'],
 ['tiny-garden', '阳台小森林', '一颗番茄的成长日记', '用照片记录番茄从开花到变红，生成一张可分享的时间线。'],
 ['pocket-museum', '口袋博物馆', '收集世界上没用但可爱的东西', '给收藏夹增加颜色和材质筛选，支持拖动重新摆放。'],
 ['coffee-atlas', '周末咖啡地图', '今天的拿铁拉花像一只水豚', '增加咖啡日记，可以记录豆子产地、风味和一张照片。'],
 ['cat-translator', '猫咪翻译器', '让猫成为代码审查员', '做一个趣味审查模式，让猫用简短评论指出代码里的小问题。'],
 ['moon-radio', '月球电台', '把晚安做成一个 API', '创建一个每天返回不同晚安句子的接口，支持中英双语。'],
 ['tiny-garden', '阳台小森林', '给多肉安排一个向阳的位置', '根据窗户朝向和日照时长，推荐植物的摆放位置。'],
 ['pocket-museum', '口袋博物馆', '写给未来自己的小纸条', '添加定时打开的时间胶囊，首页只显示还有多少天。'],
 ['coffee-atlas', '周末咖啡地图', '离线地图也要好看', '在没有网络时保留收藏地点和最近一条散步路线。'],
 ['cat-translator', '猫咪翻译器', '修复一只猫引发的竞态条件', '修复连续点击翻译时，上一段猫叫结果覆盖新结果的问题。'],
];
export const sessions = topics.map(([projectId, projectDisplayName, title, prompt], i) => ({
 id: `demo-${i + 1}`, provider: 'codex', __provider: 'codex', __projectId: projectId,
 projectId, projectDisplayName, title, summary: title, prompt, messageCount: 4,
 createdAt: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
 lastActivity: new Date(Date.now() - i * 3600000 - 120000).toISOString(), model: 'gpt-6-astra', effort: 'high',
}));
export const projects = [...new Map(sessions.map(s => [s.projectId, {
 projectId: s.projectId, displayName: s.projectDisplayName, fullPath: `/workspace/${s.projectId}`, path: `/workspace/${s.projectId}`,
 isStarred: ['moon-radio', 'cat-translator'].includes(s.projectId), taskmaster: { hasTaskmaster: false },
}])).values()].map(p => ({ ...p, sessions: sessions.filter(s => s.projectId === p.projectId), sessionMeta: { total: sessions.filter(s => s.projectId === p.projectId).length, hasMore: false } }));
export const sourceCode = `type Mood = 'quiet' | 'dreamy' | 'curious';

export function tonightPlaylist(mood: Mood, isRaining: boolean) {
  return {
    station: 'Moon Radio',
    mood,
    ambience: isRaining ? 'soft-rain' : 'night-breeze',
    message: '今晚，把世界的音量调小一点。',
    tracks: ['月面散步', '雨落在土星环上', '晚安，地球'],
  };
}
`;
const moonReply = `做好了。现在，每次打开月球电台，都会收到一份属于今晚的歌单。

### 今晚，把世界的音量调小一点

按 **天气 × 心情** 生成三首歌，附上一句晚安。雨天听轻一点，晴夜听远一点。

| 曲目 | 适合此刻的理由 |
| --- | --- |
| 月面散步 | 轻柔的钢琴，陪你慢慢收起白天 |
| 雨落在土星环上 | 一点雨声，让思绪暂时靠岸 |
| 晚安，地球 | 留给睡前最后三分钟 |

推荐逻辑放在 \`src/lib/tonight.ts\`，播放器支持试听、收藏和重新推荐。也补齐了无定位权限、离线和空歌单的状态。

**12 项测试通过。** 键盘和手机端都可以直接操作。今晚的歌单，已经准备好了。`;
const message = (sessionId, index, kind, fields) => ({ id: `${sessionId}-message-${index}`, sessionId, provider: 'codex', kind, timestamp: `2026-09-09T12:${String(20 + index).padStart(2, '0')}:00.000Z`, ...fields });
const replies = [
  "识别结果现在是一条可以回放的「猫语时间轴」。每段录音都有情绪标签和置信度，点一下就能听原声。\n\n### 今天的翻译报告\n\n| 时间 | 猫的意思 | 置信度 |\n| --- | --- | --- |\n| 07:02 | 碗底露出来了，这是一场危机 | 96% |\n| 10:18 | 这个键盘现在归我了 | 88% |\n| 23:41 | 没事，只是想确认你还醒着 | 73% |\n\n低置信度不会强行翻译，会显示「这句还需要再听听」。音频仅保留在设备上，清理记录时一起删除。\n\n```ts\nconst translation = {\n  intent: 'feed-me',\n  confidence: 0.96,\n  original: 'meow-meow.wav',\n};\n```\n\n顺便给空状态写了一句：**猫暂时没有发表意见。**",
  "路线排好了，今天可以慢一点走。\n\n### 一条三公里以内的周末路线\n\n| 地点 | 停留建议 | 小亮点 |\n| --- | --- | --- |\n| 云朵书店 | 30 分钟 | 靠窗的位置有下午的太阳 |\n| 拐角手冲 | 45 分钟 | 橘猫店长周六通常在岗 |\n| 河边小公园 | 20 分钟 | 适合把没看完的书翻完 |\n\n地图加上了「手冲」「有插座」「店猫在岗」三个筛选项。收藏地点和路线可以离线打开，步行距离会随拖动顺序重新计算。\n\n**全程约 2.6 公里。** 不赶时间的话，刚好把一个下午用完。",
  "唱片会转起来，但不会抢走音乐的注意力。\n\n播放时匀速旋转，暂停后用 1.2 秒慢慢停住；再次播放从原来的角度继续，不会突然回到起点。\n\n```css\n.record {\n  animation: spin 8s linear infinite;\n}\n.record[data-paused=\"true\"] {\n  animation-play-state: paused;\n}\n```\n\n唱针只在播放状态落下。系统开启「减少动态效果」时，旋转自动停用，唱片封面仍然完整保留。\n\n还加了一个小细节：切歌时，唱片标签会先换好再轻轻落针。",
  "薄荷还有救，先把提醒从「每天一次」改成「真的需要时再提醒」。\n\n- 明天预报有雨，自动跳过露天盆栽的浇水提醒。\n- 室内植物单独分组，不受降雨预测影响。\n- 连续忽略三次提醒时，改成温和的状态询问。\n\n今天的卡片会写：**「摸摸土，再决定要不要浇水。」**\n\n浇水记录支持撤销，误点不会让下一次提醒凭空推迟。",
  "这张地铁票现在有自己的展签了。\n\n### 临时展览 · 一次普通的出发\n\n**藏品名称：** 周六下午的单程票  \n**材质：** 纸、油墨和一点临时起意  \n**收藏地点：** 外套左边的口袋\n\n照片可以翻面查看，背面留给故事。日期不确定时允许填写「某个秋天」，不用为了保存回忆编一个精确日期。\n\n新增藏品页也支持拖入多张照片，第一张自动成为封面。",
  "把深夜跑酷分成了三种模式：\n\n1. **巡逻模式**：路线稳定，重点检查每一扇门。\n2. **追逐模式**：突然加速，可能正在和不存在的对手比赛。\n3. **豹子模式**：垂直起跳，沙发靠背也算地面。\n\n时间轴可以按速度筛选，凌晨的片段默认静音。误识别支持一键纠正，下次会记住这只猫的习惯。\n\n今晚的摘要：跑了八圈，撞翻零个杯子，表现优秀。",
  "路线现在支持「不赶时间」模式。\n\n开启后，会减少换乘和折返，把有长椅、树荫和洗手间的路段排在前面。路线卡不显示倒计时，只保留总距离与预计步行时间。\n\n```ts\nconst walk = {\n  maxDistanceKm: 3,\n  prefer: ['shade', 'benches', 'quiet-streets'],\n  rush: false,\n};\n```\n\n雨天会给出一条室内备选路线：书店、展览和一杯热咖啡。",
  "混音台做好了。雨声和列车声可以单独调节，音量变化做了平滑过渡，不会突然吓人一跳。\n\n推荐一个今晚的配比：\n\n- 窗边细雨：55%\n- 远处列车：15%\n- 房间里的安静：剩下的部分\n\n定时关闭支持 15、30、60 分钟，最后两分钟缓慢淡出。关闭页面后也会停止播放，不留下找不到来源的声音。",
  "番茄的成长日记可以生成时间线了。\n\n**第 1 天** · 一朵小黄花  \n**第 12 天** · 第一颗绿色的小果子  \n**第 31 天** · 开始有一点害羞的红  \n**第 38 天** · 可以收获了\n\n同一天的照片会自动合并，漏拍几天也不会留下尴尬的空格。分享图片保留拍摄日期，可以选择隐藏阳台位置。\n\n封面文案先用：**「这是我用一个夏天等来的番茄。」**",
  "收藏夹已经能按颜色、材质和「为什么舍不得扔」筛选。\n\n目前的虚构馆藏包括：一颗蓝色玻璃珠、会反光的糖纸、没有写完的明信片，以及一枚不知道属于哪里的纽扣。\n\n拖动排列会吸附到最近的位置，也提供「上移 / 下移」按钮给键盘用户。离开页面前自动保存顺序。\n\n空分类的提示是：**这块空地，还在等一个奇怪的小东西。**",
  "咖啡日记现在可以记录豆子、风味和当天的照片。\n\n今天这一杯：\n\n| 字段 | 记录 |\n| --- | --- |\n| 豆子 | 山坡拼配 |\n| 风味 | 榛子、焦糖、烤面包 |\n| 拉花 | 一只正在思考的水豚 |\n| 心情 | 很适合把待办清单往后挪一点 |\n\n标签支持自由输入，不会要求你在「明亮酸质」和「复合层次」之间做一道考试题。",
  "猫咪审查员已经上岗，评论控制在一句话以内。\n\n```ts\n// 猫：这个变量睡在这里一下午了，没人叫过它。\nconst unusedSnack = 'tuna';\n\n// 猫：这段判断绕了三圈，比我追尾巴还累。\nif (ready && !sleeping) serveDinner();\n```\n\n趣味文案和真正的检查结果分开展示，严重程度不会被玩笑掩盖。关闭猫语模式，随时回到正常审查说明。",
  "晚安接口已加好，同一天的请求会返回同一句话，避免每次刷新都像在抽签。\n\n```json\n{\n  \"date\": \"2026-09-09\",\n  \"language\": \"zh-CN\",\n  \"message\": \"今天已经够努力了，剩下的交给明天。\"\n}\n```\n\n支持语言回退和本地缓存。网络断开时，依然能读到上一次的晚安。\n\n另外补了一条约定：接口永远不会在午夜弹出推送。",
  "摆放建议现在会同时看窗户朝向和实际日照记录。\n\n向阳的位置留给喜欢光的植物；需要柔和光线的，往窗边退半步。每张植物卡都能手动调整建议，记录比默认规则更重要。\n\n阳台平面图可以拖动花盆，松手时显示预计的日照时长。手机上也提供列表视图，不必在小屏幕里精准拖拽。",
  "时间胶囊已经封好，首页只露出一个标题和剩余天数。\n\n**写给一年后的我**  \n还有 365 天，可以慢慢走。\n\n到期前可以修改开启日期，但正文需要二次确认才能提前打开。附件和文字一起保存，导出时会附上一份说明，避免一年后忘记文件该怎么打开。\n\n空状态的第一句是：**留一点话，给以后那个你。**",
  "离线模式现在保留收藏地点、最后一条路线和手动添加的备注。\n\n网络断开时，地图上方只出现一条轻提示，不会把整个页面替换成错误画面。暂时无法查询营业时间的地点会明确标记。\n\n```ts\nconst offlinePack = {\n  savedPlaces: 12,\n  lastWalk: '书店与橘猫的下午',\n  refreshedAt: '09:30',\n};\n```\n\n恢复联网后自动补齐数据，你的路线顺序保持原样。",
  "竞态条件修好了：每次翻译都有自己的请求编号，只有最新请求可以更新界面。\n\n```ts\nconst requestId = ++latestRequest.current;\nconst result = await translate(audio);\nif (requestId !== latestRequest.current) return;\nsetTranslation(result);\n```\n\n切换录音时也会取消上一条请求，避免浪费等待时间。测试覆盖了快速连点、网络慢和中途取消三个场景。\n\n猫咪可以继续连叫三声，页面不会再把第一句当成最后一句。"
];
export const histories = new Map(sessions.map((s, i) => [s.id, [
 message(s.id, 1, 'text', { role: 'user', content: s.prompt }),
 message(s.id, 2, 'tool_use', { toolName: 'Bash', toolId: `${s.id}-test`, toolInput: { command: 'npm run test -- --run' }, toolResult: { content: '✓ playlist.test.ts (8 tests)\n✓ player.test.tsx (4 tests)\n\nTest Files  2 passed (2)\n     Tests  12 passed (12)\n  Duration  842ms', isError: false } }),
 message(s.id, 3, 'text', { role: 'assistant', content: i === 0 ? moonReply : replies[i - 1] }),
]]));
export const files = [
 { name: 'src', type: 'directory', path: '/workspace/moon-radio/src', children: [
  { name: 'components', type: 'directory', path: '/workspace/moon-radio/src/components', children: ['Player.tsx','TonightCard.tsx','MoodPicker.tsx'].map(name => ({ name, type: 'file', path: `/workspace/moon-radio/src/components/${name}`, size: 2430 })) },
  { name: 'lib', type: 'directory', path: '/workspace/moon-radio/src/lib', children: [{ name: 'tonight.ts', type: 'file', path: '/workspace/moon-radio/src/lib/tonight.ts', size: 412 }] },
  { name: 'App.tsx', type: 'file', path: '/workspace/moon-radio/src/App.tsx', size: 1830 },
 ] },
 ...['public', 'tests'].map(name => ({ name, type: 'directory', path: `/workspace/moon-radio/${name}`, children: [] })),
 ...['package.json', 'README.md', 'tsconfig.json', 'vite.config.ts'].map(name => ({ name, type: 'file', path: `/workspace/moon-radio/${name}`, size: 1080 })),
];
export const terminalOutput = '\x1b[38;2;217;119;87m  >_  Moon Radio\x1b[0m\r\n\r\n  A little music for your corner of the universe.\r\n\r\n\x1b[90m~/workspace/moon-radio\x1b[0m  \x1b[32mfeature/tonight-playlist\x1b[0m\r\n$ npm run test -- --run\r\n\r\n \x1b[32m✓\x1b[0m tests/playlist.test.ts (8 tests)  124ms\r\n \x1b[32m✓\x1b[0m tests/player.test.tsx (4 tests)   86ms\r\n\r\n Test Files  \x1b[32m2 passed\x1b[0m (2)\r\n      Tests  \x1b[32m12 passed\x1b[0m (12)\r\n   Duration  842ms\r\n\r\n$ npm run build\r\n\r\n vite building for production...\r\n \x1b[32m✓\x1b[0m 148 modules transformed.\r\n dist/index.html                  0.64 kB\r\n dist/assets/index.js            48.26 kB │ gzip: 16.84 kB\r\n \x1b[32m✓ built in 1.24s\x1b[0m\r\n\r\n$ ';
