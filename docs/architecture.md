# Protopia architecture

## Overview

```
Browser (Next.js app)
  ├─ Map view ── Google Maps JS API, pins clustered, viewport-bounded queries
  ├─ New vision flow ── upload photo → describe → visualize → approve
  └─ Project page ── before/after compare, upvote, requirements, pledges
        │
Next.js server routes (Vercel)
  ├─ POST /api/visualize   → OpenAI image edit (photo + prompt) → store result
  ├─ POST /api/projects    → create project from an approved visualization
  └─ moderation checks on uploads and generated images
        │
Supabase
  ├─ Auth (email magic link, Google)
  ├─ Postgres + PostGIS (schema: supabase/schema.sql)
  ├─ Storage buckets: photos (originals), visions (generated)
  └─ Row-level security: anyone reads published projects, signed-in users write their own rows
```

## The visualize step

1. Client uploads the photo to the `photos` bucket (resized client-side to max 2048 px).
2. Client calls `POST /api/visualize` with `{photoPath, prompt, context}`.
3. Server builds the prompt:
   `Using this input picture, visualize around this context: <prompt>` plus the context and an instruction to keep the camera angle, street layout and surrounding buildings so the result is believable and buildable.
4. Server calls the OpenAI image edit endpoint with the photo, saves the output to `visions`, and records a `visualizations` row (prompt, model, cost).
5. Client shows before/after. **Try again** creates another `visualizations` row; **Approve** creates the `projects` row pointing at the chosen visualization.

Rate-limit per user (for example 10 generations a day) because image generation costs money.

## Map queries

Projects store a PostGIS `geography(Point)`. The map requests only what is in view:

```sql
select * from projects_in_bbox(:west, :south, :east, :north, :limit);
```

At low zoom, cluster pins client-side (`@googlemaps/markerclusterer`). Pin size reflects the vote count, as in the prototype.

## Ranking

Default sort is a time-decayed score so new projects can surface:
`score = votes / (age_hours + 2) ^ 1.5`. Store `vote_count` on `projects`, kept in sync by a trigger on `votes`.

## Open questions

- Who can edit requirements: only the creator, or any signed-in user with suggestions the creator accepts?
- Verification that a project location is public space.
- Path from pledges to real funding: escrow partner, project owner entity, payout rules.
