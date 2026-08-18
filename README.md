# AssetCues Chatbot UI

React + Vite portal for AssetCues (chat, teams, tasks). Deploy this repo on **Netlify**. The FastAPI backend lives separately (Render).

## Netlify

1. Site → **Import from Git** → this repo
2. Build settings (already in `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node:** 20
3. Environment variables (Site settings → Environment variables):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | Render backend origin, e.g. `https://your-service.onrender.com` (no trailing slash) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

`VITE_*` values are baked in at **build** time. After changing them, trigger a new deploy.

On the Render backend, add the Netlify site origin to `CORS_ORIGINS` (e.g. `https://your-site.netlify.app`).

## Local

```powershell
copy .env.example .env
# set VITE_SUPABASE_* ; leave VITE_API_URL empty (Vite proxies /api → localhost:8000)
npm install
npm run dev
```

Dev server: http://127.0.0.1:5173
