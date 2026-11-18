import { Card, DIAMONDS, KING_OF_HEARTS, QUEENS, Suit, rankOf, suitOf } from './cards';

/**
 * Seats around the table, seen from the player:
 * 0 = you (bottom), 1 = right opponent, 2 = partner (top), 3 = left opponent.
 * Play goes counter-clockwise (to the right): 0 → 1 → 2 → 3 → 0.
 */
export type Seat = 0 | 1 | 2 | 3;
export const SEATS: readonly Seat[] = [0, 1, 2, 3];
export const YOU: Seat = 0;
export const RIGHT: Seat = 1;
export const PARTNER: Seat = 2;
export const LEFT: Seat = 3;

/** Team 0 = you and your partner, team 1 = the two opponents. */
export type Team = 0 | 1;
export const teamOf = (seat: Seat): Team => (seat % 2) as Team;
export const nextSeat = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;

export type Contract = 'king' | 'queens' | 'diamonds' | 'tricks';
export const CONTRACTS: readonly Contract[] = ['king', 'queens', 'diamonds', 'tricks'];

export interface Play {
  seat: Seat;
  card: Card;
}
export interface Trick {
  leader: Seat;
  plays: Play[];
}
export interface CompletedTrick extends Trick {
  winner: Seat;
}
export interface Double {
  seat: Seat;
  card: Card;
}

export const ledSuit = (trick: Trick): Suit | null => (trick.plays.length ? suitOf(trick.plays[0].card) : null);

/** You must follow the suit that was led if you can; otherwise any card. */
export function legalCards(hand: readonly Card[], trick: Trick): Card[] {
  const led = ledSuit(trick);
  if (led === null) return [...hand];
  const follow = hand.filter((c) => suitOf(c) === led);
  return follow.length ? follow : [...hand];
}

/** The play currently winning the trick: the highest card of the suit led. */
export function winningPlay(trick: Trick): Play | null {
  const led = ledSuit(trick);
  if (led === null) return null;
  let best = trick.plays[0];
  for (const p of trick.plays) {
    if (suitOf(p.card) === led && rankOf(p.card) > rankOf(best.card)) best = p;
  }
  return best;
}

export const contractHasDoubling = (contract: Contract): boolean => contract === 'king' || contract === 'queens';

export const canDouble = (contract: Contract, card: Card): boolean =>
  (contract === 'king' && card === KING_OF_HEARTS) || (contract === 'queens' && QUEENS.includes(card));

const cardsIn = (tricks: readonly Trick[]): Card[] => tricks.flatMap((t) => t.plays.map((p) => p.card));

/**
 * King of Hearts ends when the K♥ is taken, Queens when all 4 queens are taken,
 * Diamonds when all 13 diamonds are taken, Tricks after all 13 tricks.
 */
export function isHandOver(contract: Contract, tricks: readonly CompletedTrick[]): boolean {
  if (tricks.length >= 13) return true;
  const taken = cardsIn(tricks);
  switch (contract) {
    case 'king':
      return taken.includes(KING_OF_HEARTS);
    case 'queens':
      return QUEENS.every((q) => taken.includes(q));
    case 'diamonds':
      return taken.filter((c) => suitOf(c) === DIAMONDS).length === 13;
    case 'tricks':
      return false;
  }
}

// ---------- Scoring ----------
export const POINTS = { king: 75, queen: 25, diamond: 10, trick: 15 } as const;

export type ScoreItem =
  | { kind: 'king' | 'queen'; card: Card; taker: Seat; doubledBy: Seat | null; team: Team; points: number }
  | { kind: 'bonus'; card: Card; doubledBy: Seat; team: Team; points: number }
  | { kind: 'diamonds' | 'tricks'; team: Team; count: number; points: number };

export interface HandScore {
  items: ScoreItem[];
  /** Points for [your team, other team]. */
  totals: [number, number];
}

/**
 * Team scoring with doubling:
 * - The team that takes the K♥ loses 75 (150 if it was doubled). A queen costs 25 (50 if doubled).
 * - The doubling team gets +75 / +25 only when the OTHER team takes the card.
 * - If your own team takes a card that you or your partner doubled, your team only loses points.
 */
export function scoreHand(contract: Contract, tricks: readonly CompletedTrick[], doubles: readonly Double[]): HandScore {
  const items: ScoreItem[] = [];
  const doublerOf = (card: Card): Seat | null => doubles.find((d) => d.card === card)?.seat ?? null;
  const takerOf = (card: Card): Seat | null => tricks.find((t) => t.plays.some((p) => p.card === card))?.winner ?? null;

  const scoreDoubleable = (card: Card, kind: 'king' | 'queen', base: number) => {
    const taker = takerOf(card);
    if (taker === null) return;
    const doubledBy = doublerOf(card);
    const team = teamOf(taker);
    items.push({ kind, card, taker, doubledBy, team, points: -(doubledBy === null ? base : base * 2) });
    if (doubledBy !== null && teamOf(doubledBy) !== team) {
      items.push({ kind: 'bonus', card, doubledBy, team: teamOf(doubledBy), points: base });
    }
  };

  switch (contract) {
    case 'king':
      scoreDoubleable(KING_OF_HEARTS, 'king', POINTS.king);
      break;
    case 'queens':
      QUEENS.forEach((q) => scoreDoubleable(q, 'queen', POINTS.queen));
      break;
    case 'diamonds':
      for (const team of [0, 1] as const) {
        const count = cardsIn(tricks.filter((t) => teamOf(t.winner) === team)).filter((c) => suitOf(c) === DIAMONDS).length;
        if (count) items.push({ kind: 'diamonds', team, count, points: -count * POINTS.diamond });
      }
      break;
    case 'tricks':
      for (const team of [0, 1] as const) {
        const count = tricks.filter((t) => teamOf(t.winner) === team).length;
        if (count) items.push({ kind: 'tricks', team, count, points: -count * POINTS.trick });
      }
      break;
  }

  const totals: [number, number] = [0, 0];
  for (const item of items) totals[item.team] += item.points;
  return { items, totals };
}
