# Codex-Web design system

## Authority

The user's selected reference is Claude, using Anthropic's official [brand-guidelines skill](.agents/skills/brand-guidelines/SKILL.md). The application is named **Codex-Web**. Do not reintroduce CloudCLI marketing, GitHub star badges or multi-agent promotion into the main interface. Upstream attribution belongs in About and the README.

The user-supplied Claude recording (2026-09-09 13:32:40) is the more specific visual authority. Match observed layout and neutral dark surfaces; keep Codex-Web branding and the explicit interaction constraints below. Reference frames are private review artifacts, not product assets.

## Color

- Official light: `#faf9f5`; official dark ink: `#141413`.
- Official primary accent: `#d97757`. Use warm white `#faf9f5` for icons and labels inside solid primary buttons in both themes, as requested by the user.
- Official light gray: `#e8e6dc`; mid gray: `#b0aea5`.
- Auxiliary official accents: blue `#6a9bcc`, green `#788c5d`, only where semantic information calls for them.
- Light sidebar: `#f0eee6`; white input and selection surfaces; boundary `#dedbd2`.
- Light secondary text: `#6b6962`; small orange-toned text: `#a54b30` for contrast.
- Dark colors sampled from the recording: canvas `#141414`, sidebar `#111111`, composer/popover `#1f1f1f`, settings content `#191919`, controls `#262626`. Secondary text `#a8a8a8`; boundaries `#333333`.

Semantic Tailwind tokens are in `src/index.css`. Brand-specific components use `src/codex-theme.css`. Preserve both themes and the user's theme preference.

## Typography

Plain Arial/native CJK sans for interface controls, following the recording rather than the generic brand skill’s geometric Poppins. Self-hosted Lora for the wordmark, welcome headings and assistant prose; this is an available serif approximation, not a claim to use Claude’s proprietary fonts. Use additional line height for prose; monospace only for code. Local CJK sans and serif fallbacks preserve native Chinese rendering. Font sources and OFL licenses are in `public/fonts/`. Do not depend on Google Fonts requests at runtime.

Wordmark 21px/500, home headline 27–36px/400, chat invitation 27–34px/400, controls 12–14px, assistant prose 16px/1.85 desktop and 15px mobile. Chat reading column: 780px maximum; new-conversation composer: 640px.

## Layout and interaction

272px sidebar, solid theme surfaces, 68px workspace header. Keep the brand and new chat entry at the top, a single navigation row next, a separated list heading with search/refresh tools, scrollable sessions in the middle, and a compact single-line account/settings row at the bottom. Default to cross-project conversations; the project tree is available through its navigation icon. Session rows are flat, selected rows use a quiet tonal fill.

The project home uses real projects as direct entry points. New conversations group the invitation and composer centrally; the small model-library link opens the full catalogue. Once a transcript exists it scrolls above the bottom composer. Compose/upload/model/permission/streaming handlers are retained from upstream.

Corners: 7–8px navigation, 12px message/model surfaces, 14px composer and 16px home picker. No composer shadow; a soft offset shadow anchors popovers. No glow, decorative gradients, marketing cards or textured backgrounds.

Responsive drawer below 768px; visible keyboard focus, readable placeholders, reduced-motion support and browser zoom. Theme selection, caret and scrollbars from the same palette. Test short-height windows as well as desktop and mobile.

## Identity

The orange `>_` mark has a fully transparent background in the app and browser icons. It is original vector geometry for Codex-Web, shared through `CodexWebMark`. SVG, PNG and ICO favicon/PWA variants are generated from `public/logo.svg` by `node public/generate-icons.js`. The generator updates HTML, manifest and notification icon URLs with a content hash because deployed images are cached as immutable for a year. Provider logos still identify the actual provider of a historical session.

## Iconography

Use **Phosphor Icons** (`@phosphor-icons/react`, MIT; license in `public/licenses/phosphor-icons.txt`). Import individual components from `@phosphor-icons/react/dist/csr/<Name>` to keep development compilation and production bundles focused on the icons in use. The app's `IconContext` sets Regular, 20px, current text color, and decorative accessibility defaults; each control retains its accessible label.

Navigation icons are 18px; compact toolbar icons are 14–16px. Use Duotone for selected navigation and prominent empty states, Regular for resting controls, and Fill for selected favorites and stop controls. Use Phosphor's `weight`, never Lucide-style `strokeWidth` or `fill-current` to change the silhouette. Send uses an upward arrow; settings uses GearSix; conversations use ChatCircle.

The original Codex-Web mark and provider identities stay as brand vectors. Git graph paths remain data visualization. CodeMirror's DOM toolbar uses static SVGs generated from the same Phosphor package by `node scripts/generate-toolbar-icons.mjs`; regenerate those after upgrading the package. Do not introduce another UI icon library or hand-draw replacement action icons.

