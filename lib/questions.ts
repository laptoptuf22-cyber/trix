import { ACE_OF_HEARTS, Card, DIAMONDS, FULL_DECK, HEARTS, KING_OF_HEARTS, QUEENS, Rng, SUITS, Suit, cardsOfSuit, rankOf, suitOf } from './cards';
import { Seat, teamOf } from './rules';
import type { SeatView } from './game';
import { Knowledge, PlayedInfo, analyze } from './tracker';

export type QueenStatus = 'us' | 'them' | 'none';

export interface QueenRow {
  card: Card;
  /** The queen is in your own hand, so it is shown but not asked. */
  mine: boolean;
  answer: QueenStatus;
  taker: Seat | null;
  trick: number | null;
}

export type Question =
  | { kind: 'suitCount'; suit: Suit; answer: number; inHand: number; played: number }
  | { kind: 'wasPlayed'; card: Card; answer: boolean; info: PlayedInfo | null }
  | { kind: 'suitRecall'; suit: Suit; mine: Card[]; answer: Card[]; played: PlayedInfo[] }
  | { kind: 'whoDoubled'; card: Card; answer: Seat; options: Seat[] }
  | { kind: 'doublesOut'; options: Card[]; answer: Card[] }
  | { kind: 'queensTaken'; queens: QueenRow[] }
  | { kind: 'teamCount'; what: 'tricks' | 'diamonds'; answer: [number, number] }
  | { kind: 'diamondsLeft'; answer: number; played: number; mine: number }
  | { kind: 'fullRecall'; mine: Card[]; answer: Card[] };

export type QuestionKind = Question['kind'];
/** number (count, seat), boolean (yes/no), number[] (cards, or [your team, other team]), QueenStatus[] */
export type AnswerValue = number | boolean | number[] | QueenStatus[];

export interface Grade {
  /** 0..1 */
  score: number;
  correct: boolean;
}

export interface QuestionOptions {
  /** When doubled cards are shown next to players, questions about unplayed doubles are too easy. */
  showDoubles: boolean;
  lastKind?: QuestionKind | null;
  /** Signatures of questions already asked this hand. */
  asked?: readonly string[];
}

// ---------- Building individual questions ----------

const playedOfSuit = (k: Knowledge, suit: Suit) => [...k.played.values()].filter((p) => suitOf(p.card) === suit);

function suitCount(k: Knowledge, suit: Suit): Question {
  const inHand = [...k.mine].filter((c) => suitOf(c) === suit).length;
  return { kind: 'suitCount', suit, answer: k.unseenBySuit[suit], inHand, played: playedOfSuit(k, suit).length };
}

function wasPlayed(k: Knowledge, card: Card): Question {
  const info = k.played.get(card) ?? null;
  return { kind: 'wasPlayed', card, answer: info !== null, info };
}

function suitRecall(k: Knowledge, suit: Suit): Question {
  return {
    kind: 'suitRecall',
    suit,
    mine: [...k.mine].filter((c) => suitOf(c) === suit).sort((a, b) => a - b),
    answer: [...k.unseen].filter((c) => suitOf(c) === suit).sort((a, b) => a - b),
    played: playedOfSuit(k, suit).sort((a, b) => a.trick - b.trick),
  };
}

function queensTaken(k: Knowledge): Question {
  return {
    kind: 'queensTaken',
    queens: QUEENS.map((card) => {
      const taker = k.takenBy.get(card) ?? null;
      const answer: QueenStatus = taker === null ? 'none' : teamOf(taker) === teamOf(k.me) ? 'us' : 'them';
      return { card, mine: k.mine.has(card), answer, taker, trick: taker === null ? null : k.played.get(card)!.trick };
    }),
  };
}

function teamCount(view: SeatView, k: Knowledge, what: 'tricks' | 'diamonds'): Question {
  const answer: [number, number] = [0, 0];
  const mineTeam = teamOf(k.me);
  if (what === 'tricks') {
    for (const t of view.tricks) answer[teamOf(t.winner) === mineTeam ? 0 : 1]++;
  } else {
    for (const [card, seat] of k.takenBy) if (suitOf(card) === DIAMONDS) answer[teamOf(seat) === mineTeam ? 0 : 1]++;
  }
  return { kind: 'teamCount', what, answer };
}

