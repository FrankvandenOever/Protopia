# Protopia

**See a place. Picture it better. Build it together.**

Protopia is a map layer for improving the physical world. Anyone can photograph a place they want to improve, such as a broken sidewalk, an empty lot or a neglected riverbank, describe what it could become, and let AI visualize it. Once the creator approves the image, the project goes on a shared world map. There, people can compare the current situation with the vision, upvote it, work out what it takes to build, and pledge money, labour or materials.

## How it works

1. **Capture**: take a photo of the place as it is today.
2. **Describe**: write the vision ("A beautiful sidewalk with nice lights") plus context (who uses it, what's wrong, constraints), and pin the location.
3. **Visualize**: the photo and prompt go to an image model:
   > Using this input picture, visualize around this context: *A beautiful sidewalk with nice lights.*
4. **Approve**: if the creator likes the result, it becomes a project on the map. If not, they can regenerate or edit the description.
5. **Grow**: the project collects upvotes, build specifications, resource needs, labour needs, a budget and pledges.

From the top-down view you see every project in the world, each with its *now* and *vision* images side by side.

## Repository layout

| Path | What it is |
| --- | --- |
| `prototype/index.html` | Clickable single-file prototype of the full flow. The AI image is simulated in the browser, and data stays in the browser's local storage. Open it directly in a browser. |
| `docs/architecture.md` | Target architecture for the production app (Next.js + Supabase + Google Maps + OpenAI). |
| `supabase/schema.sql` | Database schema (Postgres + PostGIS) for projects, images, requirements, votes and pledges. |

## Status

- [x] Clickable prototype (map, photo → vision → approve flow, before/after compare, upvotes, requirements, pledges)
- [ ] Next.js app scaffold with Supabase auth and storage
- [ ] Google Maps layer with clustered project pins
- [ ] OpenAI image edit integration (server-side)
- [ ] Moderation of uploads and generated images
- [ ] Pledges → real payments (later; v1 is pledges only)

## Decisions so far

- **Stack:** Next.js (App Router, TypeScript) on Vercel; Supabase for Postgres + PostGIS, auth and image storage.
- **Map:** Google Maps JavaScript API. The prototype uses a stylized world map only because it can't load Google Maps without an API key.
- **Image generation:** OpenAI image edits, called from a server route so the API key never reaches the browser.
- **Crowdfunding v1:** pledges only (funds, labour hours, materials). No money is collected until escrow and legal questions are settled.
