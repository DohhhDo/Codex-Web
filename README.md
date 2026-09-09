<img src="public/logo.svg" width="56" alt="Codex-Web" />

# Codex-Web

**把 Codex 项目、对话和终端放进同一个浏览器工作区。**

简体中文 · [English](README.en.md) · [截图画廊](docs/screenshots/README.md) · [参与贡献](CONTRIBUTING.md)

Codex-Web 是一个以 Codex 为主的自托管 Web 工作区。继续本机的对话、切换工程、查看文件和代码变更，不用在多个终端窗口之间来回寻找会话。界面参考 Claude 的视觉风格，提供深浅主题和手机布局。

由 **DohhhDo** 独立维护，基于 [CloudCLI UI](https://github.com/siteboon/claudecodeui) 衍生开发。

![Codex-Web 深色对话界面](docs/screenshots/demo/chat-dark.png)

> 所有展示截图均来自独立演示站。用户名、项目、对话、测试输出、Token 和套餐数据均为示例，不代表真实账号或运行结果。

## 可以做什么

- **管理项目与会话**：最近对话、项目分组、搜索、重命名和归档。
- **在浏览器里使用 Codex**：继续会话，选择模型、思考档位和操作权限，添加附件与查看工具结果。
- **查看用量**：输入框外显示 Token 数、缓存命中率、订阅级别，以及服务端有返回时的套餐剩余额度。
- **使用工程工具**：集成终端、文件浏览与编辑、Git 变更查看。
- **调整工作界面**：深浅主题、Phosphor 图标、可折叠代码结果、通知设置和适配手机的侧栏。
- **运行截图示例站**：5 个虚构项目、18 段不同的趣味对话、DOhhhDO 头像和独立的演示终端。

## 界面预览

### 浅色主题

![浅色对话界面](docs/screenshots/demo/chat-light.png)

### 工程首页

![工程首页](docs/screenshots/demo/project-home.png)

### 模型与思考档位

![思考档位选择](docs/screenshots/demo/reasoning-menu.png)

### 集成终端

![深色终端](docs/screenshots/demo/terminal.png)

[查看全部截图：项目侧栏、模型菜单、工具输出、通知、外观和手机界面 →](docs/screenshots/README.md)

## 快速开始

需要 **Node.js 22+、npm 和 Git**。真实对话还需要本机已经安装并登录的 Codex CLI；演示站不需要 Codex 登录信息。

```bash
git clone https://github.com/DohhhDo/Codex-Web.git
cd Codex-Web
npm ci
npm run build
npm run server
```

打开 **http://localhost:3001**，按页面提示创建本地账号，再选择工程开始使用。

已有 3001 端口服务时，可在 `.env` 中设置其他 `SERVER_PORT`。可参考 [.env.example](.env.example) 配置端口、主机和数据路径。

### 开发模式

```bash
npm run dev
```

前端开发服务默认在 `5173`，后端在 `3001`。已有后端时，只运行 `npm run client`。

### 只体验示例界面

```bash
npm ci
npm run build:client
npm run demo
```

打开 **http://localhost:3002**。默认展示“月球电台”，也可以尝试：

- `/?theme=light`：浅色主题。
- `/?theme=dark`：深色主题。
- `/?home=1`：工程首页。
- `/session/demo-2`：猫咪翻译器。

示例站的 API 使用内存假数据，聊天返回预设回复，终端不执行命令。它不会读取真实会话、认证数据库或调用模型。详见 [演示站说明](scripts/demo/README.md)。

## 用量与数据

缓存命中率按“缓存输入 Token ÷ 输入 Token”计算。套餐余额来自 Codex 最近一次上报的账户额度窗口；它与模型上下文容量是两回事。缺失数据以 `—` 显示，未返回的额度不显示。

本项目保留兼容的数据路径，包括 `~/.cloudcli` 和 `~/.codex`，以便继续使用已有会话与登录信息。仓库中的 `1.37.3` 保留为本次衍生开发的兼容版本号，上游基础提交和修改范围记录在 [NOTICE](NOTICE)。

首发重点是浏览器工作区。仓库保留部分上游 provider、桌面和部署实现，当前不提供 Codex-Web 的 npm 包、Docker 镜像或桌面发行包；请按上面的源码方式运行。

## 开发与验证

```bash
npm run test:client
npm run typecheck
npm run lint
npm run build
node --test scripts/demo/demo.test.mjs
```

目录分工：`src/` 为 React 前端，`server/` 为 TypeScript 后端，`shared/` 为公共契约，`scripts/demo/` 为示例站，`docs/screenshots/` 为公开的假数据截图。

界面规范见 [DESIGN.md](DESIGN.md)。问题和建议请提交到 [本项目 Issues](https://github.com/DohhhDo/Codex-Web/issues)。

## 来源与许可证

- 基于 [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) v1.37.3，基础提交 `70e57859b6224ff0eb0539fcde7d13a3186c9c93`。保留 [上游说明](docs/UPSTREAM-README.md)、[NOTICE](NOTICE) 和原有版权归属。
- 按 [AGPL-3.0-or-later](LICENSE) 开源，并保留 LICENSE 内的第 7 条附加条款。
- 图标使用 Phosphor Icons，字体及第三方资源的许可证随资源保留。
- 视觉参考 Anthropic 公开品牌规范。Codex-Web 是独立衍生项目，**不是 OpenAI 或 Anthropic 的官方产品**。
