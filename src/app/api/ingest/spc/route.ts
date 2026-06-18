import { hasSupabaseServiceConfig, supabaseRestUrl, supabaseServiceHeaders } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const defaultSpcUrl = "https://www.spc.noaa.gov/wcm/data/1950-2025_actual_tornadoes.csv";
const sourceFile = "1950-2025_actual_tornadoes.csv";

type SpcCsvRow = Record<string, string>;

type IngestTrack = {
  id: string;
  name: string;
  date: string;
  rating: string;
  states: string[];
  counties: string[];
  wfo: string;
  source: "SPC";
  data_status: "final";
  path_length_miles: number;
  max_width_yards: number;
  injuries: number;
  fatalities: number;
  property_damage_usd: number;
  crop_damage_usd: number;
  begin_time: string;
  end_time: string;
  source_file: string;
  source_url: string;
  source_row: SpcCsvRow;
  last_reviewed: string;
  narrative: string;
  coordinates: [number, number][];
  geometry_quality: "spc_start_end";
};

export async function GET(request: Request) {
  return runIngest(request);
}

export async function POST(request: Request) {
  return runIngest(request);
}

async function runIngest(request: Request) {
  const authError = validateIngestAuth(request);
  if (authError) return authError;

  if (!hasSupabaseServiceConfig()) {
    return Response.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for ingestion." },
      { status: 500 },
    );
  }

  const body = await readJsonBody(request);
  const spcUrl = process.env.SPC_ACTUAL_TORNADOES_URL ?? defaultSpcUrl;
  const requestUrl = new URL(request.url);
  const requestedMinYear = toOptionalNumber(body.minYear ?? requestUrl.searchParams.get("minYear"));
  const maxYear = toOptionalNumber(body.maxYear ?? requestUrl.searchParams.get("maxYear"));
  const minYear = requestedMinYear ?? (request.method === "GET" ? new Date().getFullYear() - 1 : null);
  const maxRows = toOptionalNumber(body.limit);
  const startedAt = new Date().toISOString();

  const sourceResponse = await fetch(spcUrl, { cache: "no-store" });
  if (!sourceResponse.ok) {
    return Response.json({ error: `SPC source returned ${sourceResponse.status}.` }, { status: 502 });
  }

  const csv = await sourceResponse.text();
  const rows = parseCsv(csv);
  const tracks = rows
    .filter((row) => {
      const year = Number(row.yr);
      return Number.isFinite(year) && (!minYear || year >= minYear) && (!maxYear || year <= maxYear);
    })
    .slice(0, maxRows ?? rows.length)
    .map((row) => spcRowToTrack(row, spcUrl))
    .filter((track): track is IngestTrack => Boolean(track));

  const batchSize = 500;
  let loaded = 0;
  for (let index = 0; index < tracks.length; index += batchSize) {
    const batch = tracks.slice(index, index + batchSize);
    loaded += await upsertBatch(batch);
  }

  await recordIngestionRun({
    sourceUrl: spcUrl,
    rowsSeen: rows.length,
    rowsLoaded: loaded,
    startedAt,
  });

  return Response.json({
    source: "SPC actual tornadoes",
    sourceUrl: spcUrl,
    minYear,
    maxYear,
    rowsSeen: rows.length,
    rowsPrepared: tracks.length,
    rowsLoaded: loaded,
  });
}

