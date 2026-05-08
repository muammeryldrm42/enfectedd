"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { HantaGameEngine } from "@/lib/game/engine";
import { UPGRADE_DEFINITIONS } from "@/lib/game/data";
import type { AlienChoice, GameSnapshot, UpgradeDefinition, UpgradeId } from "@/lib/game/types";

const formatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const percent = (value: number) => `${(value * 100).toFixed(value < 0.1 ? 2 : 1)}%`;

export default function Home() {
  const engineRef = useRef<HantaGameEngine>();
  if (!engineRef.current) engineRef.current = new HantaGameEngine();

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engineRef.current!.getSnapshot());
  const [upgradesOpen, setUpgradesOpen] = useState(true);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastSnapshot = 0;

    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      engineRef.current!.tick(delta, now);

      if (now - lastSnapshot > 180) {
        setSnapshot(engineRef.current!.getSnapshot(now));
        lastSnapshot = now;
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const definitionsByCategory = useMemo(() => {
    return UPGRADE_DEFINITIONS.reduce<Record<string, UpgradeDefinition[]>>((groups, definition) => {
      groups[definition.category] = [...(groups[definition.category] ?? []), definition];
      return groups;
    }, {});
  }, []);

  const buyUpgrade = (id: UpgradeId) => {
    if (engineRef.current!.buyUpgrade(id)) setSnapshot(engineRef.current!.getSnapshot());
  };

  const suppressSymptoms = () => {
    if (engineRef.current!.suppressSymptoms()) setSnapshot(engineRef.current!.getSnapshot());
  };

  const chooseAlien = (choice: AlienChoice) => {
    engineRef.current!.chooseAlien(choice);
    setSnapshot(engineRef.current!.getSnapshot());
  };

  const colorIntensity = Math.min(1, 0.25 + snapshot.infectionPercent * 1.8 + snapshot.upgrades.lethal * 0.16);

  return (
    <main className="shell">
      <aside className={`upgrade-drawer ${upgradesOpen ? "open" : ""}`}>
        <button className="drawer-toggle" onClick={() => setUpgradesOpen((open) => !open)}>
          {upgradesOpen ? "Hide evolution" : "Evolve virus"}
        </button>
        <div className="drawer-content">
          <div className="dna-card">
            <span>DNA points</span>
            <strong>{snapshot.dna}</strong>
            <small>Earned from exponential infection spread</small>
          </div>

          {Object.entries(definitionsByCategory).map(([category, definitions]) => (
            <section className="upgrade-group" key={category}>
              <h2>{category}</h2>
              {definitions.map((definition) => {
                const level = snapshot.upgrades[definition.id];
                const cost = engineRef.current!.getUpgradeCost(definition.id);
                const maxed = level >= definition.maxLevel;
                const locked = !maxed && !engineRef.current!.canBuyUpgrade(definition.id);
                return (
                  <button
                    className="upgrade-card"
                    disabled={maxed || locked}
                    key={definition.id}
                    onClick={() => buyUpgrade(definition.id)}
                  >
                    <span>
                      <b>{definition.name}</b>
                      <small>{definition.description}</small>
                    </span>
                    <em>{maxed ? "MAX" : `${cost} DNA`}</em>
                    <i style={{ width: `${(level / definition.maxLevel) * 100}%` }} />
                  </button>
                );
              })}
              {category === "Symptoms" && (
                <button className="suppress-card" disabled={snapshot.dna < 7 || snapshot.status !== "running"} onClick={suppressSymptoms}>
                  Suppress severity <b>7 DNA</b>
                </button>
              )}
            </section>
          ))}
        </div>
      </aside>

      <section className="hud">
        <div>
          <span>Global infection</span>
          <strong>{percent(snapshot.infectionPercent)}</strong>
        </div>
        <div>
          <span>Phase</span>
          <strong>{snapshot.phase.toUpperCase()}</strong>
        </div>
        <div>
          <span>Countries infected</span>
          <strong>{snapshot.countries.filter((country) => country.infected > 0).length}/{snapshot.countries.length}</strong>
        </div>
        <div className="cure-meter">
          <span>{snapshot.cureActive ? "Global cure" : "Cure dormant until 5% infection"}</span>
          <div className="cure-track">
            <i style={{ width: `${snapshot.cureProgress}%` }} />
          </div>
          <strong>{snapshot.cureProgress.toFixed(1)}%</strong>
        </div>
      </section>

      <section className="world-card">
        <div className="world-header">
          <div>
            <p>HANTA INC COMMAND</p>
            <h1>Engineer the outbreak before humanity engineers the cure.</h1>
          </div>
          <div className="stats-pill">{formatter.format(snapshot.globalInfected)} / {formatter.format(snapshot.globalPopulation)} infected</div>
        </div>

        <div className="map" style={{ "--infection-glow": colorIntensity } as CSSProperties}>
          <div className="grid-lines" />
          {snapshot.countries.map((country) => {
            const countryPercent = country.infected / country.population;
            const size = 11 + Math.sqrt(countryPercent) * 54;
            return (
              <button
                className="country-node"
                key={country.id}
                style={{ left: `${country.x}%`, top: `${country.y}%`, width: size, height: size, opacity: 0.55 + countryPercent * 0.45 } as CSSProperties}
                title={`${country.name}: ${formatter.format(country.infected)} infected`}
              >
                <span>{country.name}</span>
              </button>
            );
          })}
        </div>

        <div className="country-table">
          {snapshot.countries.map((country) => (
            <article key={country.id}>
              <b>{country.name}</b>
              <span>{formatter.format(country.infected)} infected</span>
              <small>{country.climate} · {country.wealth} · {country.transportHubs.join("+")}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="toasts">
        {snapshot.toasts.map((toast) => (
          <article key={toast.id}>
            <b>{toast.title}</b>
            <span>{toast.description}</span>
          </article>
        ))}
      </div>

      {snapshot.alienPending && (
        <div className="modal-backdrop">
          <section className="modal">
            <p>50% GLOBAL INFECTION EVENT</p>
            <h2>Alien contact disrupts the pandemic.</h2>
            <div className="choice-grid">
              <button onClick={() => chooseAlien("symbiosis")}>
                <b>Symbiosis</b>
                <span>+30% spread speed, +20% cure speed. High reward, high visibility.</span>
              </button>
              <button onClick={() => chooseAlien("invasion")}>
                <b>Invasion</b>
                <span>UFO abductions reduce cure speed, but infection chains slow slightly.</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {snapshot.status !== "running" && snapshot.endStats && (
        <div className="modal-backdrop">
          <section className="modal end-screen">
            <p>{snapshot.status === "won" ? "GLOBAL SATURATION" : "CURE COMPLETED"}</p>
            <h2>{snapshot.status === "won" ? "HANTA infected the world." : "Humanity neutralized HANTA."}</h2>
            <dl>
              <div><dt>Total time</dt><dd>{snapshot.endStats.totalTime.toFixed(0)}s</dd></div>
              <div><dt>Countries infected</dt><dd>{snapshot.endStats.countriesInfected}</dd></div>
              <div><dt>Upgrades used</dt><dd>{snapshot.endStats.upgradesUsed}</dd></div>
              <div><dt>Peak cure</dt><dd>{snapshot.endStats.peakCure.toFixed(1)}%</dd></div>
            </dl>
            <button onClick={() => window.location.reload()}>Run new simulation</button>
          </section>
        </div>
      )}
    </main>
  );
}
