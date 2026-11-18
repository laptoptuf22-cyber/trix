import { describe, expect, it } from 'vitest';
import { CLUBS, DIAMONDS, HEARTS, KING_OF_HEARTS, QUEENS, SPADES, makeCard } from '../lib/cards';
import {
  CompletedTrick,
  Double,
  LEFT,
  PARTNER,
  RIGHT,
  Seat,
  YOU,
  isHandOver,
  legalCards,
  nextSeat,
  scoreHand,
  teamOf,
  winningPlay,
} from '../lib/rules';

const c = makeCard;
/** A finished trick won by `winner`, containing `cards` (seats don't matter for scoring). */
const won = (winner: Seat, cards: number[]): CompletedTrick => ({
  leader: winner,
  winner,
  plays: cards.map((card, i) => ({ seat: ((winner + i) % 4) as Seat, card })),
});

describe('table', () => {
  it('goes counter-clockwise: you → right → partner → left', () => {
    expect([nextSeat(YOU), nextSeat(RIGHT), nextSeat(PARTNER), nextSeat(LEFT)]).toEqual([RIGHT, PARTNER, LEFT, YOU]);
  });
  it('puts you with your partner', () => {
    expect(teamOf(YOU)).toBe(teamOf(PARTNER));
    expect(teamOf(RIGHT)).toBe(teamOf(LEFT));
    expect(teamOf(YOU)).not.toBe(teamOf(RIGHT));
  });
});

describe('playing cards', () => {
  const hand = [c(SPADES, 3), c(SPADES, 12), c(HEARTS, 9), c(CLUBS, 14)];
  it('must follow the suit led', () => {
    expect(legalCards(hand, { leader: RIGHT, plays: [{ seat: RIGHT, card: c(SPADES, 10) }] })).toEqual([c(SPADES, 3), c(SPADES, 12)]);
  });
  it('can play anything when out of the suit led', () => {
    expect(legalCards(hand, { leader: RIGHT, plays: [{ seat: RIGHT, card: c(DIAMONDS, 5) }] })).toEqual(hand);
  });
  it('can lead anything, hearts included', () => {
    expect(legalCards(hand, { leader: YOU, plays: [] })).toEqual(hand);
  });
  it('highest card of the suit led wins; other suits never win', () => {
    const trick = {
      leader: RIGHT,
      plays: [
        { seat: RIGHT, card: c(SPADES, 9) },
        { seat: PARTNER, card: c(HEARTS, 14) },
        { seat: LEFT, card: c(SPADES, 11) },
        { seat: YOU, card: c(SPADES, 4) },
      ],
    };
    expect(winningPlay(trick)?.seat).toBe(LEFT);
  });
});

describe('end of hand', () => {
  it('King of Hearts ends as soon as the K♥ is taken', () => {
    expect(isHandOver('king', [won(RIGHT, [c(SPADES, 2), c(SPADES, 3), c(SPADES, 4), c(SPADES, 5)])])).toBe(false);
    expect(isHandOver('king', [won(RIGHT, [c(SPADES, 2), KING_OF_HEARTS, c(SPADES, 4), c(SPADES, 5)])])).toBe(true);
  });
  it('Queens ends when all 4 queens are taken', () => {
    const three = [won(YOU, [QUEENS[0], QUEENS[1], QUEENS[2], c(CLUBS, 2)])];
    expect(isHandOver('queens', three)).toBe(false);
    expect(isHandOver('queens', [...three, won(LEFT, [QUEENS[3], c(CLUBS, 3), c(CLUBS, 4), c(CLUBS, 5)])])).toBe(true);
  });
  it('Diamonds ends when all 13 diamonds are taken', () => {
    const diamonds = Array.from({ length: 13 }, (_, i) => c(DIAMONDS, i + 2));
    const tricks = [0, 4, 8].map((i) => won(RIGHT, diamonds.slice(i, i + 4)));
    expect(isHandOver('diamonds', tricks)).toBe(false);
    expect(isHandOver('diamonds', [...tricks, won(YOU, [diamonds[12], c(SPADES, 2), c(SPADES, 3), c(SPADES, 4)])])).toBe(true);
  });
});

describe('team points with doubling', () => {
  const kingTrick = (taker: Seat) => [won(taker, [KING_OF_HEARTS, c(SPADES, 2), c(SPADES, 3), c(SPADES, 4)])];
  const doubledBy = (seat: Seat): Double[] => [{ seat, card: KING_OF_HEARTS }];

  it('K♥ not doubled: the team that takes it loses 75', () => {
    expect(scoreHand('king', kingTrick(RIGHT), []).totals).toEqual([0, -75]);
  });
  it('K♥ doubled by you and taken by the other team: they lose 150, your team gets 75', () => {
    expect(scoreHand('king', kingTrick(LEFT), doubledBy(YOU)).totals).toEqual([75, -150]);
  });
  it('K♥ doubled by you and taken by your partner: your team only loses', () => {
    expect(scoreHand('king', kingTrick(PARTNER), doubledBy(YOU)).totals).toEqual([-150, 0]);
  });
  it('K♥ doubled by you and taken by you: your team only loses', () => {
    expect(scoreHand('king', kingTrick(YOU), doubledBy(YOU)).totals).toEqual([-150, 0]);
  });
  it('K♥ doubled by an opponent and taken by your team: you lose 150, they get 75', () => {
    expect(scoreHand('king', kingTrick(PARTNER), doubledBy(RIGHT)).totals).toEqual([-150, 75]);
  });
  it('Queens: same team rule for each queen', () => {
    const tricks = [
      won(YOU, [QUEENS[0], c(CLUBS, 2), c(CLUBS, 3), c(CLUBS, 4)]), // Q♠ doubled by partner, taken by you: −50, no bonus
      won(RIGHT, [QUEENS[1], c(CLUBS, 5), c(CLUBS, 6), c(CLUBS, 7)]), // Q♥ doubled by you, taken by right: −50 them, +25 us
      won(LEFT, [QUEENS[2], c(CLUBS, 8), c(CLUBS, 9), c(CLUBS, 10)]), // Q♣ not doubled: −25 them
      won(PARTNER, [QUEENS[3], c(SPADES, 8), c(SPADES, 9), c(SPADES, 10)]), // Q♦ doubled by left, taken by partner: −50 us, +25 them
    ];
    const doubles: Double[] = [
      { seat: PARTNER, card: QUEENS[0] },
      { seat: YOU, card: QUEENS[1] },
      { seat: LEFT, card: QUEENS[3] },
    ];
    expect(scoreHand('queens', tricks, doubles).totals).toEqual([-50 + 25 - 50, -50 - 25 + 25]);
  });
  it('Diamonds and Tricks', () => {
    const tricks = [
      won(YOU, [c(DIAMONDS, 2), c(DIAMONDS, 3), c(SPADES, 4), c(SPADES, 5)]),
      won(RIGHT, [c(DIAMONDS, 4), c(CLUBS, 3), c(CLUBS, 4), c(CLUBS, 5)]),
      won(LEFT, [c(SPADES, 6), c(CLUBS, 6), c(CLUBS, 7), c(CLUBS, 8)]),
    ];
    expect(scoreHand('diamonds', tricks, []).totals).toEqual([-20, -10]);
    expect(scoreHand('tricks', tricks, []).totals).toEqual([-15, -30]);
  });
});
