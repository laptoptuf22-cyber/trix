// Cards are numbers 0..51: suit * 13 + (rank - 2). Ranks run 2..14 (14 = ace).
export type Suit = 0 | 1 | 2 | 3;
export type Card = number;

export const SPADES: Suit = 0;
export const HEARTS: Suit = 1;
export const CLUBS: Suit = 2;
export const DIAMONDS: Suit = 3;
/** Display order alternates colours: ♠ ♥ ♣ ♦ */
export const SUITS: readonly Suit[] = [SPADES, HEARTS, CLUBS, DIAMONDS];
export const SUIT_SYMBOLS = ['♠', '♥', '♣', '♦'] as const;
export const RANKS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const makeCard = (suit: Suit, rank: number): Card => suit * 13 + (rank - 2);
export const suitOf = (card: Card): Suit => Math.floor(card / 13) as Suit;
export const rankOf = (card: Card): number => (card % 13) + 2;
export const isRedSuit = (suit: Suit): boolean => suit === HEARTS || suit === DIAMONDS;

export function rankLabel(rank: number): string {
  switch (rank) {
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    case 14:
      return 'A';
    default:
      return String(rank);
  }
}

export const cardLabel = (card: Card): string => rankLabel(rankOf(card)) + SUIT_SYMBOLS[suitOf(card)];

export const KING_OF_HEARTS = makeCard(HEARTS, 13);
export const ACE_OF_HEARTS = makeCard(HEARTS, 14);
export const QUEENS: readonly Card[] = SUITS.map((s) => makeCard(s, 12));
export const FULL_DECK: readonly Card[] = Array.from({ length: 52 }, (_, i) => i);

export const cardsOfSuit = (suit: Suit): Card[] => RANKS.map((r) => makeCard(suit, r));

/** Sorted by suit (♠ ♥ ♣ ♦), then rank from low to high. */
export const sortCards = (cards: readonly Card[]): Card[] => [...cards].sort((a, b) => a - b);

// ---------- Randomness ----------
export type Rng = () => number;

/** Small seeded generator (mulberry32) so hands can be replayed in tests. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32);

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/** Deals 13 cards to each of the 4 seats. */
export function deal(rng: Rng): Card[][] {
  const deck = shuffle(FULL_DECK, rng);
  return [0, 1, 2, 3].map((p) => sortCards(deck.slice(p * 13, p * 13 + 13)));
}
