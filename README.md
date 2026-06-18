# NadoViewer

NadoViewer is a Tora Weather tornado intelligence viewer built with Next.js, MapLibre, MapTiler, and a PostGIS-ready data model.

The current app includes:

- Floating dark operational map UI
- MapTiler style support
- Interactive tornado tracks and event timeline
- Source reliability panels
- Supabase-backed tornado track API with seeded fallback data
- Protected SPC historical tornado ingestion route
- Local state and county boundary overlays

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- MapLibre GL
- MapTiler basemap styles
- Supabase Postgres + PostGIS

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
cp .env.example .env.local
```

Set the MapTiler style URL in `.env.local`.

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```bash
NEXT_PUBLIC_MAPTILER_STYLE_URL=
NEXT_PUBLIC_MAPTILER_KEY=
NEXT_PUBLIC_MAPTILER_MAP_ID=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
INGEST_SECRET=
SPC_ACTUAL_TORNADOES_URL=
```

For local development, `NEXT_PUBLIC_MAPTILER_STYLE_URL` can point directly to a MapTiler style endpoint:

```bash
https://api.maptiler.com/maps/<map-id>/style.json?key=<key>
```

Do not commit `.env.local`.

## Supabase Setup

Run the SQL migration in `supabase/migrations/001_tornado_core.sql` from the Supabase SQL editor or a linked Supabase CLI project.

The migration creates:

- `public.tornado_tracks` with PostGIS `geometry(LineString, 4326)`
- `public.ingestion_runs` for audit records
- Public read policy for tornado tracks
- `public.upsert_tornado_tracks(payload jsonb)` for server-side ingestion

## SPC Ingestion

The first production ingestion target is:

```bash
https://www.spc.noaa.gov/wcm/data/1950-2025_actual_tornadoes.csv
```

Trigger ingestion after setting `SUPABASE_SERVICE_ROLE_KEY` and `INGEST_SECRET`:

```bash
curl -X POST https://nadoviewer.vercel.app/api/ingest/spc \
  -H "Authorization: Bearer $INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"minYear":2020,"maxYear":2025}'
```

For local smoke testing, pass a small limit:

```bash
curl -X POST http://localhost:3000/api/ingest/spc \
  -H "Authorization: Bearer $INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"minYear":2021,"limit":25}'
```

Vercel Cron calls the route with `GET`; when no year range is provided, the route refreshes the current and prior year to avoid long serverless runs. Use manual `POST` calls with `minYear` and `maxYear` to backfill the full archive in chunks.

The UI reads from `/api/tornadoes`. If Supabase is unavailable or empty, the app falls back to curated seed events.

## Deployment Plan

Recommended public deployment:

```text
Vercel Next.js app
  -> API/server routes
  -> Supabase Postgres + PostGIS
  -> scheduled ingest jobs for SPC/NCEI/DAT
  -> MapLibre client map
```

## Data Roadmap

First real ingest target:

- SPC `1950-2025_actual_tornadoes.csv`

Next sources:

- NCEI Storm Events details, locations, and fatalities
- SPC preliminary daily storm reports
- NWS Damage Assessment Toolkit

## Verification

```bash
npm run lint
npm run build
```
