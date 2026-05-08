import type { CountryState, UpgradeDefinition, UpgradeLevels } from "./types";

export const INITIAL_COUNTRIES: CountryState[] = [
  { id: "usa", name: "United States", population: 340_000_000, infected: 0, climate: "temperate", wealth: "rich", transportHubs: ["air", "sea"], x: 22, y: 39, eventModifier: 1, eventExpiresAt: 0 },
  { id: "brazil", name: "Brazil", population: 215_000_000, infected: 0, climate: "hot", wealth: "medium", transportHubs: ["air", "sea"], x: 36, y: 68, eventModifier: 1, eventExpiresAt: 0 },
  { id: "uk", name: "United Kingdom", population: 68_000_000, infected: 0, climate: "cold", wealth: "rich", transportHubs: ["air", "sea"], x: 48, y: 32, eventModifier: 1, eventExpiresAt: 0 },
  { id: "egypt", name: "Egypt", population: 112_000_000, infected: 0, climate: "hot", wealth: "medium", transportHubs: ["air", "sea"], x: 54, y: 50, eventModifier: 1, eventExpiresAt: 0 },
  { id: "nigeria", name: "Nigeria", population: 226_000_000, infected: 0, climate: "hot", wealth: "poor", transportHubs: ["air", "sea"], x: 50, y: 57, eventModifier: 1, eventExpiresAt: 0 },
  { id: "russia", name: "Russia", population: 144_000_000, infected: 0, climate: "cold", wealth: "medium", transportHubs: ["air", "sea"], x: 67, y: 26, eventModifier: 1, eventExpiresAt: 0 },
  { id: "india", name: "India", population: 1_430_000_000, infected: 12_000, climate: "hot", wealth: "medium", transportHubs: ["air", "sea"], x: 68, y: 52, eventModifier: 1, eventExpiresAt: 0 },
  { id: "china", name: "China", population: 1_410_000_000, infected: 0, climate: "temperate", wealth: "medium", transportHubs: ["air", "sea"], x: 75, y: 44, eventModifier: 1, eventExpiresAt: 0 },
  { id: "japan", name: "Japan", population: 123_000_000, infected: 0, climate: "temperate", wealth: "rich", transportHubs: ["air", "sea"], x: 86, y: 43, eventModifier: 1, eventExpiresAt: 0 },
  { id: "indonesia", name: "Indonesia", population: 278_000_000, infected: 0, climate: "hot", wealth: "medium", transportHubs: ["air", "sea"], x: 78, y: 63, eventModifier: 1, eventExpiresAt: 0 },
  { id: "australia", name: "Australia", population: 27_000_000, infected: 0, climate: "hot", wealth: "rich", transportHubs: ["air", "sea"], x: 82, y: 76, eventModifier: 1, eventExpiresAt: 0 },
  { id: "canada", name: "Canada", population: 40_000_000, infected: 0, climate: "cold", wealth: "rich", transportHubs: ["air", "sea"], x: 20, y: 27, eventModifier: 1, eventExpiresAt: 0 },
];

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  { id: "airborne", name: "Airborne", category: "Transmission", description: "Boosts plane seeding and cross-border jumps.", maxLevel: 5, baseCost: 8, costScale: 1.55 },
  { id: "waterborne", name: "Waterborne", category: "Transmission", description: "Boosts ship routes and coastal spread.", maxLevel: 5, baseCost: 8, costScale: 1.55 },
  { id: "mild", name: "Mild Symptoms", category: "Symptoms", description: "A small visibility increase for faster local spread.", maxLevel: 3, baseCost: 6, costScale: 1.7 },
  { id: "severe", name: "Severe Symptoms", category: "Symptoms", description: "Greatly increases spread but alerts researchers.", maxLevel: 3, baseCost: 14, costScale: 1.9 },
  { id: "lethal", name: "Lethal Symptoms", category: "Symptoms", description: "Terrifying infectious pressure with major cure risk.", maxLevel: 2, baseCost: 24, costScale: 2.15 },
  { id: "coldResistance", name: "Cold Resistance", category: "Resistance", description: "Reduces cold-climate infection penalties.", maxLevel: 4, baseCost: 9, costScale: 1.6 },
  { id: "heatResistance", name: "Heat Resistance", category: "Resistance", description: "Reduces hot-climate infection penalties.", maxLevel: 4, baseCost: 9, costScale: 1.6 },
  { id: "drugResistance", name: "Drug Resistance", category: "Resistance", description: "Slows rich-country cure programs.", maxLevel: 5, baseCost: 10, costScale: 1.65 },
];

export const INITIAL_UPGRADES: UpgradeLevels = {
  airborne: 0,
  waterborne: 0,
  mild: 0,
  severe: 0,
  lethal: 0,
  coldResistance: 0,
  heatResistance: 0,
  drugResistance: 0,
};
