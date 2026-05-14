export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const LANDMARKS: Record<string, string[]> = {
  ifrane: [
    "AUI Dorms",
    "Marché",
    "Grand Hotel",
    "Pizza Rustica",
    "Bonsai Sushi",
  ],
  oujda: [
    "Sidi Maafa",
    "Place Ziri Ibn Attia",
    "Université Mohammed Premier",
  ],
};

// GPS coordinates for each landmark [lat, lng]
export const LANDMARK_COORDS: Record<string, [number, number]> = {
  // Ifrane
  "AUI Dorms":    [33.5286, -5.1059],
  "Marché":       [33.5228, -5.1128],
  "Grand Hotel":  [33.5250, -5.1190],
  "Pizza Rustica":[33.5212, -5.1145],
  "Bonsai Sushi": [33.5208, -5.1132],
  // Oujda
  "Sidi Maafa":             [34.6650, -1.9090],
  "Place Ziri Ibn Attia":   [34.6811, -1.9072],
  "Université Mohammed Premier": [34.6930, -1.9050],
};

export const CUSTOM_OPTION = "__custom__";

export const ZONES: Zone[] = [
  {
    id: "ifrane",
    name: "Ifrane",
    lat: 33.5228,
    lng: -5.1128,
  },
  {
    id: "oujda",
    name: "Oujda",
    lat: 34.6814,
    lng: -1.9086,
  },
];

export interface ZoneConfig {
  id: string;
  name: string;
  baseFee: number;
  surgeMultiplier: number;
  active: boolean;
  centerLat: number;
  centerLng: number;
}

export const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  ifrane: {
    id: "ifrane",
    name: "Ifrane",
    baseFee: 15,
    surgeMultiplier: 1.5,
    active: true,
    centerLat: 33.5228,
    centerLng: -5.1128,
  },
  oujda: {
    id: "oujda",
    name: "Oujda",
    baseFee: 10,
    surgeMultiplier: 1.5,
    active: true,
    centerLat: 34.6819,
    centerLng: -1.9086,
  },
};

export function getZoneConfig(zone: string): ZoneConfig {
  const config = ZONE_CONFIGS[zone.toLowerCase()];
  if (!config) throw new Error(`Unknown zone: ${zone}`);
  return config;
}