function diamondsLeft(k: Knowledge): Question {
  const played = playedOfSuit(k, DIAMONDS).length;
  const mine = [...k.mine].filter((c) => suitOf(c) === DIAMONDS).length;
  return { kind: 'diamondsLeft', answer: 13 - played, played, mine };
}

export function fullRecall(view: SeatView): Question {
  const k = analyze(view);
  return {
    kind: 'fullRecall',
    mine: [...k.mine].sort((a, b) => a - b),
    answer: [...k.played.keys()].sort((a, b) => a - b),
  };
}

// ---------- Choosing a question ----------

/**
 * Identifies a question together with its current answer. The same signature is not asked twice in a hand,
 * but the same question can come back once its answer has changed (e.g. more hearts have been played).
 */
export function signature(q: Question): string {
  switch (q.kind) {
    case 'suitCount':
      return `suitCount:${q.suit}:${q.answer}`;
    case 'wasPlayed':
      return `wasPlayed:${q.card}:${q.answer}`;
    case 'suitRecall':
      return `suitRecall:${q.suit}:${q.answer.join(',')}`;
    case 'whoDoubled':
      return `whoDoubled:${q.card}`;
    case 'doublesOut':
      return `doublesOut:${q.answer.join(',')}`;
    case 'queensTaken':
      return `queensTaken:${q.queens.map((r) => r.answer).join(',')}`;
    case 'teamCount':
      return `teamCount:${q.what}:${q.answer.join(',')}`;
    case 'diamondsLeft':
      return `diamondsLeft:${q.answer}`;
    case 'fullRecall':
      return 'fullRecall';
  }
}

const shuffled = <T>(items: readonly T[], rng: Rng): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Cards worth asking "has it been played?" about: not yours, not face up on the table right now. */
function wasPlayedCards(view: SeatView, k: Knowledge, rng: Rng): Card[] {
  const relevant = (c: Card) => rankOf(c) >= 9 && !(view.contract === 'king' && c === KING_OF_HEARTS);
  const playedByOthers = [...k.played.values()].filter((p) => !p.onTable && p.seat !== k.me && relevant(p.card)).map((p) => p.card);
  const stillOut = [...k.unseen].filter(relevant);
  // Up to 3 of each so "yes" and "no" answers are about equally likely.
  return [...shuffled(playedByOthers, rng).slice(0, 3), ...shuffled(stillOut, rng).slice(0, 3)];
}

function generalCandidates(view: SeatView, k: Knowledge, opts: QuestionOptions, rng: Rng): Question[] {
  const out: Question[] = [];

  for (const s of SUITS) if (playedOfSuit(k, s).length > 0) out.push(suitCount(k, s));

  for (const card of wasPlayedCards(view, k, rng)) out.push(wasPlayed(k, card));

  for (const s of SUITS) {
    if (k.unseenBySuit[s] > 0 && playedOfSuit(k, s).some((p) => !p.onTable && p.seat !== k.me)) out.push(suitRecall(k, s));
  }

  // Doubles by other players. While badges are shown, only cards that have left the table are worth asking about.
  const othersDoubles = view.doubles.filter((d) => d.seat !== k.me);
  for (const d of othersDoubles) {
    const info = k.played.get(d.card);
    if (!opts.showDoubles || (info !== undefined && !info.onTable)) {
      out.push({ kind: 'whoDoubled', card: d.card, answer: d.seat, options: ([1, 2, 3] as Seat[]).map((o) => ((k.me + o) % 4) as Seat) });
    }
  }
  if (!opts.showDoubles && othersDoubles.length) {
    const options = othersDoubles.map((d) => d.card).sort((a, b) => a - b);
    out.push({ kind: 'doublesOut', options, answer: options.filter((c) => k.unseen.has(c)) });
  }
  return out;
}

