export type Climate = "cold" | "hot" | "temperate";
export type Wealth = "poor" | "medium" | "rich";
export type TransportHub = "air" | "sea";
export type GamePhase = "early" | "mid" | "late";
export type GameStatus = "running" | "won" | "lost";
export type AlienChoice = "symbiosis" | "invasion";

export interface CountryState {
  id: string;
  name: string;
  population: number;
  infected: number;
  climate: Climate;
  wealth: Wealth;
  transportHubs: TransportHub[];
  x: number;
  y: number;
  eventModifier: number;
  eventExpiresAt: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  category: "Transmission" | "Symptoms" | "Resistance";
  description: string;
  maxLevel: number;
  baseCost: number;
  costScale: number;
}

export type UpgradeId =
  | "airborne"
  | "waterborne"
  | "mild"
  | "severe"
  | "lethal"
  | "coldResistance"
  | "heatResistance"
  | "drugResistance";

export type UpgradeLevels = Record<UpgradeId, number>;

export interface ToastEvent {
  id: number;
  title: string;
  description: string;
  createdAt: number;
}

export interface EndStats {
  totalTime: number;
  countriesInfected: number;
  upgradesUsed: number;
  peakCure: number;
}

export interface GameSnapshot {
  now: number;
  status: GameStatus;
  countries: CountryState[];
  dna: number;
  cureProgress: number;
  cureActive: boolean;
  globalInfected: number;
  globalPopulation: number;
  infectionPercent: number;
  phase: GamePhase;
  upgrades: UpgradeLevels;
  toasts: ToastEvent[];
  alienPending: boolean;
  alienChoice: AlienChoice | null;
  endStats: EndStats | null;
}
