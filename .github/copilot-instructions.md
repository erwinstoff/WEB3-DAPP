## Quick guide for AI coding agents

This repository is a Next.js (app router) TypeScript webapp focused on Web3 airdrops with integrated AI helpers (Gemini).
Use this file to find the most relevant places to change behavior, tests to run locally, runtime constraints, and common conventions.

Core facts
- Framework: Next.js (app/ directory). React 19 + Next 15.
- Package manager: pnpm is used in developer notes; scripts in `package.json` (see `dev`, `build`, `start`, `lint`).
- Styling: Tailwind CSS v4 and `globals.css` in `app/`.
- AI: Uses `@google/generative-ai` (Gemini) in `lib/gemini.ts` and server `/api/*` routes.

Where to start
- UI entry: `app/page.tsx` and `components/` (e.g. `AIChat.tsx`, `AirdropDetailsPopup.tsx`).
- AI client helpers: `lib/gemini.ts` — contains `chatWithAI`, `chatWithAIStream`, and `analyzeAirdrop`.
- Server-side chat streaming: `app/api/chat/route.ts` (runtime='edge', streams Gemini tokens). Edit here for prompt changes or streaming behavior.
- Airdrop explanations: `app/api/airdrop-explainer/route.ts` (used by `lib/gemini.analyzeAirdrop`).

Environment & secrets
- Gemini API key: `NEXT_PUBLIC_GEMINI_API_KEY` — currently used directly in both client helper and edge route. Be cautious: `NEXT_PUBLIC_*` variables are exposed to the client.
- Project airdrop context: `NEXT_PUBLIC_AIRDROP_*` (NAME, TOKEN, SNAPSHOT, ELIGIBILITY, REWARDS, CLAIM_STEPS, DOCS_URL, CONTACT_URL). These are consumed by `/api/chat` to build system prompts.

Important patterns & conventions (concrete examples)
- Streaming: `lib/gemini.chatWithAIStream` calls `/api/chat` and consumes a ReadableStream from the edge route. When editing streaming logic, update both the client reader and the route's ReadableStream handling.
- Prompts: System prompts live inside `lib/gemini.ts` (client hints) and `app/api/chat/route.ts` (authoritative system prompt + env-derived context). Prefer editing the server prompt for consistent behavior.
- Local persistence: AI chat messages are stored in `localStorage` under key `ai_chat_messages_v1` (see `components/AIChat.tsx`). Keep saved format as an array of {role, content}.
- Client components: Many components use "use client" and rely on browser-only APIs (localStorage, window). Don't move those to server components unless you also handle hydration.
- UX: Keyboard shortcuts and streaming cancelation are implemented in `components/AIChat.tsx` (Esc to close, Ctrl/Cmd+K to focus, Ctrl+Enter to send, Ctrl+. to stop).

Developer workflows & quick commands
- Install deps: `pnpm install` (project uses pnpm in README). If you use npm/yarn adjust accordingly.
- Start dev server (fast feedback):
```powershell
pnpm dev
```
- Build & start: `pnpm build` then `pnpm start`.
- Lint: `pnpm lint` (uses Next's ESLint config).

Testing AI changes locally
- To test chat streaming or prompt edits:
  1. Ensure `NEXT_PUBLIC_GEMINI_API_KEY` is set in your environment (for local dev you can set in your shell or an `.env.local`).
  2. Run `pnpm dev` and open `http://localhost:3000`.
  3. Open the AI chat UI (triggered from header/controls) and send a message to verify streaming and prompt behavior.

Editing guidance & safe defaults
- If you change prompts or system behavior, update both the edge route (`app/api/chat/route.ts`) and the client fallback (`lib/gemini.ts`) so client-only flows match server behavior.
- Prefer adding env-driven context via `NEXT_PUBLIC_AIRDROP_*` keys rather than hard-coding facts in the route, so non-devs can update content without code changes.
- When changing streaming logic, handle both successful streaming and fallback (the edge route already has a fallback to non-streaming). Mirror error handling on the client.

Search tips
- Search for `NEXT_PUBLIC_GEMINI_API_KEY`, `NEXT_PUBLIC_AIRDROP_`, `ai_chat_messages_v1`, `chatWithAIStream` to find all related code quickly.

Files of interest
- `lib/gemini.ts` (AI helpers)
- `components/AIChat.tsx` (client streaming UI + keyboard shortcuts)
- `app/api/chat/route.ts` (edge streaming endpoint; authoritative system prompt)
- `app/api/airdrop-explainer/route.ts` (airdrop analysis)
- `components/AirdropDetailsPopup.tsx` (airdrop details UI)

If anything here is unclear or you want me to expand a section (examples, tests, or safer env handling), tell me which part and I'll update this file.
