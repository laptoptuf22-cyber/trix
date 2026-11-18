import { Card, Rng, makeRng, suitOf } from '../lib/cards';
import { SEATS, Contract } from '../lib/rules';
import { HandState, applyDoubles, collectTrick, newHand, playCard, turnOf, viewFor } from '../lib/game';
import { botPlay, collectBotDoubles } from '../lib/bot';

/** Deals a hand and lets every seat make its doubling decision like a computer player. */
export function startHand(contract: Contract, seed: number): { state: HandState; rng: Rng } {
  const rng = makeRng(seed);
  let state = newHand(contract, rng);
  if (state.phase === 'doubling') state = applyDoubles(state, collectBotDoubles(state, SEATS, rng));
  return { state, rng };
}

/** Plays the hand to the end with computer players in every seat. Calls onTurn before each card. */
export function playOut(start: HandState, rng: Rng, onTurn?: (s: HandState) => void): HandState {
  let state = start;
  let guard = 0;
  while (state.phase !== 'over') {
    if (++guard > 200) throw new Error('Hand did not finish');
    if (state.phase === 'trickEnd') {
      state = collectTrick(state);
      continue;
    }
    onTurn?.(state);
    const seat = turnOf(state);
    state = playCard(state, botPlay(viewFor(state, seat), rng));
  }
  return state;
}

export const holderOf = (state: HandState, card: Card) => state.hands.findIndex((h) => h.includes(card));
export const othersCards = (state: HandState, me: number) => state.hands.filter((_, i) => i !== me).flat();
export const countSuitIn = (cards: readonly Card[], suit: number) => cards.filter((c) => suitOf(c) === suit).length;
