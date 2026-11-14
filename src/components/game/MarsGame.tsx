"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { SECTORS, SECTOR_LIST } from "@/game/content";
import type { SectorId } from "@/game/content";
import {
  bagCost,
  capacityOf,
  createInitialEconomy,
  droneCost,
  economyReducer,
  magnetCost,
  marketCost,
  nextTool,
  powerOf,
  pricePerDust,
} from "@/game/economy";
import { money } from "@/game/format";
import type { World, WorldStatus } from "@/three/world";
import Hud from "./Hud";
import Modal from "./Modal";
import Shop from "./Shop";

interface Toast {
  id: number;
  text: string;
}

const EMPTY_STATUS: WorldStatus = {
  carried: 0,
  capacity: 80,
  remaining: 0,
  initialDust: 0,
  coverage: 0,
  depotDistance: 24,
  inRange: false,
  active: false,
  sweeping: false,
  drones: 0,
};

export default function MarsGame() {
  const [eco, dispatch] = useReducer(
    economyReducer,
    undefined,
    createInitialEconomy,
  );

  const ecoRef = useRef(eco);
  useEffect(() => {
    ecoRef.current = eco;
  }, [eco]);

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const [worldReady, setWorldReady] = useState(false);
  const [status, setStatus] = useState<WorldStatus>(EMPTY_STATUS);

  const [shopOpen, setShopOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [victoryDismissed, setVictoryDismissed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const toastId = useRef(0);
  const bannerTimer = useRef<number | null>(null);

  const notify = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((current) => [...current.slice(-3), { id, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  /* -------------------------------------------------------------- */
  /* 3D world                                                        */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    let world: World | null = null;

    import("@/three/world").then(({ createWorld }) => {
      if (cancelled || !containerRef.current) return;

      world = createWorld(containerRef.current, {
        onCleared: () => {
          const sector = SECTORS[ecoRef.current.sectorId];
          dispatch({ type: "clear", sectorId: sector.id });
          setBanner(`${sector.name} cleared — storm bonus paid`);
          if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
          bannerTimer.current = window.setTimeout(() => setBanner(null), 3400);
        },
      });

      const state = ecoRef.current;
      world.configure({
        sector: SECTORS[state.sectorId],
        toolIndex: state.toolIndex,
        power: powerOf(state),
        capacity: capacityOf(state),
        droneCount: state.droneCount,
      });
      worldRef.current = world;
      setWorldReady(true);
    });

    return () => {
      cancelled = true;
      world?.dispose();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    if (!world || !worldReady) return;
    world.configure({
      sector: SECTORS[eco.sectorId],
      toolIndex: eco.toolIndex,
      power: powerOf(eco),
      capacity: capacityOf(eco),
      droneCount: eco.droneCount,
    });
  }, [worldReady, eco]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const world = worldRef.current;
      if (world) setStatus(world.getStatus());
    }, 150);
    return () => window.clearInterval(id);
  }, []);

  /* -------------------------------------------------------------- */
  /* Actions                                                         */
  /* -------------------------------------------------------------- */

  const sellLoad = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const snapshot = world.getStatus();
    if (!snapshot.inRange) {
      notify("Walk to the depot beacon to sell your load.");
      return;
    }
    const amount = world.sell();
    if (amount <= 0) {
      notify("Your cargo bay is empty. Go sweep something.");
      return;
    }
    const value = Math.floor(amount * pricePerDust(ecoRef.current));
    dispatch({ type: "sell", amount });
    notify(`Sold ${amount} regolith for ${money(value)}.`);
  }, [notify]);

  const closeShop = useCallback(() => {
    setShopOpen(false);
  }, []);

  const openShop = useCallback(() => {
    setShopOpen(true);
    setHelpOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.code === "KeyB") {
        event.preventDefault();
        if (shopOpen) closeShop();
        else openShop();
      } else if (event.code === "KeyE") {
        sellLoad();
      } else if (event.code === "KeyH") {
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shopOpen, closeShop, openShop, sellLoad]);

  const buyTool = () => {
    const state = ecoRef.current;
    const tool = nextTool(state);
    if (!tool) return;
    if (state.credits < tool.cost) {
      notify(`Need ${money(tool.cost)} for the ${tool.name}.`);
      return;
    }
    dispatch({ type: "buy-tool" });
    notify(`${tool.name} equipped. Happy sweeping.`);
  };

  const buyBag = () => {
    const state = ecoRef.current;
    const cost = bagCost(state);
    if (state.credits < cost) return notify(`Need ${money(cost)} for a bigger cargo bay.`);
    dispatch({ type: "buy-bag" });
    notify(`Cargo bay expanded to ${capacityOf(state) + 50}.`);
  };

  const buyMagnet = () => {
    const state = ecoRef.current;
    const cost = magnetCost(state);
    if (state.credits < cost) return notify(`Need ${money(cost)} to charge the magnet.`);
    dispatch({ type: "buy-magnet" });
    notify("Dust magnet charged. Sweeps pull harder.");
  };

  const buyMarket = () => {
    const state = ecoRef.current;
    const cost = marketCost(state);
    if (state.credits < cost) return notify(`Need ${money(cost)} for a new contract.`);
    dispatch({ type: "buy-market" });
    notify("Contract signed. Dust prices up 10%.");
  };

  const buyDrone = () => {
    const state = ecoRef.current;
    const cost = droneCost(state);
    if (state.credits < cost) return notify(`Need ${money(cost)} to deploy a drone.`);
    dispatch({ type: "buy-drone" });
    notify(`Sweeper drone #${state.droneCount + 1} is online.`);
  };

  const unlockSector = (id: SectorId) => {
    const state = ecoRef.current;
    const def = SECTORS[id];
    if (state.unlocked.includes(id)) return;
    if (state.credits < def.unlockCost) {
      return notify(`Need ${money(def.unlockCost)} for a flight to ${def.name}.`);
    }
    dispatch({ type: "unlock-sector", id });
    notify(`Touchdown at ${def.name}. New dust field unlocked.`);
  };

  const travel = (id: SectorId) => {
    if (ecoRef.current.sectorId === id) return;
    dispatch({ type: "travel", id });
    notify(`${SECTORS[id].name} dust field active.`);
  };

  const handleReset = () => {
    dispatch({ type: "reset" });
    worldRef.current?.resetSector();
    setResetOpen(false);
    setVictoryDismissed(false);
    notify("Fresh drop. One toothbrush, one planet.");
  };

  const startGame = () => {
    dispatch({ type: "dismiss-tutorial" });
  };

  const dismissHelp = () => {
    setHelpOpen(false);
  };

  const introOpen = !eco.tutorialSeen;
  const allCleared = SECTOR_LIST.every(
    (sector) => (eco.clearCounts[sector.id] ?? 0) > 0,
  );
  const victoryOpen = allCleared && !victoryDismissed;
  const modalOpen = introOpen || shopOpen || helpOpen || resetOpen || victoryOpen;

  useEffect(() => {
    worldRef.current?.setInputEnabled(!modalOpen);
  }, [modalOpen, worldReady]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#150a06] text-stone-100">
      <div ref={containerRef} className="absolute inset-0" />

      <Hud
        eco={eco}
        status={status}
        onSell={sellLoad}
        onOpenShop={openShop}
        onOpenHelp={() => {
          setHelpOpen(true);
        }}
        onReset={() => {
          setResetOpen(true);
        }}
      />

      {shopOpen && (
        <Shop
          open={shopOpen}
          eco={eco}
          onClose={closeShop}
          onBuyTool={buyTool}
          onBuyBag={buyBag}
          onBuyMagnet={buyMagnet}
          onBuyMarket={buyMarket}
          onBuyDrone={buyDrone}
          onUnlockSector={unlockSector}
          onTravel={travel}
        />
      )}

      {/* Mission banner */}
      {banner && (
        <div className="pointer-events-none fixed left-1/2 top-5 z-30 -translate-x-1/2">
          <div className="banner-in rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-5 py-2.5 text-center backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-200/80">
              Dust storm bonus
            </p>
            <p className="text-sm font-semibold text-emerald-100">{banner}</p>
          </div>
        </div>
      )}

      {/* Intro */}
      <Modal open={introOpen} onClose={startGame} labelledBy="intro-title">
        <div className="text-[10px] uppercase tracking-[0.3em] text-orange-300/80">
          Mission briefing
        </div>
        <h2 id="intro-title" className="mt-2 text-2xl font-bold text-stone-50">
          Clean Mars. Get rich. Repeat.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-300">
          It&apos;s Sol 1. The Regolith Division issued you one toothbrush, an
          empty cargo bay, and an extremely optimistic quota. Walk out into the
          dust, sweep it up, and haul it back to the depot. Reinvest. Repeat
          until the red planet shines.
        </p>
        <ul className="mt-4 space-y-2.5 text-sm text-stone-300">
          <li className="flex gap-3">
            <span aria-hidden="true">🖱️</span>
            <span>
              <b className="text-stone-100">Drag the mouse</b> (or use the{" "}
              <b className="text-stone-100">arrow keys</b>) to look around. No
              cursor lock, no clicking to focus.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">🥾</span>
            <span>
              <b className="text-stone-100">WASD</b> walks the dunes,{" "}
              <b className="text-stone-100">Shift</b> sprints.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">🧹</span>
            <span>
              <b className="text-stone-100">Hold left mouse</b> or{" "}
              <b className="text-stone-100">Space</b> to sweep the dust inside
              the aim ring.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">🛰️</span>
            <span>
              <b className="text-stone-100">Walk to the depot</b> beacon and
              press <b className="text-stone-100">E</b> to sell.{" "}
              <b className="text-stone-100">B</b> opens the shop.
            </span>
          </li>
        </ul>
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-stone-400">
          Desktop keyboard and mouse recommended. Everything works without
          pointer lock.
        </p>
        <button
          type="button"
          onClick={startGame}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:from-orange-400 hover:to-amber-300"
        >
          Start sweeping
        </button>
      </Modal>

      {/* Help */}
      <Modal open={helpOpen} onClose={dismissHelp} labelledBy="help-title">
        <h2 id="help-title" className="text-xl font-bold text-stone-50">
          Field manual
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-300">
          <p>
            Aim the ring at red dust and hold left mouse (or{" "}
            <b className="text-stone-100">Space</b>) to sweep. Drag the mouse or
            use the <b className="text-stone-100">arrow keys</b> to look. When
            your cargo bay is full, walk to the glowing depot beacon and press{" "}
            <b className="text-stone-100">E</b>.
          </p>
          <p>
            Credits buy bigger tools, cargo bays, dust magnets, market
            contracts, and autonomous sweeper drones. Clear every patch in a
            sector to trigger a storm bonus.
          </p>
          <p className="text-stone-400">
            Press <b className="text-stone-200">B</b> for the shop,{" "}
            <b className="text-stone-200">Shift</b> to sprint, and{" "}
            <b className="text-stone-200">H</b> for this manual.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-stone-400">
          <div className="rounded-lg bg-white/5 p-2">
            👣 <b className="text-stone-200">WASD</b> — move
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            🖱️ <b className="text-stone-200">Drag</b> / arrows — look
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            🧹 <b className="text-stone-200">LMB / Space</b> — sweep
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            💰 <b className="text-stone-200">E</b> — sell at depot
          </div>
        </div>
        <button
          type="button"
          onClick={dismissHelp}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:from-orange-400 hover:to-amber-300"
        >
          Back to Mars
        </button>
      </Modal>

      {/* Victory */}
      <Modal
        open={victoryOpen}
        onClose={() => {
          setVictoryDismissed(true);
        }}
        labelledBy="victory-title"
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
          Mission complete
        </div>
        <h2 id="victory-title" className="mt-2 text-2xl font-bold text-stone-50">
          Every sector, spotless.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-300">
          Landing Site, Jezero, Valles Marineris, Olympus Mons, Hellas Basin —
          all swept clean at least once. The Regolith Division has stopped
          sending strongly worded memos. Mars winds will keep bringing dust, so
          the empire is yours to grow.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="hud-label">Lifetime credits</p>
            <p className="text-lg font-semibold text-amber-200">
              {money(eco.totalEarned)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="hud-label">Dust delivered</p>
            <p className="text-lg font-semibold text-amber-200">
              {Math.floor(eco.totalSwept).toLocaleString("en-US")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVictoryDismissed(true);
          }}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:from-orange-400 hover:to-amber-300"
        >
          Keep sweeping
        </button>
      </Modal>

      {/* Reset */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        labelledBy="reset-title"
      >
        <h2 id="reset-title" className="text-xl font-bold text-stone-50">
          Reset the mission?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-300">
          This wipes your credits, tools, drones, and every sector. There is no
          undo — the dust will win.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setResetOpen(false)}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-stone-200 transition hover:bg-white/10"
          >
            Keep sweeping
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Reset
          </button>
        </div>
      </Modal>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-24 right-3 z-40 flex w-[min(88vw,320px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-in rounded-xl border border-orange-400/25 bg-[#1a0f0a]/95 px-3 py-2 text-xs text-stone-200 shadow-lg shadow-black/40"
          >
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}
