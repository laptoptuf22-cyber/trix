import { Card, DIAMONDS, HEARTS, KING_OF_HEARTS, QUEENS, Rng, SUITS, Suit, makeCard, rankOf, suitOf } from './cards';
import { Contract, Double, Seat, canDouble, legalCards, teamOf, winningPlay } from './rules';
import type { HandState, SeatView } from './game';
import { Knowledge, analyze, higherUnseen } from './tracker';

/*
 * Computer players. They play as a team: penalty cards go to the other team when possible
 * and are kept away from their partner. They only ever see a SeatView (own hand + table).
 */

/** How many points a card costs the team that ends up taking it. */
function penaltyOf(contract: Contract, card: Card, doubles: readonly Double[]): number {
  const doubled = doubles.some((d) => d.card === card);
  switch (contract) {
    case 'king':
      return card === KING_OF_HEARTS ? (doubled ? 150 : 75) : 0;
    case 'queens':
      return QUEENS.includes(card) ? (doubled ? 50 : 25) : 0;
    case 'diamonds':
      return suitOf(card) === DIAMONDS ? 10 : 0;
    case 'tricks':
      return 0;
  }
}

function best(cards: readonly Card[], score: (c: Card) => number): Card {
  let top = cards[0];
  let topScore = score(top);
  for (const c of cards.slice(1)) {
    const s = score(c);
    if (s > topScore) {
      top = c;
      topScore = s;
    }
  }
  return top;
}
const highest = (cards: readonly Card[]) => best(cards, rankOf);
const lowest = (cards: readonly Card[]) => best(cards, (c) => -rankOf(c));

const countSuit = (hand: readonly Card[], suit: Suit) => hand.filter((c) => suitOf(c) === suit).length;

/** Decide which of its cards a computer player doubles at the start of the hand. */
export function botDoubles(hand: readonly Card[], contract: Contract, rng: Rng): Card[] {
  return hand
    .filter((c) => canDouble(contract, c))
    .filter((c) => {
      const suit = suitOf(c);
      const n = countSuit(hand, suit);
      if (contract === 'king') {
        // Enough hearts to duck under heart leads, and a short suit to throw the K♥ on later.
        const shortSuit = SUITS.some((s) => s !== HEARTS && countSuit(hand, s) <= 2);
        return (n >= 5 || (n >= 4 && shortSuit)) && rng() < 0.85;
      }
      const hasAce = hand.includes(makeCard(suit, 14));
      const hasKing = hand.includes(makeCard(suit, 13));
      return (n >= 5 || (n >= 4 && !(hasAce && hasKing))) && rng() < 0.8;
    });
}

export function collectBotDoubles(state: HandState, seats: readonly Seat[], rng: Rng): Double[] {
  return seats.flatMap((seat) => botDoubles(state.hands[seat], state.contract, rng).map((card) => ({ seat, card })));
}

/** Choose a card to play. Uses only the seat's own view of the hand. */
export function botPlay(view: SeatView, rng: Rng): Card {
  const legal = legalCards(view.hand, view.trick);
  if (legal.length === 1) return legal[0];
  const k = analyze(view);
  if (view.trick.plays.length === 0) return chooseLead(view, k, rng);
  const led = suitOf(view.trick.plays[0].card);
  return suitOf(legal[0]) === led ? chooseFollow(view, legal) : chooseDiscard(view, k);
}

