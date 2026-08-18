# AssetCues Chatbot UI

React + Vite portal for AssetCues (chat, teams, tasks). Deploy this repo on **Vercel** (or Netlify). The FastAPI backend lives separately (Render).

Live frontend: https://chatbot-ui-navy-gamma.vercel.app  
API: https://chatbot-backend-h6oj.onrender.com

## Google login (required)

Google OAuth succeeds only if Supabase is allowed to return to this app. If **Site URL** is left as `http://localhost:3000`, the browser lands on localhost after Google and shows `ERR_CONNECTION_REFUSED`.

In the Supabase project used by `VITE_SUPABASE_URL`: **Authentication → URL Configuration**

**Site URL**

```
https://chatbot-ui-navy-gamma.vercel.app
```

**Redirect URLs** (add all)

```
https://chatbot-ui-navy-gamma.vercel.app/auth/callback
https://chatbot-ui-navy-gamma.vercel.app/**
http://localhost:5173/auth/callback
http://127.0.0.1:5173/auth/callback
```

On Render, add the Vercel origin to `CORS_ORIGINS`:

```
https://chatbot-ui-navy-gamma.vercel.app
```

Google Cloud redirect URI stays the Supabase callback (`https://<project-ref>.supabase.co/auth/v1/callback`). Do not point Google at localhost or Vercel.

## Vercel

1. Import this repo (root is this frontend).
2. Build settings (also in `vercel.json`):
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Node:** 20
3. Environment variables (Project → Settings → Environment Variables). Redeploy after changing `VITE_*` — they are baked in at **build** time.

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://chatbot-backend-h6oj.onrender.com` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

`vercel.json` rewrites SPA routes (so `/auth/callback` does not 404) and proxies `/docs`, `/redoc`, and `/openapi.json` to Render.

## Netlify

1. Site → **Import from Git** → this repo
2. Build settings (already in `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node:** 20
3. Same `VITE_*` environment variables as Vercel.

Site config is `netlify.toml` (what Netlify reads). `netlify.yml` is the same settings in YAML.

On the Render backend, add the Netlify site origin to `CORS_ORIGINS` as well if you use that host.

## Local

```powershell
copy .env.example .env
# set VITE_SUPABASE_*
# VITE_API_URL already points at Render; clear it to use a local API on port 8000
npm install
npm run dev
```

Dev server: http://127.0.0.1:5173
