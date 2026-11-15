"use client";

import { SECTORS } from "@/game/content";
import type { EconomyState } from "@/game/economy";
import { capacityOf, pricePerDust } from "@/game/economy";
import { formatDust, money } from "@/game/format";
import type { WorldStatus } from "@/three/world";

interface HudProps {
  eco: EconomyState;
  status: WorldStatus;
  onSell: () => void;
  onOpenShop: () => void;
  onOpenHelp: () => void;
  onReset: () => void;
}

export default function Hud({
  eco,
  status,
  onSell,
  onOpenShop,
  onOpenHelp,
  onReset,
}: HudProps) {
  const sector = SECTORS[eco.sectorId];
  const clears = eco.clearCounts[eco.sectorId] ?? 0;
  const bagFull = status.carried >= status.capacity - 0.5;
  const loadPct = Math.min(
    100,
    (status.carried / Math.max(1, status.capacity)) * 100,
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-orange-300/15 bg-[#140b07]/80 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur">
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-orange-300 via-orange-600 to-red-900 shadow-[0_0_18px_rgba(249,115,22,0.5)]">
              <span className="absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-black/25" />
              <span className="absolute right-2 top-3.5 h-1.5 w-1 rounded-full bg-black/25" />
              <span className="absolute bottom-1.5 left-2.5 h-1 w-1.5 rounded-full bg-black/20" />
            </div>
            <div>
              <p className="text-sm font-black leading-none tracking-[0.12em] text-stone-50">
                MARS <span className="text-orange-400">SWEEPERS</span>
              </p>
              <p className="mt-1 text-[8px] uppercase tracking-[0.32em] text-orange-200/60">
                Regolith Division
              </p>
            </div>
          </div>

          <div className="w-[min(78vw,290px)] rounded-2xl border border-white/10 bg-[#140b07]/75 p-3 shadow-lg shadow-black/25 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-100">
                  {sector.name}
                </p>
                <p className="truncate text-[10px] text-stone-400">
                  {sector.blurb}
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-stone-300">
                ×{sector.value}
              </div>
            </div>

            <div className="mt-2.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-stone-400">Sector swept</span>
                <span className="tabular-nums text-stone-200">
                  {Math.round(status.coverage * 100)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-200 transition-[width] duration-200"
                  style={{ width: `${status.coverage * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-500">
                <span>
                  {formatDust(status.remaining)} dust left ·{" "}
                  {formatDust(status.initialDust)} at landing
                </span>
                {clears > 0 && (
                  <span className="text-emerald-300">Cleared ×{clears}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-[#140b07]/80 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-stone-500">
                Credits
              </p>
              <p className="text-lg font-semibold leading-tight tabular-nums text-orange-100">
                {money(eco.credits)}
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-stone-500">
                Dust price
              </p>
              <p className="text-sm font-medium tabular-nums text-stone-200">
                {money(pricePerDust(eco))}/u
              </p>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenShop}
              className="rounded-xl border border-orange-300/30 bg-orange-500/15 px-3 py-1.5 text-[11px] font-semibold text-orange-200 backdrop-blur transition hover:bg-orange-500/25"
            >
              Shop <span className="opacity-50">B</span>
            </button>
            <button
              type="button"
              onClick={onOpenHelp}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-stone-300 backdrop-blur transition hover:bg-white/10"
            >
              Help
            </button>
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset mission"
              title="Reset mission"
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-stone-400 backdrop-blur transition hover:bg-red-500/10 hover:text-red-300"
            >
              ↺
            </button>
          </div>

          <div className="hidden rounded-xl border border-white/10 bg-[#140b07]/70 px-3 py-1.5 text-[10px] text-stone-400 backdrop-blur sm:block">
            🛸 {status.drones} drone{status.drones === 1 ? "" : "s"}
            {status.drones > 0 && status.capsules > 0 && (
              <span className="text-violet-300">
                {" "}
                · {status.capsules} capsule
                {status.capsules === 1 ? "" : "s"} inbound
              </span>
            )}
            {" "}· Bag {formatDust(capacityOf(eco))}
          </div>
        </div>
      </div>

      {/* Crosshair */}
      {status.active && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className={[
              "h-5 w-5 rounded-full border transition-all duration-150",
              bagFull
                ? "border-red-400/70"
                : status.sweeping
                  ? "border-amber-200/90"
                  : "border-white/45",
            ].join(" ")}
          >
            <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="mt-auto flex flex-col items-center gap-2 p-3 sm:p-5">
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-[#140b07]/85 px-3 py-2.5 shadow-xl shadow-black/40 backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-medium text-stone-300">
                Cargo bay{" "}
                <span className="text-stone-500">
                  {formatDust(status.carried)} / {formatDust(status.capacity)}
                </span>
              </span>
              <span className={bagFull ? "text-red-300" : "text-stone-500"}>
                {bagFull
                  ? "FULL — sell at the depot"
                  : `${formatDust(Math.max(0, status.capacity - status.carried))} free`}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/50">
              <div
                className={[
                  "h-full rounded-full transition-[width] duration-150",
                  bagFull
                    ? "bg-gradient-to-r from-red-500 to-rose-400"
                    : "bg-gradient-to-r from-orange-500 to-amber-300",
                ].join(" ")}
                style={{ width: `${loadPct}%` }}
              />
            </div>
          </div>

          {status.inRange ? (
            <button
              type="button"
              onClick={onSell}
              disabled={status.carried < 1}
              className={[
                "shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition",
                status.carried >= 1
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-300 text-stone-950 hover:from-cyan-300 hover:to-emerald-200"
                  : "cursor-not-allowed bg-white/5 text-stone-500",
                bagFull && status.carried >= 1 ? "sell-ready" : "",
              ].join(" ")}
            >
              Sell load <span className="ml-1 opacity-60">E</span>
            </button>
          ) : (
            <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-stone-500">
                Depot
              </p>
              <p className="text-sm font-semibold tabular-nums text-cyan-200">
                {Math.round(status.depotDistance)}m ↗
              </p>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 rounded-full border border-white/5 bg-black/30 px-3 py-1 text-[10px] text-stone-400 backdrop-blur sm:flex">
          <span>
            <b className="text-stone-300">WASD</b> move
          </span>
          <span className="text-stone-700">·</span>
          <span>
            <b className="text-stone-300">Drag</b> or arrows to look
          </span>
          <span className="text-stone-700">·</span>
          <span>
            <b className="text-stone-300">Hold LMB / Space</b> sweep
          </span>
          <span className="text-stone-700">·</span>
          <span>
            <b className="text-stone-300">Shift</b> sprint
          </span>
          <span className="text-stone-700">·</span>
          <span>
            <b className="text-stone-300">E</b> sell
          </span>
        </div>
      </div>
    </div>
  );
}
