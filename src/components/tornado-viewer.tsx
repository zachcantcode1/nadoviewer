"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  Database,
  Filter,
  Layers,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map,
  type StyleSpecification,
} from "maplibre-gl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usAtlas from "us-atlas/counties-10m.json";
import {
  dataPipelines,
  ratingColors,
  tornadoTracks,
  type DataStatus,
  type EfRating,
  type TornadoSource,
  type TornadoTrack,
} from "@/lib/tornado-data";
import type { TornadoApiResponse, TornadoDataMode } from "@/lib/tornado-api";

type Filters = {
  minYear: number;
  maxYear: number;
  ratings: EfRating[];
  statuses: DataStatus[];
  source: TornadoSource | "All";
};

const allRatings: EfRating[] = [
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
const allStatuses: DataStatus[] = ["final", "preliminary", "survey"];
const legendRatings: EfRating[] = ["EFU", "F0", "F1", "F2", "F3", "F4", "F5", "EF0", "EF1", "EF2", "EF3", "EF4", "EF5"];
const sourceOptions: Filters["source"][] = ["All", "SPC", "NCEI", "NWS DAT"];

const initialFilters: Filters = {
  minYear: 2010,
  maxYear: 2026,
  ratings: ["EF1", "EF3", "EF4", "EF5", "F1", "F3", "F4", "F5"],
  statuses: allStatuses,
  source: "All",
};

const sidebarSurface = "bg-[#1a1d21]";
const panelSurface = "bg-[#22262b]";
const controlSurface = "bg-[#262b31]";
const overlaySurface90 = "bg-[#111820]/90";
const overlaySurface94 = "bg-[#111820]/94";

const mapTilerStyleUrl = process.env.NEXT_PUBLIC_MAPTILER_STYLE_URL;
const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const mapTilerMapId = process.env.NEXT_PUBLIC_MAPTILER_MAP_ID ?? "dataviz-dark";

function formatCurrency(value: number) {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${Math.round(value / 1000000)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return value === 0 ? "N/A" : `$${value}`;
}

function statusLabel(status: DataStatus) {
  if (status === "final") return "Final";
  if (status === "survey") return "Survey";
  return "Prelim";
}

function geometryQualityLabel(quality: TornadoTrack["geometryQuality"]) {
  if (quality === "surveyed_path") return "Surveyed path";
  if (quality === "estimated_path") return "Estimated path";
  return "SPC start/end line";
}

function buildTrackCollection(tracks: TornadoTrack[], selectedTrackId?: string) {
  return {
    type: "FeatureCollection" as const,
    features: tracks.map((track) => ({
      type: "Feature" as const,
      id: track.id,
      properties: {
        id: track.id,
        name: track.name,
        rating: track.rating,
        color: ratingColors[track.rating],
        status: track.dataStatus,
        selected: track.id === selectedTrackId,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: track.coordinates,
      },
    })),
  };
}

function buildPointCollection(tracks: TornadoTrack[]) {
  return {
    type: "FeatureCollection" as const,
    features: tracks.map((track) => ({
      type: "Feature" as const,
      id: `${track.id}-start`,
      properties: {
        id: track.id,
        name: track.name,
        color: ratingColors[track.rating],
      },
      geometry: {
        type: "Point" as const,
        coordinates: track.coordinates[0],
      },
    })),
  };
}

function buildBoundaryFeature(objectName: "counties" | "states") {
  const topology = usAtlas as unknown as Topology<{
    counties: GeometryCollection;
    states: GeometryCollection;
  }>;

  return {
    type: "Feature" as const,
    properties: {},
    geometry: mesh(topology, topology.objects[objectName], (a, b) => a !== b),
  };
}

function appendMapTilerKey(styleUrl: string) {
  if (!mapTilerKey || styleUrl.includes("key=")) return styleUrl;
  const separator = styleUrl.includes("?") ? "&" : "?";
  return `${styleUrl}${separator}key=${mapTilerKey}`;
}

function getMapStyle(): string | StyleSpecification {
  if (mapTilerStyleUrl) return appendMapTilerKey(mapTilerStyleUrl);
  if (mapTilerKey) {
    return `https://api.maptiler.com/maps/${mapTilerMapId}/style.json?key=${mapTilerKey}`;
  }

  return {
    version: 8 as const,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "carto-dark-base": {
        type: "raster" as const,
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
      "carto-dark-labels": {
        type: "raster" as const,
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
    },
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: {
          "background-color": "#071016",
        },
      },
      {
        id: "carto-dark-base",
        type: "raster" as const,
        source: "carto-dark-base",
        paint: {
          "raster-opacity": 0.96,
          "raster-brightness-min": 0.08,
          "raster-brightness-max": 1.18,
          "raster-contrast": 0.22,
          "raster-saturation": -0.16,
        },
      },
      {
        id: "carto-dark-labels",
        type: "raster" as const,
        source: "carto-dark-labels",
        paint: {
          "raster-opacity": 1,
          "raster-brightness-min": 0.38,
          "raster-brightness-max": 1.24,
          "raster-contrast": 0.72,
        },
      },
    ],
  };
}

function getFirstSymbolLayerId(map: Map) {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
}

function getBounds(tracks: TornadoTrack[]): LngLatBoundsLike {
  const coords = tracks.flatMap((track) => track.coordinates);
  const west = Math.min(...coords.map(([lng]) => lng));
  const east = Math.max(...coords.map(([lng]) => lng));
  const south = Math.min(...coords.map(([, lat]) => lat));
  const north = Math.max(...coords.map(([, lat]) => lat));
  return [
    [west - 1.5, south - 1.5],
    [east + 1.5, north + 1.5],
  ];
}

function matchesFilters(track: TornadoTrack, filters: Filters, selectedDate: string) {
  const year = Number(track.date.slice(0, 4));
  return (
    year >= filters.minYear &&
    year <= filters.maxYear &&
    (!selectedDate || track.date === selectedDate) &&
    filters.ratings.includes(track.rating) &&
    filters.statuses.includes(track.dataStatus) &&
    (filters.source === "All" || track.source === filters.source)
  );
}

export function TornadoViewer() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const initialSelectedTrackIdRef = useRef(tornadoTracks[0].id);
  const selectedTrackIdRef = useRef(tornadoTracks[0].id);
  const initialTracksRef = useRef<TornadoTrack[]>(
    tornadoTracks.filter((track) => matchesFilters(track, initialFilters, "")),
  );
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [tracks, setTracks] = useState<TornadoTrack[]>(tornadoTracks);
  const [dataMode, setDataMode] = useState<TornadoDataMode>("seed");
  const [dataMessage, setDataMessage] = useState("Curated seed data loaded.");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState(tornadoTracks[0].id);

  const filteredTracks = useMemo(
    () => tracks.filter((track) => matchesFilters(track, filters, selectedDate)),
    [filters, selectedDate, tracks],
  );

  const selectedTrack =
    filteredTracks.find((track) => track.id === selectedTrackId) ?? filteredTracks[0] ?? tracks[0] ?? tornadoTracks[0];

  const availableDates = useMemo(
    () => Array.from(new Set(tracks.map((track) => track.date))).sort((a, b) => b.localeCompare(a)).slice(0, 700),
    [tracks],
  );

  const totals = useMemo(
    () => ({
      tracks: filteredTracks.length,
      fatalities: filteredTracks.reduce((sum, track) => sum + track.fatalities, 0),
      injuries: filteredTracks.reduce((sum, track) => sum + track.injuries, 0),
      miles: filteredTracks.reduce((sum, track) => sum + track.pathLengthMiles, 0),
    }),
    [filteredTracks],
  );

  useEffect(() => {
    selectedTrackIdRef.current = selectedTrack.id;
  }, [selectedTrack.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadTracks() {
      try {
        const response = await fetch("/api/tornadoes?limit=20000", { cache: "no-store" });
        const payload = (await response.json()) as TornadoApiResponse;
        if (cancelled || !payload.tracks.length) return;
        setTracks(payload.tracks);
        setDataMode(payload.dataMode);
        setDataMessage(payload.message ?? "Supabase tornado rows loaded.");
        setSelectedTrackId(payload.tracks[0].id);
      } catch (error) {
        if (!cancelled) {
          setDataMessage(error instanceof Error ? error.message : "Unable to load remote tornado data.");
        }
      }
    }

    loadTracks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const initialMapTracks = initialTracksRef.current;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      attributionControl: false,
      center: [-96, 38],
      zoom: 3.2,
      style: getMapStyle(),
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("load", () => {
      map.addSource("tracks", {
        type: "geojson",
        data: buildTrackCollection(initialMapTracks, initialSelectedTrackIdRef.current),
      });
      map.addSource("starts", {
        type: "geojson",
        data: buildPointCollection(initialMapTracks),
      });
      map.addSource("county-boundaries", {
        type: "geojson",
        data: buildBoundaryFeature("counties"),
      });
      map.addSource("state-boundaries", {
        type: "geojson",
        data: buildBoundaryFeature("states"),
      });
      const firstSymbolLayerId = getFirstSymbolLayerId(map);

      map.addLayer({
        id: "county-boundaries",
        type: "line",
        source: "county-boundaries",
        paint: {
          "line-color": "#d2dae2",
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.05, 5, 0.16, 7, 0.28],
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.35, 7, 0.72],
        },
      }, firstSymbolLayerId);

      map.addLayer({
        id: "state-boundaries",
        type: "line",
        source: "state-boundaries",
        paint: {
          "line-color": "#f2f6f9",
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.24, 5, 0.42, 7, 0.62],
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 7, 1.35],
        },
      }, firstSymbolLayerId);

      map.addLayer({
        id: "track-glow",
        type: "line",
        source: "tracks",
        paint: {
          "line-color": ["get", "color"],
          "line-opacity": ["case", ["get", "selected"], 0.42, 0.18],
          "line-width": ["case", ["get", "selected"], 18, 10],
        },
      });

      map.addLayer({
        id: "track-line",
        type: "line",
        source: "tracks",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-opacity": ["case", ["get", "selected"], 1, 0.74],
          "line-width": ["case", ["get", "selected"], 6, 3.4],
        },
      });

      map.addLayer({
        id: "start-points",
        type: "circle",
        source: "starts",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 5,
          "circle-stroke-color": "#d9e6ec",
          "circle-stroke-width": 1,
          "circle-opacity": 0.95,
        },
      });

      if (initialMapTracks.length) {
        map.resize();
        map.fitBounds(getBounds(initialMapTracks), { padding: 70, duration: 0 });
      }
    });

    map.on("click", "track-line", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") setSelectedTrackId(id);
    });
    map.on("mouseenter", "track-line", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "track-line", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const trackSource = map.getSource("tracks") as GeoJSONSource | undefined;
    const startSource = map.getSource("starts") as GeoJSONSource | undefined;
    trackSource?.setData(buildTrackCollection(filteredTracks, selectedTrackIdRef.current));
    startSource?.setData(buildPointCollection(filteredTracks));
  }, [filteredTracks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !selectedTrack || !filteredTracks.length) return;

    const trackSource = map.getSource("tracks") as GeoJSONSource | undefined;
    trackSource?.setData(buildTrackCollection(filteredTracks, selectedTrack.id));
    map.resize();
    map.fitBounds(getBounds([selectedTrack]), {
      duration: 950,
      maxZoom: 7.4,
      padding: { top: 110, right: 110, bottom: 160, left: 110 },
    });
  }, [filteredTracks, selectedTrack]);

  const toggleRating = (rating: EfRating) => {
    setFilters((current) => ({
      ...current,
      ratings: current.ratings.includes(rating)
        ? current.ratings.filter((item) => item !== rating)
        : [...current.ratings, rating],
    }));
  };

  const toggleStatus = (status: DataStatus) => {
    setFilters((current) => ({
      ...current,
      statuses: current.statuses.includes(status)
        ? current.statuses.filter((item) => item !== status)
        : [...current.statuses, status],
    }));
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071016] text-slate-100">
      <div className="relative min-h-screen">
        {!leftPanelOpen ? (
          <button
            aria-label="Show filters"
            className="absolute left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-md border border-white/15 bg-[#1a1d21]/92 text-slate-100 shadow-2xl shadow-black/35 backdrop-blur transition hover:bg-[#262b31]"
            onClick={() => setLeftPanelOpen(true)}
            title="Show filters"
            type="button"
          >
            <PanelLeftOpen size={19} />
          </button>
        ) : null}

        {!rightPanelOpen ? (
          <button
            aria-label="Show event details"
            className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-md border border-white/15 bg-[#1a1d21]/92 text-slate-100 shadow-2xl shadow-black/35 backdrop-blur transition hover:bg-[#262b31]"
            onClick={() => setRightPanelOpen(true)}
            title="Show event details"
            type="button"
          >
            <PanelRightOpen size={19} />
          </button>
        ) : null}

        <aside
          className={`absolute left-3 right-3 top-3 z-20 max-h-[calc(50vh-1rem)] overflow-y-auto rounded-md border border-white/10 ${sidebarSurface}/94 px-3 py-4 shadow-2xl shadow-black/35 backdrop-blur transition duration-300 md:left-4 md:right-auto md:top-4 md:w-[236px] md:max-h-[calc(100vh-2rem)] 2xl:w-[248px] ${
            leftPanelOpen
              ? "translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-[calc(100%+2rem)] opacity-0"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Tora Weather</p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-normal text-white">NadoViewer</h1>
            </div>
            <button
              aria-label="Hide filters"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-white/[0.08] text-cyan-100 transition hover:bg-white/[0.13]"
              onClick={() => setLeftPanelOpen(false)}
              title="Hide filters"
              type="button"
            >
              <PanelLeftClose size={19} />
            </button>
          </div>

          <CollapsiblePanel icon={<Filter size={16} />} title="Filters" defaultOpen>
            <label className="block">
              <span className="text-xs text-slate-400">Event day</span>
              <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  className={`h-10 w-full rounded-md border border-white/10 ${controlSurface} px-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/60`}
                  list="event-days"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
                <button
                  aria-label="Clear event day"
                  className={`flex h-10 w-10 items-center justify-center rounded-md border border-white/10 ${controlSurface} text-slate-200 transition hover:border-white/25`}
                  onClick={() => setSelectedDate("")}
                  title="Clear day"
                  type="button"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              <datalist id="event-days">
                {availableDates.map((date) => (
                  <option key={date} value={date} />
                ))}
              </datalist>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-slate-400">Start year</span>
                <input
                  className={`mt-1 h-10 w-full rounded-md border border-white/10 ${controlSurface} px-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/60`}
                  max={filters.maxYear}
                  min={1950}
                  type="number"
                  value={filters.minYear}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, minYear: Number(event.target.value) }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400">End year</span>
                <input
                  className={`mt-1 h-10 w-full rounded-md border border-white/10 ${controlSurface} px-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/60`}
                  max={2026}
                  min={filters.minYear}
                  type="number"
                  value={filters.maxYear}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, maxYear: Number(event.target.value) }))
                  }
                />
              </label>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400">EF/F rating</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {allRatings.map((rating) => (
                  <button
                    aria-pressed={filters.ratings.includes(rating)}
                    className={`h-9 rounded-md border border-white/10 ${controlSurface} text-xs font-medium text-slate-200 transition hover:border-white/25 aria-pressed:border-white/30 aria-pressed:text-white`}
                    key={rating}
                    onClick={() => toggleRating(rating)}
                    style={{
                      backgroundColor: filters.ratings.includes(rating)
                        ? `${ratingColors[rating]}33`
                        : undefined,
                    }}
                    type="button"
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400">Data status</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {allStatuses.map((status) => (
                  <button
                    aria-pressed={filters.statuses.includes(status)}
                    className={`h-9 rounded-md border border-white/10 ${controlSurface} text-xs font-medium capitalize text-slate-200 transition hover:border-white/25 aria-pressed:border-cyan-200/50 aria-pressed:bg-cyan-200/10 aria-pressed:text-cyan-50`}
                    key={status}
                    onClick={() => toggleStatus(status)}
                    type="button"
                  >
                    {statusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-xs text-slate-400">Primary source</span>
              <select
                className={`mt-2 h-10 w-full rounded-md border border-white/10 ${controlSurface} px-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/60`}
                value={filters.source}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    source: event.target.value as Filters["source"],
                  }))
                }
              >
                {sourceOptions.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>

            <button
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.07] text-sm font-medium text-slate-100 transition hover:bg-white/[0.12]"
              onClick={() => {
                setFilters(initialFilters);
                setSelectedDate("");
              }}
              type="button"
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </CollapsiblePanel>

          <section className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Tracks" value={String(totals.tracks)} />
              <Metric label="Path miles" value={Math.round(totals.miles).toLocaleString()} />
              <Metric label="Fatalities" value={totals.fatalities.toLocaleString()} />
              <Metric label="Injuries" value={totals.injuries.toLocaleString()} />
            </div>
          </section>
        </aside>

        <section className="absolute inset-0 z-0 min-h-screen overflow-hidden bg-[#071016]">
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,16,22,0.74)_0%,rgba(7,16,22,0.1)_24%,rgba(7,16,22,0)_52%,rgba(7,16,22,0.46)_100%)]" />
          <div
            className={`pointer-events-none absolute left-4 right-4 top-[calc(50vh+0.75rem)] flex flex-col gap-3 transition-all duration-300 md:top-4 md:flex-row md:items-start md:justify-between ${
              leftPanelOpen ? "md:left-[276px] 2xl:left-[292px]" : "md:left-5"
            } ${rightPanelOpen ? "md:right-[340px] 2xl:right-[356px]" : "md:right-5"}`}
          >
            <div className={`max-w-lg rounded-md border border-white/10 ${overlaySurface90} px-3.5 py-3 shadow-2xl shadow-black/20 backdrop-blur`}>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100/80">
                <Layers size={14} />
                Historical Tornado Intelligence
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Verified tracks, official event details, preliminary reports, and survey-ready
                metadata prepared for SPC, NCEI, and NWS DAT ingestion.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {dataMode === "supabase" ? "Live Supabase data" : "Seed fallback"} · {dataMessage}
              </p>
            </div>
            <div className={`grid grid-cols-2 gap-2 rounded-md border border-white/10 ${overlaySurface90} p-2 text-xs text-slate-300 shadow-2xl shadow-black/20 backdrop-blur md:grid-cols-4`}>
              {legendRatings.map((rating) => (
                <div className="flex items-center gap-2 px-2 py-1.5" key={rating}>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ratingColors[rating] }}
                  />
                  {rating}
                </div>
              ))}
            </div>
          </div>

          <div
            className={`absolute bottom-4 left-4 right-4 rounded-md border border-white/10 ${overlaySurface94} p-3 shadow-2xl shadow-black/25 backdrop-blur transition-all duration-300 ${
              leftPanelOpen ? "md:left-[276px] 2xl:left-[292px]" : "md:left-5"
            } ${rightPanelOpen ? "md:right-[340px] 2xl:right-[356px]" : "md:right-5"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <CalendarRange size={16} />
                Event Timeline
              </div>
              <p className="text-xs text-slate-400">{selectedDate || `${filters.minYear}-${filters.maxYear}`}</p>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filteredTracks.length ? filteredTracks.map((track) => (
                <button
                  className={`min-w-[172px] rounded-md border border-white/10 ${panelSurface} px-3 py-2 text-left transition hover:border-white/25 data-[active=true]:border-cyan-200/50 data-[active=true]:bg-cyan-200/10`}
                  data-active={track.id === selectedTrack.id}
                  key={track.id}
                  onClick={() => setSelectedTrackId(track.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">{track.date}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-semibold text-[#071016]"
                      style={{ backgroundColor: ratingColors[track.rating] }}
                    >
                      {track.rating}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-100">{track.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{track.states.join(", ")}</p>
                </button>
              )) : (
                <div className={`${panelSurface} min-w-[220px] rounded-md border border-white/10 px-3 py-3 text-sm text-slate-300`}>
                  No tornadoes match the current filters.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside
          className={`absolute bottom-3 left-3 right-3 z-20 max-h-[calc(50vh-1rem)] overflow-y-auto rounded-md border border-white/10 ${sidebarSurface}/94 px-3 py-4 shadow-2xl shadow-black/35 backdrop-blur transition duration-300 md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-[292px] md:max-h-[calc(100vh-2rem)] 2xl:w-[308px] ${
            rightPanelOpen
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Selected Event</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{selectedTrack.name}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="rounded-md px-2.5 py-1 text-sm font-bold text-[#071016]"
                style={{ backgroundColor: ratingColors[selectedTrack.rating] }}
              >
                {selectedTrack.rating}
              </span>
              <button
                aria-label="Hide event details"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/[0.08] text-slate-200 transition hover:bg-white/[0.13]"
                onClick={() => setRightPanelOpen(false)}
                title="Hide event details"
                type="button"
              >
                <PanelRightClose size={18} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Metric label="Path" value={`${selectedTrack.pathLengthMiles} mi`} />
            <Metric label="Max width" value={`${selectedTrack.maxWidthYards} yd`} />
            <Metric label="Fatalities" value={selectedTrack.fatalities.toLocaleString()} />
            <Metric label="Injuries" value={selectedTrack.injuries.toLocaleString()} />
          </div>

          <CollapsiblePanel icon={<MapPin size={16} />} title="Event Record" defaultOpen>
            <dl className="space-y-3 text-sm">
              <Detail label="Date" value={`${selectedTrack.date} | ${selectedTrack.beginTime}-${selectedTrack.endTime}`} />
              <Detail label="States" value={selectedTrack.states.join(", ")} />
              <Detail label="Counties" value={selectedTrack.counties.join(", ")} />
              <Detail label="WFO" value={selectedTrack.wfo} />
              <Detail label="Property damage" value={formatCurrency(selectedTrack.propertyDamageUsd)} />
              <Detail label="Crop damage" value={formatCurrency(selectedTrack.cropDamageUsd)} />
            </dl>
          </CollapsiblePanel>

          <CollapsiblePanel icon={<ShieldCheck size={16} />} title="Source Reliability" defaultOpen>
            <dl className="space-y-3 text-sm">
              <Detail label="Source" value={selectedTrack.source} />
              <Detail label="Status" value={statusLabel(selectedTrack.dataStatus)} />
              <Detail label="File/API" value={selectedTrack.sourceFile} />
              <Detail label="Reviewed" value={selectedTrack.lastReviewed} />
              <Detail label="Geometry" value={geometryQualityLabel(selectedTrack.geometryQuality)} />
            </dl>
          </CollapsiblePanel>

          <CollapsiblePanel icon={<AlertTriangle size={16} />} title="Narrative">
            <p className="text-sm leading-6 text-slate-300">{selectedTrack.narrative}</p>
          </CollapsiblePanel>

          <CollapsiblePanel icon={<Database size={16} />} title="Ingestion Pipeline">
            <div className="space-y-2">
              {dataPipelines.map((pipeline) => (
                <div className={`${controlSurface} rounded-md border border-white/10 p-3`} key={pipeline.source}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">{pipeline.source}</p>
                    <span className="shrink-0 rounded bg-slate-100/10 px-2 py-1 text-xs text-slate-300">
                      {pipeline.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{pipeline.coverage}</p>
                  <p className="mt-1 text-xs text-slate-500">{pipeline.cadence}</p>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${panelSurface} rounded-md border border-white/10 p-2.5`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-200">{value}</dd>
    </div>
  );
}

function CollapsiblePanel({
  children,
  defaultOpen = false,
  icon,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  icon: ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={`group mt-4 rounded-md border border-white/10 ${panelSurface} p-3 open:pb-4`}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-200">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown
          className="text-slate-500 transition group-open:rotate-180 group-open:text-slate-300"
          size={16}
        />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
