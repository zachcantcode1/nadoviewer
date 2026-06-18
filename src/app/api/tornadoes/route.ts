import { buildSeedResponse, rowToTrack, type TornadoApiResponse, type TornadoTrackRow } from "@/lib/tornado-api";
import { hasSupabaseReadConfig, supabaseReadHeaders, supabaseRestUrl } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

const selectColumns = [
  "id",
  "name",
  "date",
  "rating",
  "states",
  "counties",
  "wfo",
  "source",
  "data_status",
  "path_length_miles",
  "max_width_yards",
  "injuries",
  "fatalities",
  "property_damage_usd",
  "crop_damage_usd",
  "begin_time",
  "end_time",
  "source_file",
  "last_reviewed",
  "narrative",
  "coordinates",
  "geometry_quality",
].join(",");

export async function GET(request: Request) {
  if (!hasSupabaseReadConfig()) {
    return Response.json(buildSeedResponse("Supabase read env vars are not configured."));
  }

  const requestUrl = new URL(request.url);
  const date = requestUrl.searchParams.get("date");
  const limit = clampLimit(requestUrl.searchParams.get("limit"));
  const query = new URLSearchParams({
    select: selectColumns,
    order: "date.desc,id.asc",
    limit: String(limit),
  });

  if (date) query.set("date", `eq.${date}`);

  try {
    const response = await fetch(supabaseRestUrl(`/tornado_tracks?${query.toString()}`), {
      headers: supabaseReadHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        buildSeedResponse(`Supabase returned ${response.status}; using seed data.`),
        { status: 200 },
      );
    }

    const rows = (await response.json()) as TornadoTrackRow[];
    if (!rows.length) {
      return Response.json(buildSeedResponse("No Supabase tornado rows found yet."));
    }

    const payload: TornadoApiResponse = {
      dataMode: "supabase",
      generatedAt: new Date().toISOString(),
      tracks: rows.map(rowToTrack),
    };

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      buildSeedResponse(error instanceof Error ? error.message : "Supabase query failed."),
      { status: 200 },
    );
  }
}

function clampLimit(value: string | null) {
  const requestedLimit = Number(value ?? 5000);
  if (!Number.isFinite(requestedLimit)) return 5000;
  return Math.min(Math.max(Math.trunc(requestedLimit), 1), 20000);
}
