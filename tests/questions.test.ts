import { describe, expect, it } from 'vitest';
import { DIAMONDS, FULL_DECK, SUITS, makeRng, suitOf } from '../lib/cards';
import { CONTRACTS, SEATS, Seat, YOU, teamOf } from '../lib/rules';
import { HandState, turnOf, viewFor } from '../lib/game';
import { analyze, possibleHolders } from '../lib/tracker';
import { AnswerValue, Question, QuestionKind, correctAnswer, fullRecall, generateQuestion, grade, gridCards, signature } from '../lib/questions';
import { holderOf, othersCards, playOut, startHand } from './helpers';

/** Every moment in `hands` hands of each contract where it is someone's turn. */
function* moments(hands = 150): Generator<HandState> {
  for (const contract of CONTRACTS) {
    for (let seed = 1; seed <= hands; seed++) {
      const { state, rng } = startHand(contract, seed * 7919);
      const snapshots: HandState[] = [];
      playOut(state, rng, (s) => snapshots.push(s));
      yield* snapshots;
    }
  }
}

/** Answers worked out from the full table (including hidden hands), to check the question engine. */
function checkAgainstTruth(q: Question, s: HandState) {
  const others = othersCards(s, YOU);
  const inAnyHand = (c: number) => s.hands.some((h) => h.includes(c));
  switch (q.kind) {
    case 'suitCount':
      expect(q.answer).toBe(others.filter((c) => suitOf(c) === q.suit).length);
      expect(13 - q.inHand - q.played).toBe(q.answer);
      break;
    case 'wasPlayed':
      expect(q.answer).toBe(!inAnyHand(q.card));
      break;
    case 'suitRecall':
      expect(q.answer).toEqual(others.filter((c) => suitOf(c) === q.suit).sort((a, b) => a - b));
      expect(q.mine).toEqual(s.hands[YOU].filter((c) => suitOf(c) === q.suit));
      break;
    case 'whoDoubled':
      expect(q.answer).toBe(s.doubles.find((d) => d.card === q.card)!.seat);
      expect(q.answer).not.toBe(YOU);
      break;
    case 'doublesOut':
      expect(q.answer).toEqual(q.options.filter((c) => others.includes(c)));
      break;
    case 'queensTaken':
      for (const row of q.queens) {
        expect(row.mine).toBe(s.hands[YOU].includes(row.card));
        const trick = s.tricks.find((t) => t.plays.some((p) => p.card === row.card));
        const expected = trick ? (teamOf(trick.winner) === teamOf(YOU) ? 'us' : 'them') : 'none';
        expect(row.answer).toBe(expected);
      }
      break;
    case 'teamCount': {
      const counts = [0, 0];
      for (const t of s.tricks) {
        const n = q.what === 'tricks' ? 1 : t.plays.filter((p) => suitOf(p.card) === DIAMONDS).length;
        counts[teamOf(t.winner) === teamOf(YOU) ? 0 : 1] += n;
      }
      expect(q.answer).toEqual(counts);
      break;
    }
    case 'diamondsLeft':
      expect(q.answer).toBe(s.hands.flat().filter((c) => suitOf(c) === DIAMONDS).length);
      break;
    case 'fullRecall':
      expect(q.answer).toEqual(FULL_DECK.filter((c) => !inAnyHand(c)));
      break;
  }
}

/** A deliberately wrong answer for the same question. */
function wrongAnswer(q: Question): AnswerValue {
  switch (q.kind) {
    case 'suitCount':
    case 'diamondsLeft':
      return q.answer + 1;
    case 'wasPlayed':
      return !q.answer;
    case 'whoDoubled':
      return q.options.find((o) => o !== q.answer)!;
    case 'suitRecall':
    case 'doublesOut':
    case 'fullRecall': {
      const first = gridCards(q)[0];
      return q.answer.includes(first) ? q.answer.filter((c) => c !== first) : [...q.answer, first];
    }
    case 'queensTaken':
      return q.queens.map((r) => (r.mine ? r.answer : r.answer === 'us' ? 'them' : 'us'));
    case 'teamCount':
      return [q.answer[0] + 1, q.answer[1]];
  }
}

