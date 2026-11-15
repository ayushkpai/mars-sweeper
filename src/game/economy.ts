import {
  BAG_BASE,
  BAG_STEP,
  BASE_PRICE,
  SECTORS,
  TOOLS,
} from "./content";
import type { SectorId } from "./content";

export interface EconomyState {
  credits: number;
  toolIndex: number;
  bagLevel: number;
  magnetLevel: number;
  marketLevel: number;
  droneCount: number;
  sectorId: SectorId;
  unlocked: SectorId[];
  clearCounts: Partial<Record<SectorId, number>>;
  totalEarned: number;
  totalSwept: number;
  droneEarned: number;
  tutorialSeen: boolean;
}

export type EconomyAction =
  | { type: "sell"; amount: number }
  | { type: "drone-delivery"; dust: number }
  | { type: "clear"; sectorId: SectorId }
  | { type: "buy-tool" }
  | { type: "buy-bag" }
  | { type: "buy-magnet" }
  | { type: "buy-market" }
  | { type: "buy-drone" }
  | { type: "unlock-sector"; id: SectorId }
  | { type: "travel"; id: SectorId }
  | { type: "dismiss-tutorial" }
  | { type: "reset" };

export function createInitialEconomy(): EconomyState {
  return {
    credits: 0,
    toolIndex: 0,
    bagLevel: 0,
    magnetLevel: 0,
    marketLevel: 0,
    droneCount: 0,
    sectorId: "landing",
    unlocked: ["landing"],
    clearCounts: {},
    totalEarned: 0,
    totalSwept: 0,
    droneEarned: 0,
    tutorialSeen: false,
  };
}

export const currentTool = (state: EconomyState) =>
  TOOLS[Math.min(state.toolIndex, TOOLS.length - 1)];

export const nextTool = (state: EconomyState) =>
  state.toolIndex + 1 < TOOLS.length ? TOOLS[state.toolIndex + 1] : null;

export const capacityOf = (state: EconomyState) =>
  BAG_BASE + BAG_STEP * state.bagLevel;

export const magnetMult = (state: EconomyState) =>
  1 + 0.15 * state.magnetLevel;

export const marketMult = (state: EconomyState) =>
  1 + 0.1 * state.marketLevel;

export const powerOf = (state: EconomyState) =>
  currentTool(state).power * magnetMult(state);

export const bagCost = (state: EconomyState) =>
  Math.round(100 * Math.pow(1.7, state.bagLevel));

export const magnetCost = (state: EconomyState) =>
  Math.round(300 * Math.pow(2, state.magnetLevel));

export const marketCost = (state: EconomyState) =>
  Math.round(500 * Math.pow(2.1, state.marketLevel));

export const droneCost = (state: EconomyState) =>
  Math.round(400 * Math.pow(1.9, state.droneCount));

export const pricePerDust = (
  state: EconomyState,
  sectorId: SectorId = state.sectorId,
) => BASE_PRICE * SECTORS[sectorId].value * marketMult(state);

function spend(state: EconomyState, cost: number): EconomyState | null {
  if (state.credits < cost) return null;
  return { ...state, credits: state.credits - cost };
}

export function economyReducer(
  state: EconomyState,
  action: EconomyAction,
): EconomyState {
  switch (action.type) {
    case "sell": {
      if (action.amount < 0.5) return state;
      const value = Math.floor(action.amount * pricePerDust(state));
      return {
        ...state,
        credits: state.credits + value,
        totalEarned: state.totalEarned + value,
        totalSwept: state.totalSwept + action.amount,
      };
    }
    case "drone-delivery": {
      if (action.dust <= 0) return state;
      const value = Math.floor(action.dust * pricePerDust(state));
      return {
        ...state,
        credits: state.credits + value,
        totalEarned: state.totalEarned + value,
        totalSwept: state.totalSwept + action.dust,
        droneEarned: state.droneEarned + value,
      };
    }
    case "clear": {
      const sector = SECTORS[action.sectorId];
      const count = state.clearCounts[action.sectorId] ?? 0;
      const bonus = Math.round(
        sector.dustUnits *
          BASE_PRICE *
          sector.value *
          marketMult(state) *
          (0.2 + Math.min(0.2, count * 0.02)),
      );
      return {
        ...state,
        credits: state.credits + bonus,
        totalEarned: state.totalEarned + bonus,
        clearCounts: { ...state.clearCounts, [action.sectorId]: count + 1 },
      };
    }
    case "buy-tool": {
      const tool = nextTool(state);
      if (!tool) return state;
      const paid = spend(state, tool.cost);
      return paid ? { ...paid, toolIndex: paid.toolIndex + 1 } : state;
    }
    case "buy-bag": {
      const paid = spend(state, bagCost(state));
      return paid ? { ...paid, bagLevel: paid.bagLevel + 1 } : state;
    }
    case "buy-magnet": {
      const paid = spend(state, magnetCost(state));
      return paid ? { ...paid, magnetLevel: paid.magnetLevel + 1 } : state;
    }
    case "buy-market": {
      const paid = spend(state, marketCost(state));
      return paid ? { ...paid, marketLevel: paid.marketLevel + 1 } : state;
    }
    case "buy-drone": {
      const paid = spend(state, droneCost(state));
      return paid ? { ...paid, droneCount: paid.droneCount + 1 } : state;
    }
    case "unlock-sector": {
      if (state.unlocked.includes(action.id)) return state;
      const def = SECTORS[action.id];
      const paid = spend(state, def.unlockCost);
      if (!paid) return state;
      return {
        ...paid,
        sectorId: action.id,
        unlocked: [...paid.unlocked, action.id],
      };
    }
    case "travel": {
      if (!state.unlocked.includes(action.id)) return state;
      return { ...state, sectorId: action.id };
    }
    case "dismiss-tutorial":
      return { ...state, tutorialSeen: true };
    case "reset":
      return createInitialEconomy();
    default:
      return state;
  }
}