function contractCandidates(view: SeatView, k: Knowledge): Question[] {
  const out: Question[] = [];
  const onTable = (c: Card) => k.played.get(c)?.onTable === true;
  switch (view.contract) {
    case 'king': {
      // Once the A♥ is gone, the K♥ is the highest heart left.
      if (!k.mine.has(ACE_OF_HEARTS) && !onTable(ACE_OF_HEARTS)) out.push(wasPlayed(k, ACE_OF_HEARTS));
      if (playedOfSuit(k, HEARTS).length) out.push(suitCount(k, HEARTS));
      if (k.unseenBySuit[HEARTS] > 0 && playedOfSuit(k, HEARTS).some((p) => !p.onTable && p.seat !== k.me)) {
        out.push(suitRecall(k, HEARTS));
      }
      break;
    }
    case 'queens': {
      if (QUEENS.some((q) => k.takenBy.has(q))) out.push(queensTaken(k));
      for (const q of QUEENS) if (!k.mine.has(q) && !onTable(q)) out.push(wasPlayed(k, q));
      break;
    }
    case 'diamonds': {
      if ([...k.takenBy.keys()].some((c) => suitOf(c) === DIAMONDS)) out.push(teamCount(view, k, 'diamonds'));
      if (playedOfSuit(k, DIAMONDS).length) out.push(diamondsLeft(k));
      break;
    }
    case 'tricks': {
      if (view.tricks.length >= 2) out.push(teamCount(view, k, 'tricks'));
      break;
    }
  }
  return out;
}

/**
 * Picks a question about the hand so far, using only what this seat could have seen.
 * About 40% of questions are about the contract being played. Questions already asked
 * (same signature) are skipped; if nothing new is left to ask, returns null.
 */
export function generateQuestion(view: SeatView, opts: QuestionOptions, rng: Rng): Question | null {
  const k = analyze(view);
  const asked = new Set(opts.asked ?? []);
  const fresh = (qs: Question[]) => qs.filter((q) => !asked.has(signature(q)));
  const general = fresh(generalCandidates(view, k, opts, rng));
  const special = fresh(contractCandidates(view, k));
  if (!general.length && !special.length) return null;

  const pool = special.length && (rng() < 0.4 || !general.length) ? special : general;
  // Pick a kind first (so cards and suits don't crowd out other kinds), avoiding the kind asked last time.
  const kinds = [...new Set(pool.map((q) => q.kind))];
  const otherKinds = kinds.filter((kind) => kind !== opts.lastKind);
  const choices = otherKinds.length ? otherKinds : kinds;
  const kind = choices[Math.floor(rng() * choices.length)];
  const ofKind = pool.filter((q) => q.kind === kind);
  return ofKind[Math.floor(rng() * ofKind.length)];
}

// ---------- Grading ----------

/** Cards shown in a card-grid question that the player can tap (their own cards are locked). */
export function gridCards(q: Extract<Question, { kind: 'suitRecall' | 'doublesOut' | 'fullRecall' }>): Card[] {
  switch (q.kind) {
    case 'suitRecall':
      return cardsOfSuit(q.suit).filter((c) => !q.mine.includes(c));
    case 'doublesOut':
      return q.options;
    case 'fullRecall':
      return FULL_DECK.filter((c) => !q.mine.includes(c));
  }
}

const fraction = (ok: number, total: number): Grade => {
  const score = total === 0 ? 1 : ok / total;
  return { score, correct: ok === total };
};

function gradeSet(universe: readonly Card[], answer: readonly Card[], marked: readonly number[]): Grade {
  const ok = universe.filter((c) => answer.includes(c) === marked.includes(c)).length;
  return fraction(ok, universe.length);
}

export function grade(q: Question, given: AnswerValue): Grade {
  switch (q.kind) {
    case 'suitCount':
    case 'diamondsLeft':
    case 'wasPlayed':
    case 'whoDoubled':
      return fraction(given === q.answer ? 1 : 0, 1);
    case 'suitRecall':
    case 'doublesOut':
    case 'fullRecall':
      return gradeSet(gridCards(q), q.answer, given as number[]);
    case 'queensTaken': {
      const g = given as QueenStatus[];
      const asked = q.queens.map((row, i) => ({ row, i })).filter((x) => !x.row.mine);
      return fraction(asked.filter((x) => g[x.i] === x.row.answer).length, asked.length);
    }
    case 'teamCount': {
      const g = given as number[];
      return fraction((g[0] === q.answer[0] ? 1 : 0) + (g[1] === q.answer[1] ? 1 : 0), 2);
    }
  }
}

/** The answer that grades as fully correct (used by tests and by "show answer"). */
export function correctAnswer(q: Question): AnswerValue {
  switch (q.kind) {
    case 'queensTaken':
      return q.queens.map((r) => r.answer);
    case 'teamCount':
      return [...q.answer];
    default:
      return q.answer;
  }
}
