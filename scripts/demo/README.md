# Codex-Web screenshot demo

A separate local website that reuses the real frontend with fictional data. The account is **DOhhhDO**, with an original generated astronaut-cat avatar, five projects and eighteen conversations.

```sh
npm run build:client
npm run demo
```

Open http://localhost:3002. The demo stays separate from the working app on port 3001.

- Default conversation: `/session/demo-1` (Moon Radio).
- Light / dark: `/?theme=light` and `/?theme=dark`.
- Project home: `/?home=1`.
- Other conversations: `/session/demo-2` through `/session/demo-18`.
- Set `DEMO_PORT` to use a different port. The server listens on loopback.

Chat, session switching, theme/effort selection, the file viewer, notification settings and the terminal can be used for screenshots. Messages, account tier, quotas and test output are illustrative. The terminal echoes text and never executes commands. Chat sends a canned reply. Unimplemented API operations return an explicit error. Server-side changes stay in process memory and reset when the demo restarts; browser preferences such as the theme can persist locally. No account database, real sessions, credentials or provider connections are used. The demo bootstrap disables external browser fetches, and no service worker is registered on this demo origin.

Run `node --test scripts/demo/demo.test.mjs` after building to verify the demo's transport and isolation behavior.

The avatar is generated for this demo with OpenAI image generation. Its exact prompt and source are recorded in `public/demo/avatar-provenance.json`; the full-resolution original is preserved.
