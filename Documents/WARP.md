# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project context
- Insight LLM is a Next.js 14 App Router project (TypeScript) that provides an AI chat experience. It uses Clerk for authentication, Supabase for persistence, Zustand for client state, TailwindCSS for styling, and Google’s Generative AI (Gemini) for LLM features.

Common commands
- Install dependencies (uses npm due to package-lock.json):
  - npm install
- Run the dev server (http://localhost:3000 by default):
  - npm run dev
- Build the app:
  - npm run build
- Start production server (after build):
  - npm run start
- Lint (Next.js ESLint):
  - npm run lint
- Tests: no test runner is configured in this repo (no test scripts or configs found).

Environment and runtime requirements
- Required environment variables (see .env.sample for structure; do not commit secrets):
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - CLERK_SECRET_KEY
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - NEXT_PUBLIC_API_KEY (Gemini API key)
- Important: src/utils/db.ts throws if any Supabase env vars are missing. Ensure all are set before running dev/build.
- Authentication middleware is enabled via src/middleware.ts (clerkMiddleware). It applies broadly to app routes and API routes per its matcher.

High-level architecture
- Framework and routing
  - Next.js App Router lives under src/app.
  - Route groups organize pages: src/app/(routes)/(general)/app
    - /app (home for signed-in users), /app/[chat] (chat detail).
  - Global providers are composed in src/app/layout.tsx: ClerkProvider (auth) and ThemeProviders (Next Themes) wrap the app, with global styles at src/app/globals.css.
  - next.config.mjs configures remote image domains for Clerk assets.
- Data layer and server actions
  - Supabase is used for persistence. The admin client (bypasses RLS) is created in src/utils/db.ts using SUPABASE_SERVICE_ROLE_KEY; a standard anon client is also exported.
  - Server Actions in src/actions/actions.ts encapsulate all CRUD:
    - createChat: ensures a conversations row exists (by chat_id, user_id), then inserts a messages row.
    - getSidebarChat: lists conversations for a user, projecting to sidebar-friendly shape with pinning and timestamps.
    - getChatHistory: resolves conversation.id, then loads messages ordered by created_at.
    - deleteChat: deletes a conversation for the current user (cascades messages).
    - renameChat: updates title/icon on a conversation for the current user.
    - pinChat: toggles is_pinned on a conversation for the current user.
    - updateResponse: updates llm_response for a specific message id.
  - Implicit DB schema expectations (from code):
    - conversations: id, user_id, chat_id, title, icon, is_pinned, created_at, updated_at
    - messages: id, conversation_id, user_prompt, llm_response, img_name, created_at
- Client state and UI composition
  - State: src/utils/insight-zustand.ts manages UI and chat state (msg loader, optimistic prompt/response, top loader, dev toast, selected image name, custom prompt config, and geminiApiKey sourced from NEXT_PUBLIC_API_KEY).
  - Rich text rendering/editing: src/components/chat-provider-components/chat-provider.tsx uses TipTap with a markdown extension and a custom CodeBlock renderer. It can selectively modify parts of an LLM response by generating edits via Gemini and then persisting them through updateResponse (server action).
  - Auth awareness in routes: pages pull currentUser from @clerk/nextjs/server; unauthenticated users are redirected or shown sign-in prompts depending on route.
  - UI tech: TailwindCSS (tailwind.config.ts, postcss.config.mjs), Framer Motion (micro-animations), Next Themes (dark/light via ThemeProviders), various component groups under src/components (sidebar, header, input prompt, chat provider).
- Path aliases and TypeScript
  - tsconfig.json defines path alias @/* -> src/* for imports across the app.
  - Strict TS settings with noEmit; Next handles type-checking during build.

Notes for future agents
- This project does not currently include a test runner (Jest/Vitest/Cypress/Playwright). If you add one, include scripts in package.json so commands can be surfaced here.
- The presence of .env.sample includes older NextAuth-related variables, but the application code uses Clerk for authentication. Prefer Clerk env vars listed above.
