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
| `VITE_API_URL` | `https://chatbot-backend-h6oj.onrender.com` (set in `netlify.toml` and `.env.production`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

`VITE_*` values are baked in at **build** time. After changing them, trigger a new deploy.

Site config is `netlify.toml` (what Netlify reads). `netlify.yml` is the same settings in YAML.

On the Render backend, add the Netlify site origin to `CORS_ORIGINS` (e.g. `https://your-site.netlify.app`). Right now health only lists localhost origins.

## Local

```powershell
copy .env.example .env
# set VITE_SUPABASE_*
# VITE_API_URL already points at Render; clear it to use a local API on port 8000
npm install
npm run dev
```

Dev server: http://127.0.0.1:5173
