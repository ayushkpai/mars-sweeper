"use client";

import { useState, type ReactNode } from "react";
import { DRONE_CAPSULE, DRONE_RATE, SECTOR_LIST, SECTORS, TOOLS } from "@/game/content";
import type { SectorId } from "@/game/content";
import {
  bagCost,
  capacityOf,
  currentTool,
  droneCost,
  magnetCost,
  marketCost,
  nextTool,
  powerOf,
  pricePerDust,
} from "@/game/economy";
import type { EconomyState } from "@/game/economy";
import { money } from "@/game/format";

type Tab = "tools" | "upgrades" | "drones" | "sectors";

interface ShopProps {
  open: boolean;
  eco: EconomyState;
  onClose: () => void;
  onBuyTool: () => void;
  onBuyBag: () => void;
  onBuyMagnet: () => void;
  onBuyMarket: () => void;
  onBuyDrone: () => void;
  onUnlockSector: (id: SectorId) => void;
  onTravel: (id: SectorId) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "tools", label: "Tools" },
  { id: "upgrades", label: "Upgrades" },
  { id: "drones", label: "Drones" },
  { id: "sectors", label: "Sectors" },
];

function BuyButton({
  cost,
  credits,
  onClick,
  children,
}: {
  cost: number;
  credits: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const affordable = credits >= cost;
  return (
    <button
      type="button"
      disabled={!affordable}
      onClick={onClick}
      className={[
        "mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold transition",
        affordable
          ? "bg-gradient-to-r from-orange-500 to-amber-400 text-stone-950 hover:from-orange-400 hover:to-amber-300"
          : "cursor-not-allowed bg-white/5 text-stone-500",
      ].join(" ")}
    >
      {children} · {money(cost)}
    </button>
  );
}

function Card({
  children,
  highlight = false,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        highlight
          ? "border-orange-400/30 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent"
          : "border-white/10 bg-white/[0.03]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">
        {label}
      </p>
      <p className="text-sm font-medium text-stone-200">{value}</p>
    </div>
  );
}

export default function Shop({
  open,
  eco,
  onClose,
  onBuyTool,
  onBuyBag,
  onBuyMagnet,
  onBuyMarket,
  onBuyDrone,
  onUnlockSector,
  onTravel,
}: ShopProps) {
  const [tab, setTab] = useState<Tab>("tools");

  if (!open) return null;

  const tool = currentTool(eco);
  const upcoming = nextTool(eco);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close shop"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col border-l border-orange-400/20 bg-[#120a07]/97 shadow-2xl shadow-black/70">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200/70">
                Regolith Depot
              </p>
              <p className="mt-0.5 text-sm text-stone-400">
                Balance{" "}
                <span className="font-semibold text-orange-200">
                  {money(eco.credits)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-stone-300 transition hover:bg-white/10"
            >
              Resume
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-black/35 p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={[
                  "rounded-lg px-1 py-1.5 text-[11px] font-semibold transition",
                  tab === item.id
                    ? "bg-orange-500/90 text-stone-950"
                    : "text-stone-400 hover:bg-white/5 hover:text-stone-200",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {tab === "tools" && (
            <>
              <Card highlight>
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {tool.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{tool.name}</h3>
                      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        In hand
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-stone-400">
                      {tool.blurb}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Stat label="Sweep rate" value={`${Math.round(powerOf(eco))} dust/s`} />
                  <Stat label="Reach" value={`${tool.radius.toFixed(1)} m`} />
                </div>
              </Card>

              {upcoming ? (
                <Card>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl leading-none" aria-hidden="true">
                      {upcoming.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">
                          {upcoming.name}
                        </h3>
                        <span className="rounded-full bg-orange-400/10 px-2 py-0.5 text-[10px] font-medium text-orange-200">
                          Next
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-stone-400">
                        {upcoming.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Stat
                      label="Sweep rate"
                      value={`${upcoming.power} dust/s`}
                    />
                    <Stat label="Reach" value={`${upcoming.radius.toFixed(1)} m`} />
                  </div>
                  <BuyButton
                    cost={upcoming.cost}
                    credits={eco.credits}
                    onClick={onBuyTool}
                  >
                    Buy tool
                  </BuyButton>
                </Card>
              ) : (
                <Card>
                  <p className="text-sm font-semibold text-amber-200">
                    Top of the line 🛰️
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    The Sweeper Fleet is yours. Mars has never been this afraid
                    of a broom.
                  </p>
                </Card>
              )}

              <Card>
                <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">
                  Arsenal
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TOOLS.map((item, index) => (
                    <span
                      key={item.id}
                      className={[
                        "rounded-full px-2 py-0.5 text-[11px]",
                        index <= eco.toolIndex
                          ? "bg-emerald-400/10 text-emerald-200"
                          : "bg-white/5 text-stone-600",
                      ].join(" ")}
                    >
                      {item.emoji} {item.name}
                    </span>
                  ))}
                </div>
              </Card>
            </>
          )}

          {tab === "upgrades" && (
            <>
              <Card>
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    🎒
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      Cargo Bay{" "}
                      <span className="text-stone-500">Lv {eco.bagLevel}</span>
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Carry more regolith before the walk back to the depot.
                    </p>
                    <p className="mt-2 text-xs text-stone-300">
                      Capacity: <b>{capacityOf(eco)}</b> →{" "}
                      <b className="text-amber-200">{capacityOf(eco) + 50}</b>
                    </p>
                  </div>
                </div>
                <BuyButton
                  cost={bagCost(eco)}
                  credits={eco.credits}
                  onClick={onBuyBag}
                >
                  Weld on a pouch
                </BuyButton>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    🧲
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      Dust Magnet{" "}
                      <span className="text-stone-500">Lv {eco.magnetLevel}</span>
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Charge the bristles. Every sweep pulls more dust.
                    </p>
                    <p className="mt-2 text-xs text-stone-300">
                      Sweep rate: <b>+{Math.round(eco.magnetLevel * 15)}%</b> →{" "}
                      <b className="text-amber-200">
                        +{(eco.magnetLevel + 1) * 15}%
                      </b>
                    </p>
                  </div>
                </div>
                <BuyButton
                  cost={magnetCost(eco)}
                  credits={eco.credits}
                  onClick={onBuyMagnet}
                >
                  Charge the coil
                </BuyButton>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    📈
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      Market Contract{" "}
                      <span className="text-stone-500">Lv {eco.marketLevel}</span>
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Negotiate a better rate on every load you deliver.
                    </p>
                    <p className="mt-2 text-xs text-stone-300">
                      Price: <b>{money(pricePerDust(eco))}/u</b> (×
                      {eco.marketLevel * 10 + 100}
                      %)
                    </p>
                  </div>
                </div>
                <BuyButton
                  cost={marketCost(eco)}
                  credits={eco.credits}
                  onClick={onBuyMarket}
                >
                  Sign the contract
                </BuyButton>
              </Card>
            </>
          )}

          {tab === "drones" && (
            <>
              <Card highlight>
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden="true">
                    🛸
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      Sweeper Drones{" "}
                      <span className="text-stone-400">×{eco.droneCount}</span>
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-stone-400">
                      Autonomous sweepers that fill a capsule with dust and
                      launch it at the violet drone depot. Credits land the
                      moment the capsule touches down — no cargo space or depot
                      trip needed.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Stat label="Per drone" value={`${DRONE_RATE} dust/s`} />
                  <Stat
                    label="Capsule"
                    value={`${DRONE_CAPSULE} dust`}
                  />
                  <Stat
                    label="Fleet sweep"
                    value={`${(eco.droneCount * DRONE_RATE).toFixed(0)} dust/s`}
                  />
                  <Stat
                    label="Auto-sell"
                    value={`${money(eco.droneCount * DRONE_RATE * pricePerDust(eco))}/s`}
                  />
                </div>
                <BuyButton
                  cost={droneCost(eco)}
                  credits={eco.credits}
                  onClick={onBuyDrone}
                >
                  Deploy drone
                </BuyButton>
              </Card>

              <Card>
                <p className="text-sm font-semibold">Automation tips</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-stone-400">
                  <li>Drones keep cleaning while you haul loads to the depot.</li>
                  <li>Capsules only pay out when they land at the drone depot.</li>
                  <li>They help finish a sector, which pays a storm bonus.</li>
                </ul>
                {eco.droneEarned > 0 && (
                  <p className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-2 text-xs text-violet-200">
                    Drone earnings so far:{" "}
                    <b className="text-violet-100">{money(eco.droneEarned)}</b>
                  </p>
                )}
              </Card>
            </>
          )}

          {tab === "sectors" && (
            <>
              {SECTOR_LIST.map((sector) => {
                const unlocked = eco.unlocked.includes(sector.id);
                const isCurrent = eco.sectorId === sector.id;
                const clears = eco.clearCounts[sector.id] ?? 0;
                return (
                  <Card key={sector.id} highlight={isCurrent}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">{sector.name}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-stone-400">
                          {sector.blurb}
                        </p>
                      </div>
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: sector.accent }}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Stat
                        label="Field"
                        value={`${sector.patchCount} patches`}
                      />
                      <Stat label="Value" value={`×${sector.value}`} />
                      <Stat
                        label="Status"
                        value={
                          isCurrent
                            ? "You are here"
                            : clears > 0
                              ? `Cleared ×${clears}`
                              : unlocked
                                ? "Unlocked"
                                : "Locked"
                        }
                      />
                    </div>
                    {isCurrent ? (
                      <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-center text-xs text-emerald-200">
                        Active dust field
                      </div>
                    ) : unlocked ? (
                      <button
                        type="button"
                        onClick={() => onTravel(sector.id)}
                        className="mt-3 w-full rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20"
                      >
                        Travel to {sector.name}
                      </button>
                    ) : (
                      <BuyButton
                        cost={sector.unlockCost}
                        credits={eco.credits}
                        onClick={() => onUnlockSector(sector.id)}
                      >
                        Charter flight
                      </BuyButton>
                    )}
                  </Card>
                );
              })}
            </>
          )}
        </div>

        <div className="border-t border-white/10 p-3 text-center text-[10px] text-stone-500">
          {SECTORS[eco.sectorId].name} · Dust value ×
          {SECTORS[eco.sectorId].value} · Press{" "}
          <span className="text-stone-300">B</span> to close
        </div>
      </aside>
    </div>
  );
}
