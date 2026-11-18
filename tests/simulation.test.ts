import { describe, expect, it } from 'vitest';
import { DIAMONDS, KING_OF_HEARTS, QUEENS, makeRng, pick, suitOf } from '../lib/cards';
import { CONTRACTS, Contract, Seat, legalCards, scoreHand, teamOf, winningPlay } from '../lib/rules';
import { applyDoubles, collectTrick, newHand, playCard, turnOf, viewFor } from '../lib/game';
import { botPlay } from '../lib/bot';
import { playOut, startHand } from './helpers';

const HANDS_PER_CONTRACT = 1000;

function endCardCount(contract: Contract, cards: number[]): number {
  switch (contract) {
    case 'king':
      return cards.filter((c) => c === KING_OF_HEARTS).length;
    case 'queens':
      return cards.filter((c) => QUEENS.includes(c)).length;
    case 'diamonds':
      return cards.filter((c) => suitOf(c) === DIAMONDS).length;
    case 'tricks':
      return 0;
  }
}
const target: Record<Contract, number> = { king: 1, queens: 4, diamonds: 13, tricks: 0 };

describe.each(CONTRACTS)('%s: %i simulated hands with computer players', (contract) => {
  it('every card played is legal and every hand ends exactly when it should', () => {
    for (let seed = 1; seed <= HANDS_PER_CONTRACT; seed++) {
      const { state, rng } = startHand(contract, seed);
      // playCard throws on an illegal card, so finishing proves every play was legal.
      const end = playOut(state, rng);

      const played = end.tricks.flatMap((t) => t.plays.map((p) => p.card));
      const all = [...played, ...end.hands.flat()];
      expect(new Set(all).size).toBe(52);

      // Each trick goes to the highest card of the suit led, and its winner leads next.
      end.tricks.forEach((t, i) => {
        expect(t.winner).toBe(winningPlay(t)!.seat);
        if (i > 0) expect(t.leader).toBe(end.tricks[i - 1].winner);
      });
      expect(end.tricks[0].leader).toBe(end.firstLeader);

      if (contract === 'tricks') {
        expect(end.tricks.length).toBe(13);
      } else {
        const beforeLast = end.tricks.slice(0, -1).flatMap((t) => t.plays.map((p) => p.card));
        expect(endCardCount(contract, played)).toBe(target[contract]);
        expect(endCardCount(contract, beforeLast)).toBeLessThan(target[contract]);
      }
    }
  });
});

describe('scores add up', () => {
  it('King of Hearts: −75 not doubled, −75 overall when the other team took a doubled K♥, −150 when the doubling team took it', () => {
    for (let seed = 1; seed <= HANDS_PER_CONTRACT; seed++) {
      const { state, rng } = startHand('king', seed);
      const end = playOut(state, rng);
      const { totals } = scoreHand('king', end.tricks, end.doubles);
      const sum = totals[0] + totals[1];
      const double = end.doubles.find((d) => d.card === KING_OF_HEARTS);
      if (!double) expect(sum).toBe(-75);
      else {
        const takerTeam = teamOf(end.tricks[end.tricks.length - 1].winner);
        expect(sum).toBe(takerTeam === teamOf(double.seat) ? -150 : -75);
      }
    }
  });
});

describe('computer players play as a team', () => {
  /** How often the team that was dealt the K♥ ends up taking it. */
  function keptRate(holdersSmart: boolean, huntersSmart: boolean): number {
    let kept = 0;
    for (let seed = 1; seed <= HANDS_PER_CONTRACT; seed++) {
      const rng = makeRng(seed);
      let state = applyDoubles(newHand('king', rng), []);
      const holderTeam = teamOf(state.hands.findIndex((h) => h.includes(KING_OF_HEARTS)) as Seat);
      while (state.phase !== 'over') {
        if (state.phase === 'trickEnd') {
          state = collectTrick(state);
          continue;
        }
        const seat = turnOf(state);
        const smart = teamOf(seat) === holderTeam ? holdersSmart : huntersSmart;
        const card = smart ? botPlay(viewFor(state, seat), rng) : pick(legalCards(state.hands[seat], state.trick), rng);
        state = playCard(state, card);
      }
      if (teamOf(state.tricks[state.tricks.length - 1].winner) === holderTeam) kept++;
    }
    return kept / HANDS_PER_CONTRACT;
  }

  it('the team holding the K♥ gives it away far more often than random players do', () => {
    const random = keptRate(false, false); // about 75%
    const smartHolders = keptRate(true, false); // about 27%
    expect(smartHolders).toBeLessThan(random - 0.3);
  });

  it('the other team forces the K♥ back on its holders more often than random players do', () => {
    const random = keptRate(false, false);
    const smartHunters = keptRate(false, true); // about 89%
    expect(smartHunters).toBeGreaterThan(random + 0.1);
  });
});
