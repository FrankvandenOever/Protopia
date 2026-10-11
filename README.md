# Protopia

**See a place. Picture it better. Build it together.**

Protopia is a map layer for improving the physical world. Anyone can photograph a place they want to improve, such as a broken sidewalk, an empty lot or a neglected riverbank, describe what it could become, and let AI visualize it. Once the creator approves the image, the project goes on a shared world map. There, people can compare the current situation with the vision, upvote it, work out what it takes to build, and pledge money, labour or materials.

## How it works

1. **Capture**: take a photo of the place as it is today.
2. **Describe**: write the vision ("A beautiful sidewalk with nice lights") plus context, and pin the location on the map.
3. **Visualize**: the photo and prompt go to OpenAI's image edit model:
   > Using this input picture, visualize around this context: *A beautiful sidewalk with nice lights.*
4. **Approve**: if the creator likes the result, it becomes a project on the map. If not, they try again or edit the description.
5. **Grow**: the project collects upvotes, build specifications, resources, labour needs, a budget and pledges.

## Repository layout

| Path | What it is |
| --- | --- |
| `app/` | Next.js pages and API routes: map (`/`), sign-in, new vision (`/new`), project page (`/p/[id]`), `/api/visualize`, `/api/projects` |
| `components/` | Map explorer, new-vision flow, before/after compare, votes, pledges, requirements |
| `lib/` | Supabase clients, database types, shared helpers (including the image prompt) |
| `proxy.ts` | Keeps the Supabase sign-in session fresh |
| `supabase/` | Database schema and storage setup (already applied to the Supabase project) |
| `prototype/index.html` | The original clickable prototype (simulated AI), open directly in a browser |
| `docs/architecture.md` | Architecture notes and open questions |

## Running it

Requires Node.js 20 or later.

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev                  # http://localhost:3000
```

Environment variables (see `.env.example`):

| Name | Where to get it | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys (secret key) | **Yes**, server only |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud → Credentials (restrict to your domains) | No, but restrict it |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Google Cloud → Map Management (optional; defaults to a demo map style) | No |
| `OPENAI_API_KEY` | platform.openai.com → API keys | **Yes**, server only |
| `OPENAI_IMAGE_MODEL` | Optional, defaults to `gpt-image-1` | No |
| `VISUALIZE_DAILY_LIMIT` | Optional, defaults to 10 per user per day | No |

### Supabase settings to set once

- **Authentication → URL Configuration**: set *Site URL* to your live domain and add `http://localhost:3000/**` and `https://<your-domain>/**` to *Redirect URLs*, otherwise the email sign-in link won't return to the app.

## Deploying (Vercel)

1. Import the GitHub repo in Vercel (framework: Next.js, no build settings needed).
2. Add the environment variables above under Project → Settings → Environment Variables.
3. Deploy, then add the Vercel domain to the Google Maps key restrictions and to Supabase's redirect URLs.

## Status

- [x] Clickable prototype
- [x] Database, storage and security rules (Supabase)
- [x] App: map with project pins, email sign-in, photo → OpenAI vision → approve flow, project page with before/after, upvotes, requirements and pledges
- [ ] First real test of image quality with local photos
- [ ] Place search on the map (Places API)
- [ ] Moderation of uploads and generated images
- [ ] Pledges → real payments (later; v1 is pledges only)

## Decisions so far

- **Stack:** Next.js 16 on Vercel; Supabase for Postgres + PostGIS, auth and image storage.
- **Map:** Google Maps JavaScript API with Advanced Markers.
- **Image generation:** OpenAI image edits, called only from the server so the key never reaches the browser; limited per user per day.
- **Crowdfunding v1:** pledges only (funds, labour hours, materials). No money is collected until escrow and legal questions are settled.
