export type SectorId =
  | "landing"
  | "jezero"
  | "marineris"
  | "olympus"
  | "hellas";

export interface SectorDef {
  id: SectorId;
  name: string;
  blurb: string;
  unlockCost: number;
  value: number;
  patchCount: number;
  dustUnits: number;
  sky: string;
  horizon: string;
  fog: string;
  ground: string;
  accent: string;
}

export interface ToolDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  power: number;
  radius: number;
  cost: number;
  color: string;
}

export const BASE_PRICE = 2.5;
export const BAG_BASE = 80;
export const BAG_STEP = 50;

export const TOOLS: readonly ToolDef[] = [
  {
    id: "toothbrush",
    name: "Toothbrush",
    emoji: "🪥",
    blurb: "Standard issue. Criminally small. It's a start.",
    power: 5,
    radius: 1.2,
    cost: 0,
    color: "#7dd3fc",
  },
  {
    id: "scrub-brush",
    name: "Scrub Brush",
    emoji: "🖌️",
    blurb: "Bristles with ambition. Almost twice the bite.",
    power: 9,
    radius: 1.8,
    cost: 75,
    color: "#67e8f9",
  },
  {
    id: "broom",
    name: "Rover Broom",
    emoji: "🧹",
    blurb: "Now we're sweeping. A wide head and a long reach.",
    power: 16,
    radius: 2.6,
    cost: 550,
    color: "#fdba74",
  },
  {
    id: "vacuum",
    name: "Dust Vacuum",
    emoji: "🌀",
    blurb: "A whirlwind in a canister. Very satisfying.",
    power: 28,
    radius: 3.6,
    cost: 2700,
    color: "#c4b5fd",
  },
  {
    id: "rover",
    name: "Regolith Rover",
    emoji: "🚙",
    blurb: "Why sweep when you can drive a cleaning rig?",
    power: 46,
    radius: 4.8,
    cost: 13000,
    color: "#fca5a5",
  },
  {
    id: "fleet",
    name: "Sweeper Fleet",
    emoji: "🛰️",
    blurb: "An orbital cleaning array. Mars never stood a chance.",
    power: 80,
    radius: 6,
    cost: 65000,
    color: "#fde68a",
  },
];

export const SECTORS: Record<SectorId, SectorDef> = {
  landing: {
    id: "landing",
    name: "Landing Site",
    blurb: "Dust-up at the drop zone. Start small, sweep big.",
    unlockCost: 0,
    value: 1,
    patchCount: 150,
    dustUnits: 900,
    sky: "#d9a06b",
    horizon: "#b6643c",
    fog: "#bf7147",
    ground: "#8a3f24",
    accent: "#f2b27a",
  },
  jezero: {
    id: "jezero",
    name: "Jezero Crater",
    blurb: "Ancient river delta. Extra fine dust, extra fine pay.",
    unlockCost: 1200,
    value: 1.5,
    patchCount: 180,
    dustUnits: 1300,
    sky: "#d68f58",
    horizon: "#a85433",
    fog: "#b5623b",
    ground: "#7d351d",
    accent: "#ee9f66",
  },
  marineris: {
    id: "marineris",
    name: "Valles Marineris",
    blurb: "A canyon the size of a country, filled with grit.",
    unlockCost: 6000,
    value: 2.1,
    patchCount: 210,
    dustUnits: 1800,
    sky: "#c97b48",
    horizon: "#8f3f27",
    fog: "#9c4a2d",
    ground: "#6f2c18",
    accent: "#e4844f",
  },
  olympus: {
    id: "olympus",
    name: "Olympus Mons",
    blurb: "The tallest volcano in the solar system. Bring a bigger broom.",
    unlockCost: 24000,
    value: 2.8,
    patchCount: 240,
    dustUnits: 2400,
    sky: "#b96a3d",
    horizon: "#7d321f",
    fog: "#8a3a25",
    ground: "#5f2413",
    accent: "#d97340",
  },
  hellas: {
    id: "hellas",
    name: "Hellas Basin",
    blurb: "An impact basin full of regolith. The final frontier of clean.",
    unlockCost: 90000,
    value: 3.6,
    patchCount: 280,
    dustUnits: 3200,
    sky: "#a85c35",
    horizon: "#6d2a1a",
    fog: "#783021",
    ground: "#52200f",
    accent: "#c96237",
  },
};

export const SECTOR_LIST: readonly SectorDef[] = [
  SECTORS.landing,
  SECTORS.jezero,
  SECTORS.marineris,
  SECTORS.olympus,
  SECTORS.hellas,
];

export const DEPOT_POSITION = { x: 0, z: -14 };
export const DEPOT_RANGE = 5.5;
export const DRONE_DEPOT_POSITION = { x: 17, z: 3 };
/** Dust a single drone can carry before launching a capsule. */
export const DRONE_CAPSULE = 28;
/** Dust units per second swept by a single drone. */
export const DRONE_RATE = 4.5;
