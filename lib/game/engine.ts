import { INITIAL_COUNTRIES, INITIAL_UPGRADES, UPGRADE_DEFINITIONS } from "./data";
import type { AlienChoice, CountryState, EndStats, GamePhase, GameSnapshot, ToastEvent, UpgradeId, UpgradeLevels } from "./types";

const SECOND = 1000;
const EVENT_MIN = 30 * SECOND;
const EVENT_MAX = 60 * SECOND;
const SNAPSHOT_TOAST_TTL = 6500;

const cloneCountries = () => INITIAL_COUNTRIES.map((country) => ({ ...country, transportHubs: [...country.transportHubs] }));
const cloneUpgrades = (): UpgradeLevels => ({ ...INITIAL_UPGRADES });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class HantaGameEngine {
  private countries: CountryState[] = cloneCountries();
  private upgrades: UpgradeLevels = cloneUpgrades();
  private dna = 0;
  private dnaRemainder = 0;
  private cureProgress = 0;
  private cureActive = false;
  private status: "running" | "won" | "lost" = "running";
  private startedAt = performance.now();
  private lastEventAt = this.startedAt;
  private nextEventDelay = this.randomEventDelay();
  private toasts: ToastEvent[] = [];
  private toastId = 1;
  private alienPending = false;
  private alienTriggered = false;
  private alienChoice: AlienChoice | null = null;
  private spreadMultiplier = 1;
  private cureMultiplier = 1;
  private endStats: EndStats | null = null;

  tick(deltaMs: number, now = performance.now()) {
    if (this.status !== "running" || this.alienPending) return;

    const deltaSeconds = Math.min(deltaMs / SECOND, 0.08);
    this.expireCountryEvents(now);
    this.simulateSpread(deltaSeconds);
    this.generateDna(deltaSeconds);
    this.simulateCure(deltaSeconds);
    this.maybeTriggerAlien();
    this.maybeTriggerRandomEvent(now);
    this.checkEndConditions(now);
    this.pruneToasts(now);
  }

  buyUpgrade(id: UpgradeId): boolean {
    if (!this.canBuyUpgrade(id)) return false;
    const definition = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id)!;
    const cost = this.getUpgradeCost(id);

    this.dna -= cost;
    this.upgrades[id] += 1;
    this.addToast(definition.name, `${definition.description} Level ${this.upgrades[id]} evolved.`, performance.now());
    return true;
  }

  canBuyUpgrade(id: UpgradeId): boolean {
    if (this.status !== "running") return false;
    const definition = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);
    if (!definition || this.upgrades[id] >= definition.maxLevel) return false;
    if (id === "severe" && this.upgrades.mild <= 0) return false;
    if (id === "lethal" && this.upgrades.severe <= 0) return false;
    return this.dna >= this.getUpgradeCost(id);
  }

  suppressSymptoms(): boolean {
    if (this.status !== "running" || this.dna < 7) return false;
    const target = this.upgrades.lethal > 0 ? "lethal" : this.upgrades.severe > 0 ? "severe" : this.upgrades.mild > 0 ? "mild" : null;
    if (!target) return false;

    this.dna -= 7;
    this.upgrades[target] -= 1;
    this.addToast("Symptoms suppressed", "Severity was reduced to slow global cure research.", performance.now());
    return true;
  }

  chooseAlien(choice: AlienChoice) {
    if (!this.alienPending) return;
    this.alienChoice = choice;
    this.alienPending = false;

    if (choice === "symbiosis") {
      this.spreadMultiplier *= 1.3;
      this.cureMultiplier *= 1.2;
      this.addToast("Alien symbiosis", "The pathogen adapts to cosmic biology: spread rises, but labs detect it faster.", performance.now());
      return;
    }

    this.spreadMultiplier *= 0.9;
    this.cureMultiplier *= 0.72;
    for (const country of this.countries) {
      if (country.infected > 0) {
        country.population = Math.max(country.infected, Math.floor(country.population * 0.985));
      }
    }
    this.addToast("Alien invasion", "UFO abductions destabilize research networks but disrupt infection chains.", performance.now());
  }

  getUpgradeCost(id: UpgradeId) {
    const definition = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);
    if (!definition) return Number.POSITIVE_INFINITY;
    return Math.ceil(definition.baseCost * definition.costScale ** this.upgrades[id]);
  }

  getSnapshot(now = performance.now()): GameSnapshot {
    const globalPopulation = this.globalPopulation;
    const globalInfected = this.globalInfected;

    return {
      now,
      status: this.status,
      countries: this.countries.map((country) => ({ ...country, transportHubs: [...country.transportHubs] })),
      dna: Math.floor(this.dna),
      cureProgress: this.cureProgress,
      cureActive: this.cureActive,
      globalInfected,
      globalPopulation,
      infectionPercent: globalInfected / globalPopulation,
      phase: this.phase,
      upgrades: { ...this.upgrades },
      toasts: [...this.toasts],
      alienPending: this.alienPending,
      alienChoice: this.alienChoice,
      endStats: this.endStats,
    };
  }

  private simulateSpread(deltaSeconds: number) {
    const phaseMultiplier = this.phase === "early" ? 0.58 : this.phase === "mid" ? 1.16 : 0.7;
    const symptomBoost = 1 + this.upgrades.mild * 0.12 + this.upgrades.severe * 0.25 + this.upgrades.lethal * 0.34;
    const transmissionBoost = 1 + this.upgrades.airborne * 0.1 + this.upgrades.waterborne * 0.1;

    const newInfections = this.countries.map((country) => {
      if (country.infected <= 0) return 0;
      const susceptible = Math.max(country.population - country.infected, 0);
      const saturation = susceptible / country.population;
      const populationPressure = clamp(Math.log10(country.population) / 9.1, 0.68, 1.15);
      const climatePenalty = this.climateModifier(country);
      const localRate = 0.00085 * phaseMultiplier * symptomBoost * transmissionBoost * this.spreadMultiplier;
      const growth = country.infected * localRate * saturation * populationPressure * climatePenalty * country.eventModifier * deltaSeconds;
      return Math.min(susceptible, growth);
    });

    this.countries.forEach((country, index) => {
      country.infected += newInfections[index];
    });

    this.seedTransport(deltaSeconds);
  }

  private seedTransport(deltaSeconds: number) {
    const infectedCountries = this.countries.filter((country) => country.infected / country.population > 0.001);
    if (!infectedCountries.length) return;

    for (const target of this.countries) {
      if (target.infected > target.population * 0.002) continue;

      let routePressure = 0;
      for (const source of infectedCountries) {
        if (source.id === target.id) continue;
        const sourceLoad = source.infected / source.population;
        if (source.transportHubs.includes("air") && target.transportHubs.includes("air")) routePressure += sourceLoad * (1 + this.upgrades.airborne * 0.55);
        if (source.transportHubs.includes("sea") && target.transportHubs.includes("sea")) routePressure += sourceLoad * (0.62 + this.upgrades.waterborne * 0.46);
      }

      const chance = routePressure * 0.11 * this.spreadMultiplier * deltaSeconds;
      if (Math.random() < chance) {
        target.infected = Math.max(target.infected, Math.min(target.population * 0.00003, 6000 + Math.random() * 16000));
        this.addToast("New country infected", `${target.name} reports unusual HANTA clusters.`, performance.now());
      }
    }
  }

  private simulateCure(deltaSeconds: number) {
    const infectionPercent = this.globalInfected / this.globalPopulation;
    if (!this.cureActive && infectionPercent >= 0.05) {
      this.cureActive = true;
      this.addToast("Global cure initiative", "Labs detected HANTA at 5% global infection. Cure research has begun.", performance.now());
    }
    if (!this.cureActive) return;

    const infectedCountries = this.infectedCountryCount;
    const severity = this.upgrades.mild * 0.35 + this.upgrades.severe * 0.9 + this.upgrades.lethal * 1.45;
    const richPressure = this.countries.reduce((sum, country) => {
      if (country.infected <= 0) return sum;
      const wealthBoost = country.wealth === "rich" ? 1.5 : country.wealth === "medium" ? 1 : 0.62;
      const drugDampener = country.wealth === "rich" ? 1 - this.upgrades.drugResistance * 0.09 : 1;
      return sum + wealthBoost * drugDampener;
    }, 0);
    const resistanceDampener = 1 - (this.upgrades.coldResistance + this.upgrades.heatResistance + this.upgrades.drugResistance) * 0.018;
    const rate = (0.006 + infectedCountries * 0.0018 + severity * 0.0038 + richPressure * 0.0009) * this.cureMultiplier * resistanceDampener;
    this.cureProgress = clamp(this.cureProgress + rate * deltaSeconds, 0, 100);
  }

  private generateDna(deltaSeconds: number) {
    const infected = this.globalInfected;
    const spreadFactor = Math.log10(infected + 10) / 10;
    const phaseBonus = this.phase === "early" ? 0.72 : this.phase === "mid" ? 1.2 : 0.82;
    this.dnaRemainder += spreadFactor * phaseBonus * deltaSeconds * 0.9;
    const whole = Math.floor(this.dnaRemainder);
    if (whole > 0) {
      this.dna += whole;
      this.dnaRemainder -= whole;
    }
  }

  private maybeTriggerAlien() {
    if (this.alienTriggered || this.globalInfected / this.globalPopulation < 0.5) return;
    this.alienTriggered = true;
    this.alienPending = true;
  }

  private maybeTriggerRandomEvent(now: number) {
    if (now - this.lastEventAt < this.nextEventDelay) return;
    this.lastEventAt = now;
    this.nextEventDelay = this.randomEventDelay();

    const event = Math.floor(Math.random() * 3);
    if (event === 0) {
      const airCountries = this.countries.filter((country) => country.transportHubs.includes("air"));
      const target = airCountries[Math.floor(Math.random() * airCountries.length)];
      target.eventModifier = 0.62;
      target.eventExpiresAt = now + 22 * SECOND;
      this.addToast("Airport shutdown", `${target.name} cuts flights, slowing imported cases.`, now);
    } else if (event === 1) {
      this.dna += 8;
      this.addToast("New mutation discovered", "A spontaneous mutation grants +8 DNA for immediate evolution.", now);
    } else {
      this.cureProgress = clamp(this.cureProgress + 2.5, 0, 100);
      this.addToast("Panic increases", "Public panic accelerates emergency cure funding worldwide.", now);
    }
  }

  private expireCountryEvents(now: number) {
    for (const country of this.countries) {
      if (country.eventExpiresAt && country.eventExpiresAt <= now) {
        country.eventModifier = 1;
        country.eventExpiresAt = 0;
      }
    }
  }

  private checkEndConditions(now: number) {
    if (this.cureProgress >= 100) {
      this.finish("lost", now);
      return;
    }
    if (this.globalInfected >= this.globalPopulation * 0.999) {
      this.finish("won", now);
    }
  }

  private finish(status: "won" | "lost", now: number) {
    this.status = status;
    this.endStats = {
      totalTime: (now - this.startedAt) / SECOND,
      countriesInfected: this.infectedCountryCount,
      upgradesUsed: Object.values(this.upgrades).reduce((sum, level) => sum + level, 0),
      peakCure: this.cureProgress,
    };
  }

  private climateModifier(country: CountryState) {
    if (country.climate === "cold") return 0.58 + this.upgrades.coldResistance * 0.13;
    if (country.climate === "hot") return 0.64 + this.upgrades.heatResistance * 0.12;
    return 1;
  }

  private addToast(title: string, description: string, now: number) {
    this.toasts = [{ id: this.toastId++, title, description, createdAt: now }, ...this.toasts].slice(0, 5);
  }

  private pruneToasts(now: number) {
    this.toasts = this.toasts.filter((toast) => now - toast.createdAt < SNAPSHOT_TOAST_TTL);
  }

  private randomEventDelay() {
    return EVENT_MIN + Math.random() * (EVENT_MAX - EVENT_MIN);
  }

  private get globalPopulation() {
    return this.countries.reduce((sum, country) => sum + country.population, 0);
  }

  private get globalInfected() {
    return this.countries.reduce((sum, country) => sum + country.infected, 0);
  }

  private get infectedCountryCount() {
    return this.countries.filter((country) => country.infected > 0).length;
  }

  private get phase(): GamePhase {
    const infectionPercent = this.globalInfected / this.globalPopulation;
    if (infectionPercent < 0.12) return "early";
    if (infectionPercent < 0.68) return "mid";
    return "late";
  }
}
