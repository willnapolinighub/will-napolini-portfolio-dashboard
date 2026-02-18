# Admin App

> Headless CMS and admin dashboard for the Will Napolini personal brand platform.
> Manages posts, products, subscribers, and AI settings — exposes a public read API for the frontend.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](#)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/willnapolini/myshop.github.io&root-directory=apps/admin&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ADMIN_API_KEY,FRONTEND_URL,NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,NEXT_PUBLIC_CLOUDINARY_API_KEY,CLOUDINARY_API_SECRET&envDescription=See%20.env.example%20for%20all%20required%20variables&envLink=https://github.com/willnapolini/myshop.github.io/blob/main/apps/admin/.env.example)

---

## Features

- 📝 **Blog post management** — create, edit, delete with AI-assisted generation
- 🛍️ **Product management** — digital products with Stripe payment links
- 👥 **Subscriber list** — view and manage newsletter subscribers
- 🤖 **AI content tools** — generate titles, descriptions, content using Ollama or OpenAI
- 🔐 **Auth** — Supabase-based login with cookie session
- 🌐 **Public API** — `/api/public/` endpoint for the frontend to consume
- 🎨 **Theme** — dark/light/system toggle
- 📱 **Mobile-first** — designed for iPhone / PWA use

---

## Project Structure

```
apps/admin/
├── app/
│   ├── admin/
│   │   ├── layout.tsx          ← Admin shell (nav, auth check)
│   │   ├── page.tsx            ← Dashboard (stats overview)
│   │   ├── posts/              ← Post list, new, edit
│   │   ├── products/           ← Product list, new, edit
│   │   ├── subscribers/        ← Subscriber list
│   │   ├── ai-assistant/       ← Freeform AI chat
│   │   ├── settings/           ← AI provider config
│   │   └── login/              ← Auth page
│   └── api/
│       ├── public/route.ts     ← Public read API (posts, products, settings)
│       ├── chat/route.ts       ← AI chat proxy
│       ├── chat-config/route.ts← AI config endpoint
│       └── admin/register/     ← Admin registration
├── components/
│   ├── DeleteConfirmModal.tsx  ← Delete confirmation bottom sheet
│   ├── ImagePicker.tsx         ← Cloudinary image picker
│   ├── MarkdownRenderer.tsx    ← Markdown/code renderer
│   ├── ThemeProvider.tsx       ← next-themes provider
│   └── ThemeToggle.tsx         ← Sun/moon toggle button
├── lib/
│   ├── admin-api.ts            ← All CRUD operations (posts, products, etc.)
│   ├── supabase.ts             ← Supabase client (anon + service role)
│   ├── tenant.ts               ← Tenant/site config
│   ├── types.ts                ← TypeScript interfaces
│   └── mappers.ts              ← DB row → app type mappers
└── middleware.ts               ← Route protection (redirects unauthenticated users)
```

---

## Setup

### 1. Install dependencies
```bash
cd apps/admin
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side only

# Admin API — secret shared with the frontend app
ADMIN_API_KEY=your-secret-key      # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Frontend URL (CORS allow-list)
FRONTEND_URL=http://localhost:3000  # or your production URL

# Media (optional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-secret

# AI providers (optional — can also be set in Settings UI)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### 3. Set up the database
Run `supabase/schema.sql` in your Supabase project's SQL Editor.

### 4. Create admin user
1. Go to Supabase → Authentication → Users → Add user
2. Use those credentials to log in at `/admin/login`

### 5. Run
```bash
npm run dev -- --port 3001
```

Open http://localhost:3001/admin

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only, bypasses RLS) |
| `ADMIN_API_KEY` | ✅ | Secret key — must match `ADMIN_API_KEY` in the frontend |
| `FRONTEND_URL` | ✅ | Frontend origin for CORS (e.g. `https://yoursite.com`) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ⚠️ | Required for image uploads |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | ⚠️ | Required for Cloudinary widget |
| `CLOUDINARY_API_SECRET` | ⚠️ | Required for server-side Cloudinary ops |
| `OPENAI_API_KEY` | ❌ | OpenAI fallback (can be set in Settings UI) |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic fallback (can be set in Settings UI) |

---

## Public API

The admin app exposes a read-only public API at `/api/public/` for the frontend to consume.

**Authentication:** `Authorization: Bearer <ADMIN_API_KEY>`

### Endpoints

| Resource | Query | Description |
|----------|-------|-------------|
| `?resource=posts` | `category`, `limit`, `offset` | List all published posts |
| `?resource=post` | `id` or `slug` | Get a single post |
| `?resource=products` | `category` | List all active products |
| `?resource=product` | `id` | Get a single product |
| `?resource=settings` | — | Get public site settings |

**Example:**
```bash
curl "https://your-admin.vercel.app/api/public/?resource=posts" \
  -H "Authorization: Bearer your-api-key"
```

---

## AI Configuration

AI settings are stored in Supabase and configurable in the **Settings** page:

| Provider | Model examples | Notes |
|----------|----------------|-------|
| Ollama (local) | `llama3.2`, `qwen3`, `deepseek-r1` | Free, runs locally |
| OpenAI | `gpt-4o`, `gpt-4o-mini` | Requires API key |
| Anthropic | `claude-3-5-sonnet` | Requires API key |

> **Note:** If using a reasoning model (e.g. DeepSeek-R1, Qwen3) that outputs `<think>` tags, these are automatically stripped from all generated content.

---

## Deployment

### Vercel (recommended)
```bash
cd apps/admin
npx vercel --prod
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

**Important:** After deployment, update `FRONTEND_URL` to your production frontend URL to restrict CORS.

### Other hosts
```bash
npm run build
npm start
```

Any Node.js 18+ host works. The app requires server-side rendering (cannot be exported as static).

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — never expose to the client. It's used server-side only for admin write operations.
- `ADMIN_API_KEY` is a shared secret between admin and frontend — rotate it periodically.
- The middleware (`middleware.ts`) protects all `/admin/*` routes, redirecting unauthenticated users to `/admin/login`.
- All admin write operations are protected by Supabase Auth — users must be logged in.
