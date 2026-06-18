export type DataStatus = "final" | "preliminary" | "survey";

export type TornadoSource = "SPC" | "NCEI" | "NWS DAT";

export type EfRating = "F5" | "EF5" | "EF4" | "EF3" | "EF2" | "EF1" | "EF0";

export type TornadoTrack = {
  id: string;
  name: string;
  date: string;
  rating: EfRating;
  states: string[];
  counties: string[];
  wfo: string;
  source: TornadoSource;
  dataStatus: DataStatus;
  pathLengthMiles: number;
  maxWidthYards: number;
  injuries: number;
  fatalities: number;
  propertyDamageUsd: number;
  cropDamageUsd: number;
  beginTime: string;
  endTime: string;
  sourceFile: string;
  lastReviewed: string;
  narrative: string;
  coordinates: [number, number][];
};

export const ratingColors: Record<EfRating, string> = {
  EF0: "#8fb6c3",
  EF1: "#78b68c",
  EF2: "#d3b75f",
  EF3: "#d98a4a",
  EF4: "#c75b62",
  EF5: "#a56a9d",
  F5: "#a56a9d",
};

export const tornadoTracks: TornadoTrack[] = [
  {
    id: "spc-2011-0427-hackleburg",
    name: "Hackleburg-Phil Campbell",
    date: "2011-04-27",
    rating: "EF5",
    states: ["MS", "AL", "TN"],
    counties: ["Marion", "Franklin", "Lawrence", "Limestone", "Madison"],
    wfo: "BMX/HUN",
    source: "SPC",
    dataStatus: "final",
    pathLengthMiles: 132,
    maxWidthYards: 2200,
    injuries: 145,
    fatalities: 72,
    propertyDamageUsd: 1200000000,
    cropDamageUsd: 0,
    beginTime: "3:05 PM CDT",
    endTime: "5:40 PM CDT",
    sourceFile: "1950-2025_actual_tornadoes.csv",
    lastReviewed: "2026-04-24",
    narrative:
      "Long-track violent tornado used here as a benchmark for cross-state track rendering, casualty summaries, and source provenance.",
    coordinates: [
      [-88.17, 34.17],
      [-87.91, 34.3],
      [-87.63, 34.47],
      [-87.18, 34.67],
      [-86.82, 34.84],
      [-86.51, 35.04],
    ],
  },
  {
    id: "ncei-2013-0520-moore",
    name: "Moore",
    date: "2013-05-20",
    rating: "EF5",
    states: ["OK"],
    counties: ["Cleveland", "McClain"],
    wfo: "OUN",
    source: "NCEI",
    dataStatus: "final",
    pathLengthMiles: 14,
    maxWidthYards: 1900,
    injuries: 212,
    fatalities: 24,
    propertyDamageUsd: 2000000000,
    cropDamageUsd: 0,
    beginTime: "2:56 PM CDT",
    endTime: "3:35 PM CDT",
    sourceFile: "StormEvents_details-ftp_v1.0_d2013_c20240216.csv.gz",
    lastReviewed: "2024-02-16",
    narrative:
      "Dense urban impact sample with high damage totals, useful for validating event detail pages and damage metadata presentation.",
    coordinates: [
      [-97.64, 35.3],
      [-97.55, 35.31],
      [-97.45, 35.32],
      [-97.33, 35.35],
    ],
  },
  {
    id: "spc-2021-1210-mayfield",
    name: "Western Kentucky",
    date: "2021-12-10",
    rating: "EF4",
    states: ["TN", "KY"],
    counties: ["Obion", "Hickman", "Graves", "Marshall", "Hopkins", "Muhlenberg", "Ohio"],
    wfo: "PAH",
    source: "SPC",
    dataStatus: "final",
    pathLengthMiles: 168.53,
    maxWidthYards: 2600,
    injuries: 515,
    fatalities: 57,
    propertyDamageUsd: 3900000000,
    cropDamageUsd: 25000000,
    beginTime: "8:54 PM CST",
    endTime: "11:47 PM CST",
    sourceFile: "1950-2025_actual_tornadoes.csv",
    lastReviewed: "2026-04-24",
    narrative:
      "Late-season long-track EF4 record aligned to the SPC actual-tornado start and end coordinates for the TN/KY segment.",
    coordinates: [
      [-89.135, 36.483],
      [-88.93, 36.59],
      [-88.64, 36.74],
      [-88.28, 36.96],
      [-87.94, 37.12],
      [-87.48, 37.28],
      [-86.95, 37.45],
      [-86.5062, 37.6078],
    ],
  },
  {
    id: "dat-2024-0426-elkhorn",
    name: "Elkhorn",
    date: "2024-04-26",
    rating: "EF3",
    states: ["NE", "IA"],
    counties: ["Douglas", "Pottawattamie"],
    wfo: "OAX",
    source: "NWS DAT",
    dataStatus: "survey",
    pathLengthMiles: 31,
    maxWidthYards: 800,
    injuries: 4,
    fatalities: 0,
    propertyDamageUsd: 95000000,
    cropDamageUsd: 0,
    beginTime: "3:30 PM CDT",
    endTime: "4:08 PM CDT",
    sourceFile: "DamageViewer FeatureServer",
    lastReviewed: "2024-05-03",
    narrative:
      "Damage Assessment Toolkit-style survey event, reserved for testing field survey overlays and preliminary-to-final workflows.",
    coordinates: [
      [-96.39, 41.15],
      [-96.25, 41.2],
      [-96.08, 41.26],
      [-95.89, 41.3],
    ],
  },
  {
    id: "spc-2023-0331-wynne",
    name: "Wynne",
    date: "2023-03-31",
    rating: "EF3",
    states: ["AR"],
    counties: ["Cross", "Poinsett"],
    wfo: "MEG",
    source: "SPC",
    dataStatus: "final",
    pathLengthMiles: 73,
    maxWidthYards: 1600,
    injuries: 26,
    fatalities: 4,
    propertyDamageUsd: 450000000,
    cropDamageUsd: 4000000,
    beginTime: "4:30 PM CDT",
    endTime: "5:38 PM CDT",
    sourceFile: "1950-2025_actual_tornadoes.csv",
    lastReviewed: "2026-04-24",
    narrative:
      "Regional outbreak event sample with meaningful county filtering and balanced EF-scale color contrast.",
    coordinates: [
      [-91.45, 35.31],
      [-91.15, 35.35],
      [-90.87, 35.28],
      [-90.58, 35.22],
    ],
  },
  {
    id: "spc-prelim-2026-0508-central-plains",
    name: "Central Plains Report",
    date: "2026-05-08",
    rating: "EF1",
    states: ["KS"],
    counties: ["Dickinson", "Geary"],
    wfo: "TOP",
    source: "SPC",
    dataStatus: "preliminary",
    pathLengthMiles: 9,
    maxWidthYards: 250,
    injuries: 0,
    fatalities: 0,
    propertyDamageUsd: 0,
    cropDamageUsd: 0,
    beginTime: "6:12 PM CDT",
    endTime: "6:27 PM CDT",
    sourceFile: "SPC daily preliminary reports",
    lastReviewed: "2026-05-09",
    narrative:
      "Preliminary sample to validate current-season labeling, uncertainty states, and eventual replacement by final NCEI records.",
    coordinates: [
      [-97.23, 38.88],
      [-97.07, 38.94],
      [-96.91, 39.01],
    ],
  },
];

export const dataPipelines = [
  {
    source: "SPC actual tornadoes",
    cadence: "Annual final refresh",
    status: "Ready for import",
    coverage: "1950-2025 finalized track CSV",
  },
  {
    source: "NCEI Storm Events",
    cadence: "Monthly, roughly 75-day lag",
    status: "Schema planned",
    coverage: "1950-Feb 2026 official details, locations, fatalities",
  },
  {
    source: "SPC preliminary reports",
    cadence: "Daily during active weather",
    status: "Connector planned",
    coverage: "1999-present preliminary reports",
  },
  {
    source: "NWS Damage Assessment Toolkit",
    cadence: "Survey-driven updates",
    status: "Overlay planned",
    coverage: "FeatureServer survey points, lines, polygons, photos",
  },
];
