# NadoViewer

NadoViewer is a Tora Weather tornado intelligence viewer built with Next.js, MapLibre, MapTiler, and a PostGIS-ready data model.

The current app includes:

- Floating dark operational map UI
- MapTiler style support
- Interactive tornado tracks and event timeline
- Source reliability panels
- Seeded SPC/NCEI/DAT-shaped tornado records
- Local state and county boundary overlays

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- MapLibre GL
- MapTiler basemap styles
- Planned production data layer: Supabase Postgres + PostGIS

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
```

For local development, `NEXT_PUBLIC_MAPTILER_STYLE_URL` can point directly to a MapTiler style endpoint:

```bash
https://api.maptiler.com/maps/<map-id>/style.json?key=<key>
```

Do not commit `.env.local`.

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
