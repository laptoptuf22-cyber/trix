import { Card, FULL_DECK, SUITS, Suit, rankOf, suitOf } from './cards';
import { Double, SEATS, Seat, ledSuit } from './rules';
import type { SeatView } from './game';

export interface PlayedInfo {
  card: Card;
  seat: Seat;
  /** 1-based trick number. */
  trick: number;
  /** True while the card is still face up in the current trick. */
  onTable: boolean;
}

export interface ShowOut {
  seat: Seat;
  suit: Suit;
  trick: number;
}

/** What one seat can know from its own cards and the table. Built from a SeatView only. */
export interface Knowledge {
  me: Seat;
  played: Map<Card, PlayedInfo>;
  mine: Set<Card>;
  /** Cards still with the other three players. */
  unseen: Set<Card>;
  unseenBySuit: number[];
  /** voids[seat][suit]: that seat is known to have no cards of the suit. */
  voids: boolean[][];
  showOuts: ShowOut[];
  /** Card → seat that won the (finished) trick it was in. */
  takenBy: Map<Card, Seat>;
  completedTricks: number;
}

export function analyze(view: SeatView): Knowledge {
  const played = new Map<Card, PlayedInfo>();
  const takenBy = new Map<Card, Seat>();
  view.tricks.forEach((t, i) => {
    for (const p of t.plays) {
      played.set(p.card, { card: p.card, seat: p.seat, trick: i + 1, onTable: false });
      takenBy.set(p.card, t.winner);
    }
  });
  for (const p of view.trick.plays) {
    played.set(p.card, { card: p.card, seat: p.seat, trick: view.tricks.length + 1, onTable: true });
  }

  const mine = new Set(view.hand);
  const unseen = new Set(FULL_DECK.filter((c) => !played.has(c) && !mine.has(c)));
  const unseenBySuit = SUITS.map((s) => [...unseen].filter((c) => suitOf(c) === s).length);

  // A player who did not follow the suit led has none of that suit left.
  const voids = SEATS.map(() => SUITS.map(() => false));
  const showOuts: ShowOut[] = [];
  [...view.tricks, view.trick].forEach((t, i) => {
    const led = ledSuit(t);
    if (led === null) return;
    for (const p of t.plays) {
      if (suitOf(p.card) !== led && !voids[p.seat][led]) {
        voids[p.seat][led] = true;
        showOuts.push({ seat: p.seat, suit: led, trick: i + 1 });
      }
    }
  });
  // If every card of a suit is accounted for, nobody else can have one.
  for (const s of SUITS) {
    if (unseenBySuit[s] === 0) for (const seat of SEATS) if (seat !== view.seat) voids[seat][s] = true;
  }

  return { me: view.seat, played, mine, unseen, unseenBySuit, voids, showOuts, takenBy, completedTricks: view.tricks.length };
}

/** How many cards of the same suit, higher than this one, are still with the other players. */
export function higherUnseen(k: Knowledge, card: Card): number {
  let n = 0;
  for (const u of k.unseen) if (suitOf(u) === suitOf(card) && rankOf(u) > rankOf(card)) n++;
  return n;
}

/** Seats that could be holding a card the player cannot see. */
export function possibleHolders(k: Knowledge, card: Card, doubles: readonly Double[]): Seat[] {
  if (!k.unseen.has(card)) return [];
  const doubled = doubles.find((d) => d.card === card);
  if (doubled) return [doubled.seat];
  return SEATS.filter((s) => s !== k.me && !k.voids[s][suitOf(card)]);
}
