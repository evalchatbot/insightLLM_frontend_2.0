# Evaluations + Fact Book (standalone)

A trimmed-down clone of the Rubric AI frontend that ships **only two features**:

- **Evaluations** (`/app/ocr`) — upload an answer PDF and get AI feedback (rubric, essay, précis, outline modes)
- **Fact Book** (`/app/factbook`) — daily editorial summaries by date and topic

It has **no Clerk / no Supabase auth** — access is a single **hardcoded username/password**.
It talks to the **same live FastAPI backend** as the production app (nothing is duplicated or changed on the backend).

> This lives on the `eval-factbook-standalone` branch of the `insightLLM_frontend_2.0`
> repo, checked out as a git worktree. The production app (`production` branch) is untouched.

## Setup

1. Install deps:

   ```bash
   npm ci
   ```

2. Configure `.env.local` (already scaffolded — edit the values):

   ```bash
   NEXT_PUBLIC_API_BASE_URL=https://your-live-backend-url   # same as production Vercel env
   APP_USERNAME=admin                                       # change me
   APP_PASSWORD=changeme                                    # change me
   APP_SESSION_TOKEN=some-long-random-string                # change me
   ```

3. Run:

   ```bash
   npm run dev        # http://localhost:3000
   # or: npm run build && npm run start
   ```

You'll land on `/login`. Sign in with `APP_USERNAME` / `APP_PASSWORD` to reach the two features.

## How the auth works (no external provider)

- [`src/lib/auth.ts`](src/lib/auth.ts) — reads the hardcoded credentials + session token from env.
- [`src/app/login/page.tsx`](src/app/login/page.tsx) → posts to [`src/app/api/login/route.ts`](src/app/api/login/route.ts), which sets an httpOnly `ef_session` cookie.
- [`src/middleware.ts`](src/middleware.ts) — redirects anything except `/login` (and static assets) to the login page unless the cookie is valid.
- [`src/app/api/logout/route.ts`](src/app/api/logout/route.ts) — clears the cookie ("Log out" in the navbar).

## What changed vs. the full app

- Removed `ClerkProvider`, `clerkMiddleware`, `EnsureSupabaseUser`, and all Clerk sign-in UI.
- Deleted every route except the two features (no chat, MCQs, past-papers, pro, prompt-gallery, help).
- Per-user usage limits are disabled — the `/api/ocr/check-limit` and `/api/ocr/record-usage`
  routes are now always-allow stubs (no Clerk/Supabase).
- The Feedback widget works without Supabase (submissions are logged unless Supabase env is set).
- The `@clerk/nextjs` package is still installed but **inactive** (no provider, no middleware);
  it can be fully removed later.

## Deploy note

Deploy this branch as its **own** project (e.g. a separate Vercel project) with the env vars above.
Do **not** merge this branch into `production` — it would replace the full app.
