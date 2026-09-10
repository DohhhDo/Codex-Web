# Codex-Web

A local browser workspace for Codex. The primary user opens projects, resumes coding sessions, selects models, approves operations, and reviews files and Git changes. The main language for this installation is Simplified Chinese; all existing locale support is retained.

The user explicitly named the product Codex-Web and requested Claude's visual style using Anthropic's official skill. `.agents/skills/brand-guidelines/SKILL.md` is the visual authority. The product keeps its own identity, terminal-prompt mark, and Codex terminology.

React 18, TypeScript, Vite, Tailwind CSS, existing Node backend. Base: CloudCLI v1.37.3. New installs default to Codex; existing explicitly saved providers and session origins remain readable. Existing data storage, provider authorization, execution and permission behavior are retained. The workspace opens directly without local login or registration; a persistent internal owner preserves existing preferences and drafts. Settings provides editable display identity with optional Codex account defaults. Legacy login/register endpoints are retired. No paid model calls are required for visual testing.
