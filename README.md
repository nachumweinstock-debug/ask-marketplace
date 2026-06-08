# ASK Marketplace

Campus marketplace for student tutoring and services. The repo contains:

- A Vite/React client in `src/`
- An Express API in `server/`
- SEO page generators in `scripts/`
- A lightweight SQLite deployment path with optional Supabase integrations

## Stack

- Frontend: React 19, Vite 8, React Router 7, Tailwind 4
- Backend: Express 5, better-sqlite3, JWT auth
- Infra: Vercel for web, Railway for API/storage
- Testing: ESLint, Playwright, production smoke script

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy envs and fill them in:

```bash
cp .env.example .env
```

3. Start client and API together:

```bash
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5175`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/api/health`

## Scripts

- `npm run dev` starts Express and Vite together
- `npm run build` generates SEO pages and builds the client
- `npm run lint` runs ESLint
- `npm run test:e2e` runs Playwright against `E2E_BASE_URL` or `https://www.uask.live`
- `npm run smoke:prod` runs the production API smoke test
- `npm run start` starts the Express API

## Environment

Use `.env.example` as the source of truth.

Important variables:

- `DATA_DIR` persistent location for `ask.db` and `uploads/`
- `JWT_SECRET` required for auth
- `FRONTEND_URL` canonical frontend origin
- `VITE_API_URL` frontend API base URL in deployed environments
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for browser Supabase access
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for server-side integrations

Optional but expected in production:

- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- `GEMINI_API_KEY` for the availability parser only; Ask Concierge is now local and trained from ASK history
- `RESEND_API_KEY`
- `POSTHOG_API_KEY`
- `PEXELS_API_KEY`

## Deployment

Frontend:

- `vercel.json` is configured for the Vite app
- Point `VITE_API_URL` at the Railway API, typically `https://<railway-domain>/api`

Backend:

- `railway.toml` starts `node server/index.js`
- Health endpoint is `GET /api/health`
- Mount persistent storage and set `DATA_DIR` to that mount path

## Build Notes

- `npm run build` mutates generated SEO pages and `public/sitemap.xml` as part of `prebuild`
- If you are reviewing content changes, expect generated diffs under `app/` and `public/sitemap.xml`

## Production Checks

Before shipping:

```bash
npm run lint
npm run build
npm run smoke:prod
```

`smoke:prod` targets `https://ask-marketplace-production.up.railway.app/api` by default. Override with:

```bash
API_BASE=https://your-api.example.com/api npm run smoke:prod
```
