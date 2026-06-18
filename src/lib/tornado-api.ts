import { tornadoTracks, type DataStatus, type EfRating, type TornadoSource, type TornadoTrack } from "@/lib/tornado-data";

export type TornadoDataMode = "supabase" | "seed";

export type TornadoApiResponse = {
  dataMode: TornadoDataMode;
  generatedAt: string;
  message?: string;
  tracks: TornadoTrack[];
};

export type TornadoTrackRow = {
  id: string;
  name: string;
  date: string;
  rating: string;
  states: string[] | null;
  counties: string[] | null;
  wfo: string | null;
  source: string;
  data_status: string;
  path_length_miles: number | null;
  max_width_yards: number | null;
  injuries: number | null;
  fatalities: number | null;
  property_damage_usd: number | null;
  crop_damage_usd: number | null;
  begin_time: string | null;
  end_time: string | null;
  source_file: string;
  last_reviewed: string | null;
  narrative: string | null;
  coordinates: [number, number][] | null;
  geometry_quality: TornadoTrack["geometryQuality"] | null;
};

export function buildSeedResponse(message = "Using curated seed data until Supabase rows are available."): TornadoApiResponse {
  return {
    dataMode: "seed",
    generatedAt: new Date().toISOString(),
    message,
    tracks: tornadoTracks,
  };
}

export function rowToTrack(row: TornadoTrackRow): TornadoTrack {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    rating: normalizeRating(row.rating),
    states: row.states ?? [],
    counties: row.counties ?? [],
    wfo: row.wfo ?? "Unknown",
    source: normalizeSource(row.source),
    dataStatus: normalizeStatus(row.data_status),
    pathLengthMiles: row.path_length_miles ?? 0,
    maxWidthYards: row.max_width_yards ?? 0,
    injuries: row.injuries ?? 0,
    fatalities: row.fatalities ?? 0,
    propertyDamageUsd: row.property_damage_usd ?? 0,
    cropDamageUsd: row.crop_damage_usd ?? 0,
    beginTime: row.begin_time ?? "Unknown",
    endTime: row.end_time ?? "Unknown",
    sourceFile: row.source_file,
    lastReviewed: row.last_reviewed ?? "Unreviewed",
    narrative: row.narrative ?? "Official source row imported without a narrative.",
    coordinates: normalizeCoordinates(row.coordinates),
    geometryQuality: row.geometry_quality ?? "spc_start_end",
  };
}

function normalizeRating(value: string): EfRating {
  const rating = value.toUpperCase();
  const knownRatings: EfRating[] = [
    "EFU",
    "F0",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "EF0",
    "EF1",
    "EF2",
    "EF3",
    "EF4",
    "EF5",
  ];
  return knownRatings.includes(rating as EfRating) ? (rating as EfRating) : "EFU";
}

function normalizeSource(value: string): TornadoSource {
  if (value === "NCEI" || value === "NWS DAT") return value;
  return "SPC";
}

function normalizeStatus(value: string): DataStatus {
  if (value === "preliminary" || value === "survey") return value;
  return "final";
}

function normalizeCoordinates(coordinates: [number, number][] | null): [number, number][] {
  const validCoordinates =
    coordinates?.filter(
      (coordinate): coordinate is [number, number] =>
        Array.isArray(coordinate) &&
        coordinate.length === 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]),
    ) ?? [];

  if (validCoordinates.length >= 2) return validCoordinates;
  if (validCoordinates.length === 1) return [validCoordinates[0], validCoordinates[0]];
  return [
    [-98, 38],
    [-98, 38],
  ];
}
