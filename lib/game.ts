import { Card, Rng, deal } from './cards';
import {
  CompletedTrick,
  Contract,
  Double,
  Seat,
  Trick,
  canDouble,
  contractHasDoubling,
  isHandOver,
  legalCards,
  winningPlay,
} from './rules';

/**
 * doubling → playing ⇄ trickEnd → over
 * "trickEnd" means the 4th card is down and the trick is still on the table.
 */
export type Phase = 'doubling' | 'playing' | 'trickEnd' | 'over';

export interface HandState {
  contract: Contract;
  initialHands: Card[][];
  hands: Card[][];
  doubles: Double[];
  firstLeader: Seat;
  tricks: CompletedTrick[];
  trick: Trick;
  phase: Phase;
}

export function newHand(contract: Contract, rng: Rng): HandState {
  const hands = deal(rng);
  const firstLeader = Math.floor(rng() * 4) as Seat;
  return {
    contract,
    initialHands: hands.map((h) => [...h]),
    hands,
    doubles: [],
    firstLeader,
    tricks: [],
    trick: { leader: firstLeader, plays: [] },
    phase: contractHasDoubling(contract) ? 'doubling' : 'playing',
  };
}

export const doubleableCards = (state: HandState, seat: Seat): Card[] =>
  state.hands[seat].filter((c) => canDouble(state.contract, c));

export function applyDoubles(state: HandState, doubles: readonly Double[]): HandState {
  if (state.phase !== 'doubling') throw new Error('Not in the doubling phase');
  for (const d of doubles) {
    if (!state.hands[d.seat].includes(d.card) || !canDouble(state.contract, d.card)) {
      throw new Error('Invalid double');
    }
  }
  return { ...state, doubles: [...doubles], phase: 'playing' };
}

export const turnOf = (state: HandState): Seat => ((state.trick.leader + state.trick.plays.length) % 4) as Seat;

export function playCard(state: HandState, card: Card): HandState {
  if (state.phase !== 'playing') throw new Error('Cannot play now');
  const seat = turnOf(state);
  if (!legalCards(state.hands[seat], state.trick).includes(card)) throw new Error('Illegal card');
  const hands = state.hands.map((h, i) => (i === seat ? h.filter((c) => c !== card) : h));
  const trick: Trick = { leader: state.trick.leader, plays: [...state.trick.plays, { seat, card }] };
  return { ...state, hands, trick, phase: trick.plays.length === 4 ? 'trickEnd' : 'playing' };
}

/** Turns the finished trick face down and gives it to its winner. */
export function collectTrick(state: HandState): HandState {
  if (state.phase !== 'trickEnd') throw new Error('No finished trick to collect');
  const winner = winningPlay(state.trick)!.seat;
  const tricks = [...state.tricks, { ...state.trick, winner }];
  const over = isHandOver(state.contract, tricks);
  return { ...state, tricks, trick: { leader: winner, plays: [] }, phase: over ? 'over' : 'playing' };
}

/**
 * Everything one seat is allowed to know: its own cards plus what happened on the table.
 * Computer players and the question engine only ever see this, never the other hands.
 */
export interface SeatView {
  seat: Seat;
  contract: Contract;
  hand: Card[];
  doubles: Double[];
  tricks: CompletedTrick[];
  trick: Trick;
}

export const viewFor = (state: HandState, seat: Seat): SeatView => ({
  seat,
  contract: state.contract,
  hand: [...state.hands[seat]],
  doubles: state.doubles.map((d) => ({ ...d })),
  tricks: state.tricks.map((t) => ({ ...t, plays: [...t.plays] })),
  trick: { ...state.trick, plays: [...state.trick.plays] },
});