function validateIngestAuth(request: Request) {
  const expectedSecrets = [process.env.INGEST_SECRET, process.env.CRON_SECRET].filter(Boolean);
  if (!expectedSecrets.length) {
    return Response.json({ error: "INGEST_SECRET or CRON_SECRET must be configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!providedSecret || !expectedSecrets.includes(providedSecret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toOptionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseCsv(csv: string): SpcCsvRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines[0] ?? "");
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

function spcRowToTrack(row: SpcCsvRow, sourceUrl: string): IngestTrack | null {
  const startLat = Number(row.slat);
  const startLng = Number(row.slon);
  const endLat = Number(row.elat);
  const endLng = Number(row.elon);
  if (!Number.isFinite(startLat) || !Number.isFinite(startLng)) return null;

  const hasEndPoint = Number.isFinite(endLat) && Number.isFinite(endLng) && endLat !== 0 && endLng !== 0;
  const start: [number, number] = [startLng, startLat];
  const end: [number, number] = hasEndPoint ? [endLng, endLat] : start;
  const year = Number(row.yr);
  const state = row.st || "US";
  const stormNumber = row.stn || row.om;
  const rating = normalizeSpcRating(row.mag, year);
  const date = row.date || `${row.yr}-${row.mo}-${row.dy}`;

  return {
    id: `spc-${row.om || `${date}-${state}-${stormNumber}`}`,
    name: `${state} Tornado ${stormNumber}`,
    date,
    rating,
    states: [state],
    counties: countyFipsFromRow(row),
    wfo: "",
    source: "SPC",
    data_status: "final",
    path_length_miles: numberOrZero(row.len),
    max_width_yards: Math.trunc(numberOrZero(row.wid)),
    injuries: Math.trunc(numberOrZero(row.inj)),
    fatalities: Math.trunc(numberOrZero(row.fat)),
    property_damage_usd: spcDamageToUsd(row.loss, year),
    crop_damage_usd: spcDamageToUsd(row.closs, year),
    begin_time: row.time,
    end_time: row.etime || row.time,
    source_file: sourceFile,
    source_url: sourceUrl,
    source_row: row,
    last_reviewed: "2026-04-24",
    narrative:
      "Imported from the NOAA Storm Prediction Center actual tornado archive. Geometry is represented by SPC start and end coordinates and may not trace the full surveyed damage path.",
    coordinates: [start, end],
    geometry_quality: "spc_start_end",
  };
}

function normalizeSpcRating(magnitude: string, year: number) {
  const value = Number(magnitude);
  if (!Number.isFinite(value) || value < 0) return "EFU";
  const prefix = year >= 2007 ? "EF" : "F";
  return `${prefix}${Math.min(Math.trunc(value), 5)}`;
}

function countyFipsFromRow(row: SpcCsvRow) {
  return ["f1", "f2", "f3", "f4"]
    .map((key) => row[key])
    .filter((value) => value && value !== "0")
    .map((value) => `FIPS ${value}`);
}

function numberOrZero(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function spcDamageToUsd(value: string, year: number) {
  const damage = numberOrZero(value);
  if (damage <= 0) return 0;
  if (year >= 1996) return Math.round(damage);

  const categoryMidpoints: Record<number, number> = {
    1: 275,
    2: 2_750,
    3: 27_500,
    4: 275_000,
    5: 2_750_000,
    6: 27_500_000,
    7: 275_000_000,
    8: 2_750_000_000,
    9: 27_500_000_000,
  };

  return categoryMidpoints[Math.trunc(damage)] ?? 0;
}

async function upsertBatch(batch: IngestTrack[]) {
  const response = await fetch(supabaseRestUrl("/rpc/upsert_tornado_tracks"), {
    method: "POST",
    headers: supabaseServiceHeaders(),
    body: JSON.stringify({ payload: batch }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase upsert failed: ${response.status} ${detail}`);
  }

  return (await response.json()) as number;
}

async function recordIngestionRun({
  rowsLoaded,
  rowsSeen,
  sourceUrl,
  startedAt,
}: {
  rowsLoaded: number;
  rowsSeen: number;
  sourceUrl: string;
  startedAt: string;
}) {
  await fetch(supabaseRestUrl("/ingestion_runs"), {
    method: "POST",
    headers: {
      ...supabaseServiceHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      source: "SPC actual tornadoes",
      source_url: sourceUrl,
      status: "completed",
      rows_seen: rowsSeen,
      rows_loaded: rowsLoaded,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    }),
  });
}