function chooseLead(view: SeatView, k: Knowledge, rng: Rng): Card {
  const { hand, contract } = view;
  const pen = (c: Card) => penaltyOf(contract, c, view.doubles);
  const clean = hand.filter((c) => pen(c) === 0);
  let pool = clean.length ? clean : hand;

  // Don't lead a suit an opponent has run out of: they could throw a penalty card on our trick.
  const opponents = [1, 3].map((o) => ((view.seat + o) % 4) as Seat);
  const safeSuits = pool.filter((c) => !opponents.some((o) => k.voids[o][suitOf(c)]));
  if (safeSuits.length) pool = safeSuits;

  if (contract === 'king') {
    if (!hand.includes(KING_OF_HEARTS)) {
      // Hunt the king: low hearts force its holder to run out of safe hearts.
      const hearts = pool.filter((c) => suitOf(c) === HEARTS && higherUnseen(k, c) > 0);
      if (hearts.length && rng() < 0.75) return lowest(hearts);
    } else {
      // Holding the K♥: get rid of a short suit so the king can be thrown on the other team later.
      const others = pool.filter((c) => suitOf(c) !== HEARTS);
      if (others.length) {
        const shortest = Math.min(...others.map((c) => countSuit(hand, suitOf(c))));
        return lowest(others.filter((c) => countSuit(hand, suitOf(c)) === shortest));
      }
    }
  }

  if (contract === 'queens') {
    const myQueenSuits = new Set(hand.filter((c) => QUEENS.includes(c)).map(suitOf));
    const safe = pool.filter((c) => !myQueenSuits.has(suitOf(c)));
    if (safe.length) pool = safe;
    // Lead low in a suit whose queen is still out, to push it out.
    const hunting = pool.filter((c) => k.unseen.has(makeCard(suitOf(c), 12)) && rankOf(c) < 12 && higherUnseen(k, c) > 1);
    if (hunting.length && rng() < 0.7) return lowest(hunting);
  }

  // Lead the card most likely to lose the trick.
  return best(pool, (c) => higherUnseen(k, c) * 2 - rankOf(c) / 14 + rng() * 0.5);
}

function chooseFollow(view: SeatView, legal: Card[]): Card {
  const pen = (c: Card) => penaltyOf(view.contract, c, view.doubles);
  const win = winningPlay(view.trick)!;
  const winRank = rankOf(win.card);
  const partnerWinning = teamOf(win.seat) === teamOf(view.seat);
  const under = legal.filter((c) => rankOf(c) < winRank);
  const over = legal.filter((c) => rankOf(c) > winRank);

  if (under.length) {
    if (!partnerWinning) {
      // The other team is winning: drop our worst penalty card on them, else our highest safe card.
      const penalties = under.filter((c) => pen(c) > 0);
      return penalties.length ? best(penalties, (c) => pen(c) * 100 + rankOf(c)) : highest(under);
    }
    // Our partner is winning: keep penalty cards off our own team.
    const cleanUnder = under.filter((c) => pen(c) === 0);
    if (cleanUnder.length) return highest(cleanUnder);
    const cleanOver = over.filter((c) => pen(c) === 0);
    if (cleanOver.length) return lowest(cleanOver);
    return best(under, (c) => -pen(c) * 100 + rankOf(c));
  }

  // Every card we can play beats the current winner: shed a high card, but not a penalty card.
  const cleanOver = over.filter((c) => pen(c) === 0);
  return cleanOver.length ? highest(cleanOver) : best(over, (c) => -pen(c) * 100 + rankOf(c));
}

function chooseDiscard(view: SeatView, k: Knowledge): Card {
  const { hand } = view;
  const pen = (c: Card) => penaltyOf(view.contract, c, view.doubles);
  const win = winningPlay(view.trick)!;
  const partnerWinning = teamOf(win.seat) === teamOf(view.seat);
  // A card is dangerous to keep when few higher cards of its suit are still out.
  const danger = (c: Card) => rankOf(c) + (higherUnseen(k, c) === 0 ? 5 : 0);

  if (!partnerWinning) {
    const penalties = hand.filter((c) => pen(c) > 0);
    if (penalties.length) return best(penalties, (c) => pen(c) * 10 + rankOf(c));
    return best(hand, danger);
  }
  const clean = hand.filter((c) => pen(c) === 0);
  if (clean.length) return best(clean, danger);
  return best(hand, (c) => -pen(c) * 100 + rankOf(c));
}