## Composer

The resting input surface contains three controls: a left-aligned **+** action menu, a plain model selector, and a circular send button. Keep the writing area free of token badges, command counters and shortcut paragraphs. The + menu contains attachments, commands, available voice input, scheduling, token usage and draft clearing. Voice recording or transcription exposes its active control only while needed.

Show the approval mode as a small text control below the input, keeping non-default permission modes legible. The right side of this outside footer shows session Tokens, cached-input hit rate, subscription level, and only provider-reported remaining allowance windows. Unknown values use an em dash. Context capacity is never presented as account quota; full keyboard help stays available to assistive technology. Attachments, pending approvals, queued drafts and scheduled messages remain contextual rows. The textarea and mention highlight overlay must share identical font metrics and padding.

The actions menu aligns left and fits narrow viewports. Menus open below the central composer when room permits and above the bottom composer; short viewports scroll the menu. Models appear first. Reasoning opens a separate menu view with Back navigation, translated effort labels and the selected option focused; model and effort lists never form nested scrolling regions. The selected effort is visible on mobile too. Scheduling replaces its contents in the same popup, with Back navigation; Escape closes and restores focus. Use arrow keys/Home/End to navigate menu controls. Keep invalid or past custom send times disabled and revalidate at submission.

The empty composer is 104px tall on desktop and mobile. Use a one-row textarea with 24px line height, 16px top and 18px bottom padding; let content grow it naturally and shrink on clearing. Both the mention overlay and textarea use these metrics. The focused textarea has no independent outline or shadow; the outer form uses only a slight neutral border change, with no orange ring or added glow. Keep keyboard focus styling on action buttons.

The sidebar New chat action is a full-width neutral gray row with a Plus icon, matching the recording. Solid orange send/primary buttons still use the requested near-white foreground. Create project belongs to the Projects list toolbar. Navigation follows in one row of four equal icon buttons. Projects, Chats, Running and Archive all use the same icon-only treatment, with tooltip names and accessible labels. Do not wrap this navigation onto two rows or mix text-only and icon-only controls. Search opens from the list heading, receives focus, and closes/clears with Escape or its close control. The list heading reflects the selected mode and owns Search and Refresh. Keep DOM and keyboard order consistent with this arrangement.

Conversation titles lead single-line 34px desktop rows (42px on mobile), with 14px type, one quiet status marker, and tonal hover/selection. Avoid always-visible provider logos, dates, project metadata, nested cards and duplicate list headings. Project, provider and timestamp details are available in each session’s menu, including on touch screens. More controls reveal on hover/focus and remain visible on touch. Retain native links, running/attention indicators, rename/fork/archive actions and pagination. Account avatar is 28px with a single name line. The Codex-Web wordmark and all four navigation icons remain.

Conversation tool disclosures share a 12px neutral border, a compact header with the chevron on the right, and a theme-neutral expanded code surface. Keep command previews truncated in the header and the complete command/output accessible when expanded. File titles still open the file; their separate chevron expands the diff. Use semantic error and diff colors only for status and changed lines.

Settings use a 210px desktop navigation column and a direct content pane, at most 1100px wide. The close control sits at the upper right, with no spanning desktop title bar. Setting groups use ordinary sentence-case headings and row separators, without nested card outlines. Mobile retains its header and horizontal section navigation.

Notification settings use the same direct rows, thin separators and switches as Appearance. Preserve browser permission explanations and desktop/browser subscription callbacks. The terminal toolbar, connection states and canvas follow the active theme; changing theme must repaint without restarting the PTY. Mobile terminal shortcuts and CLI choice controls occupy normal layout space so they cannot cover the last terminal rows. ANSI status colors remain meaningful.

## Screenshot demo

The local demo reuses this visual system with optional account imagery: **DOhhhDO** uses the original astronaut-cat avatar at `public/demo/dohhhdo-avatar.png` in the existing 28px account slot. Five fictional projects and eighteen distinct conversations provide populated views without changing the pinned layout, typography or palette.

Build with `npm run build:client`, then run `npm run demo` and open `http://localhost:3002`. Use `?theme=light` or `?theme=dark` for either theme and `?home=1` for the project home. Screenshots live in `docs/screenshots/demo/`; setup details are in [scripts/demo/README.md](scripts/demo/README.md).

The separate fixture server keeps its state in memory and uses no real provider or account database. Chat replies, files, quotas and test output are fictional; terminal commands never execute. The demo bootstrap disables external browser fetches. This is a local screenshot extension of the existing app.
