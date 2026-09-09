# Contributing / 参与贡献

[简体中文](README.md) · [English](README.en.md)

欢迎为 Codex-Web 提交修复、翻译和功能改进。先查看 [Issues](https://github.com/DohhhDo/Codex-Web/issues)，避免重复工作；较大的改动请先说明使用场景。

Bug fixes, translations, and focused improvements are welcome. Check [existing issues](https://github.com/DohhhDo/Codex-Web/issues) first, and describe the use case before starting a large change.

## Setup / 环境

Node.js 22+, npm, Git. A signed-in Codex CLI is needed for real provider testing; the demo uses only fixtures.

```bash
npm ci
npm run dev
```

For UI work without a real account:

```bash
npm run build:client
npm run demo
```

## Changes / 修改

- Follow [AGENTS.md](AGENTS.md) and the module standards it references. Follow [DESIGN.md](DESIGN.md) for interface changes.
- Keep changes focused. Include a reproduction or a concrete before/after example.
- Include screenshots for visible UI changes. Use the demo account and fictional data; do not include credentials, personal conversations, or private file paths.
- Keep `README.md` and `README.en.md` consistent when changing user-facing instructions.
- Preserve upstream attribution and third-party licenses. Contributions use the repository's AGPL-3.0-or-later license.

## Checks / 检查

```bash
npm run test:client
npm run typecheck
npm run lint
npm run build
node --test scripts/demo/demo.test.mjs
```

For backend changes, also run the relevant tests in `server/modules/<module>/tests/`. Use a temporary database for integration tests.

PR descriptions should state the problem, the resulting behavior, and the checks performed. Useful commit prefixes include `feat:`, `fix:`, `docs:`, and `test:`.