describe('questions', () => {
  it('always match what really happened, and grade right and wrong answers correctly', () => {
    const seen = new Set<QuestionKind>();
    let n = 0;
    for (const s of moments()) {
      for (const showDoubles of [true, false]) {
        const q = generateQuestion(viewFor(s, YOU), { showDoubles }, makeRng(n++));
        if (!q) continue;
        seen.add(q.kind);
        checkAgainstTruth(q, s);
        expect(grade(q, correctAnswer(q))).toEqual({ score: 1, correct: true });
        const wrong = grade(q, wrongAnswer(q));
        expect(wrong.correct).toBe(false);
        expect(wrong.score).toBeLessThan(1);
      }
    }
    for (const kind of ['suitCount', 'wasPlayed', 'suitRecall', 'whoDoubled', 'doublesOut', 'queensTaken', 'teamCount', 'diamondsLeft'] as const) {
      expect(seen, `never asked ${kind}`).toContain(kind);
    }
  });

  it('never asks the same question twice in a hand', () => {
    for (const contract of CONTRACTS) {
      for (let seed = 1; seed <= 100; seed++) {
        const { state, rng } = startHand(contract, seed);
        const asked: string[] = [];
        const qrng = makeRng(seed);
        playOut(state, rng, (s) => {
          if (turnOf(s) !== YOU) return;
          const q = generateQuestion(viewFor(s, YOU), { showDoubles: true, asked }, qrng);
          if (!q) return;
          expect(asked).not.toContain(signature(q));
          asked.push(signature(q));
        });
      }
    }
  });

  it('end-of-hand test lists exactly the cards that were played', () => {
    for (const contract of CONTRACTS) {
      const { state, rng } = startHand(contract, 42);
      const end = playOut(state, rng);
      const q = fullRecall(viewFor(end, YOU));
      checkAgainstTruth(q, end);
      expect(grade(q, correctAnswer(q)).correct).toBe(true);
    }
  });
});

describe('fairness: answers only use what you could have seen', () => {
  it('a seat view holds its own cards and the table, nothing else', () => {
    const { state } = startHand('queens', 3);
    const view = viewFor(state, YOU);
    expect(Object.keys(view).sort()).toEqual(['contract', 'doubles', 'hand', 'seat', 'trick', 'tricks']);
    expect(view.hand).toEqual(state.hands[YOU]);
  });

  it('everything the tracker concludes is true at the real table', () => {
    for (const s of moments(40)) {
      for (const seat of SEATS) {
        const k = analyze(viewFor(s, seat));
        expect([...k.unseen].sort((a, b) => a - b)).toEqual(othersCards(s, seat).sort((a, b) => a - b));
        for (const other of SEATS) {
          if (other === seat) continue;
          for (const suit of SUITS) {
            if (k.voids[other][suit]) expect(s.hands[other].some((c) => suitOf(c) === suit)).toBe(false);
          }
        }
        for (const card of k.unseen) {
          expect(possibleHolders(k, card, s.doubles)).toContain(holderOf(s, card) as Seat);
        }
      }
    }
  });

  it('swapping hidden cards between other players never changes a question', () => {
    for (const s of moments(40)) {
      if (s.hands[1].length === 0 || s.hands[3].length === 0) continue;
      // Swap one card of the same suit between the two opponents (keeps the past legal).
      const pair = SUITS.map((suit) => [s.hands[1].find((c) => suitOf(c) === suit), s.hands[3].find((c) => suitOf(c) === suit)]).find(
        ([a, b]) => a !== undefined && b !== undefined,
      );
      if (!pair) continue;
      const [a, b] = pair as [number, number];
      const swapped: HandState = {
        ...s,
        hands: s.hands.map((h, i) => (i === 1 ? h.map((c) => (c === a ? b : c)) : i === 3 ? h.map((c) => (c === b ? a : c)) : h)),
      };
      const q1 = generateQuestion(viewFor(s, YOU), { showDoubles: false }, makeRng(5));
      const q2 = generateQuestion(viewFor(swapped, YOU), { showDoubles: false }, makeRng(5));
      expect(q2).toEqual(q1);
    }
  });
});
