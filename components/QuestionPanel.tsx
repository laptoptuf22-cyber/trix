'use client';

import { ReactNode, useState } from 'react';
import { ACE_OF_HEARTS, Card, FULL_DECK, SUITS, SUIT_SYMBOLS, cardLabel, cardsOfSuit, isRedSuit, rankLabel, rankOf, suitOf } from '@/lib/cards';
import { Contract, Seat, Trick } from '@/lib/rules';
import { AnswerValue, Grade, QueenRow, QueenStatus, Question, correctAnswer, gridCards } from '@/lib/questions';
import type { Strings } from '@/lib/i18n';
import { cardText } from '@/lib/format';
import { PlayingCard } from './PlayingCard';
import { useLang } from './LangContext';

export interface QuestionResult {
  given: AnswerValue;
  grade: Grade;
}

export function questionText(q: Question, t: Strings): string {
  switch (q.kind) {
    case 'suitCount':
      return t.qSuitCount(SUIT_SYMBOLS[q.suit]);
    case 'wasPlayed':
      return t.qWasPlayed(cardText(q.card));
    case 'suitRecall':
      return t.qSuitRecall(SUIT_SYMBOLS[q.suit]);
    case 'whoDoubled':
      return t.qWhoDoubled(cardText(q.card));
    case 'doublesOut':
      return t.qDoublesOut;
    case 'queensTaken':
      return t.qQueensTaken;
    case 'teamCount':
      return q.what === 'tricks' ? t.qTeamTricks : t.qTeamDiamonds;
    case 'diamondsLeft':
      return t.qDiamondsLeft;
    case 'fullRecall':
      return t.qFullRecall;
  }
}

const isMultiPart = (q: Question) =>
  q.kind === 'suitRecall' || q.kind === 'doublesOut' || q.kind === 'fullRecall' || q.kind === 'queensTaken' || q.kind === 'teamCount';

/** Short text for one-value answers, e.g. "4", "Yes", "Partner". Null for grid answers. */
function answerLabel(q: Question, v: AnswerValue, t: Strings): string | null {
  switch (q.kind) {
    case 'suitCount':
    case 'diamondsLeft':
      return String(v);
    case 'wasPlayed':
      return v ? t.yes : t.no;
    case 'whoDoubled':
      return t.seats[v as Seat];
    case 'teamCount': {
      const [a, b] = v as number[];
      return `${t.teams[0]} ${a} · ${t.teams[1]} ${b}`;
    }
    default:
      return null;
  }
}

/** How to work out the right answer. */
export function explain(q: Question, contract: Contract, t: Strings, score: number): string[] {
  const list = (cards: Card[]) => (cards.length ? cards.map(cardText).join(' ') : t.none);
  switch (q.kind) {
    case 'suitCount':
      return [t.eSuitCount(SUIT_SYMBOLS[q.suit], q.inHand, q.played, q.answer)];
    case 'wasPlayed': {
      const lines = [q.info ? t.ePlayedBy(q.info.seat, q.info.trick) : t.eNotPlayed];
      if (contract === 'king' && q.card === ACE_OF_HEARTS) lines.push(t.eKingNote);
      return lines;
    }
    case 'suitRecall':
      return [
        t.ePlayedList(q.played.length ? q.played.map((p) => t.playedEntry(cardText(p.card), p.seat, p.trick)).join(' · ') : t.none),
        t.eStillOut(list(q.answer)),
      ];
    case 'whoDoubled':
      return [t.eWhoDoubled(q.answer, cardText(q.card))];
    case 'doublesOut':
      return [t.eStillOut(list(q.answer)), t.ePlayedList(list(q.options.filter((c) => !q.answer.includes(c))))];
    case 'queensTaken':
      return q.queens.map((r) =>
        r.mine
          ? t.eQueenMine(cardText(r.card))
          : r.taker === null
            ? t.eQueenNone(cardText(r.card))
            : t.eQueenTaken(cardText(r.card), t.queenStatus[r.answer], r.taker, r.trick ?? 0),
      );
    case 'teamCount':
      return [t.eTeamCount(q.answer[0], q.answer[1])];
    case 'diamondsLeft':
      return [t.eDiamondsLeft(q.played, q.answer, q.mine)];
    case 'fullRecall': {
      const total = gridCards(q).length;
      return [t.eFullRecall(Math.round(score * total), total)];
    }
  }
}

// ---------- Inputs ----------

function NumberPad({ value, answer, onPick }: { value: number | null; answer: number | null; onPick: (n: number) => void }) {
  const locked = answer !== null;
  return (
    <div className="numpad" dir="ltr">
      {Array.from({ length: 14 }, (_, n) => {
        let cls = 'num-btn';
        if (locked) cls += n === answer ? ' ok' : n === value ? ' bad' : '';
        else if (n === value) cls += ' sel';
        return (
          <button key={n} type="button" className={cls} disabled={locked} onClick={() => onPick(n)}>
            {n}
          </button>
        );
      })}
    </div>
  );
}

function Choices<T extends number | boolean>({
  options,
  value,
  answer,
  onPick,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  answer: T | null;
  onPick: (v: T) => void;
}) {
  const locked = answer !== null;
  return (
    <div className="choices">
      {options.map((o) => {
        let cls = 'choice';
        if (locked) cls += o.value === answer ? ' ok' : o.value === value ? ' bad' : '';
        else if (o.value === value) cls += ' sel';
        return (
          <button key={String(o.value)} type="button" className={cls} disabled={locked} onClick={() => onPick(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CardGrid({
  cards,
  locked,
  marked,
  answer,
  onToggle,
}: {
  cards: readonly Card[];
  locked: readonly Card[];
  marked: readonly Card[];
  answer: readonly Card[] | null;
  onToggle: (c: Card) => void;
}) {
  const graded = answer !== null;
  const suits = SUITS.filter((s) => cards.some((c) => suitOf(c) === s));
  return (
    <div className="cgrid" dir="ltr">
      {suits.map((s) => (
        <div className="cgrid-row" key={s}>
          <span className={`cgrid-suit ${isRedSuit(s) ? 'red' : ''}`}>{SUIT_SYMBOLS[s]}</span>
          <div className="cgrid-cells">
            {cards
              .filter((c) => suitOf(c) === s)
              .map((c) => {
                const isLocked = locked.includes(c);
                const isMarked = marked.includes(c);
                let cls = `cell ${isRedSuit(s) ? 'red' : ''}`;
                if (isLocked) cls += ' locked';
                else if (graded) {
                  const inAnswer = answer.includes(c);
                  cls += inAnswer && isMarked ? ' ok' : inAnswer ? ' miss' : isMarked ? ' extra' : '';
                } else if (isMarked) cls += ' sel';
                return (
                  <button
                    key={c}
                    type="button"
                    className={cls}
                    disabled={isLocked || graded}
                    aria-pressed={isMarked}
                    aria-label={cardLabel(c)}
                    onClick={() => onToggle(c)}
                  >
                    {rankLabel(rankOf(c))}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function QueenRows({
  rows,
  value,
  graded,
  onPick,
}: {
  rows: QueenRow[];
  value: (QueenStatus | null)[];
  graded: boolean;
  onPick: (i: number, s: QueenStatus) => void;
}) {
  const { t } = useLang();
  const statuses: QueenStatus[] = ['us', 'them', 'none'];
  return (
    <div className="queen-rows">
      {rows.map((r, i) => (
        <div className="qrow" key={r.card}>
          <PlayingCard card={r.card} size="sm" />
          {r.mine ? (
            <span className="chip muted">{t.queenStatus.mine}</span>
          ) : (
            <div className="seg">
              {statuses.map((s) => {
                let cls = '';
                if (graded) cls = s === r.answer ? 'ok' : value[i] === s ? 'bad' : '';
                else if (value[i] === s) cls = 'on';
                return (
                  <button key={s} type="button" className={cls} disabled={graded} onClick={() => onPick(i, s)}>
                    {t.queenStatus[s]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TeamCounter({ value, answer, onChange }: { value: number[]; answer: number[] | null; onChange: (v: [number, number]) => void }) {
  const { t } = useLang();
  const locked = answer !== null;
  const set = (i: number, n: number): [number, number] => (i === 0 ? [n, value[1]] : [value[0], n]);
  return (
    <div className="team-counter">
      {[0, 1].map((i) => (
        <div className={`tc-row team-${i}`} key={i}>
          <span className="tc-name">{t.teams[i]}</span>
          <div className="stepper" dir="ltr">
            <button type="button" disabled={locked || value[i] <= 0} onClick={() => onChange(set(i, value[i] - 1))} aria-label="−">
              −
            </button>
            <output className={locked ? (value[i] === answer[i] ? 'ok' : 'bad') : ''}>{value[i]}</output>
            <button type="button" disabled={locked || value[i] >= 13} onClick={() => onChange(set(i, value[i] + 1))} aria-label="+">
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Panel ----------

interface Props {
  q: Question;
  contract: Contract;
  result?: QuestionResult;
  /** The trick on the table right now, shown for context. */
  onTable?: Trick;
  variant?: 'inline' | 'sheet';
  onSubmit: (v: AnswerValue) => void;
  onContinue: () => void;
}

export function QuestionPanel({ q, contract, result, onTable, variant = 'inline', onSubmit, onContinue }: Props) {
  const { t } = useLang();
  const graded = result !== undefined;
  const [num, setNum] = useState<number | null>(null);
  const [bool, setBool] = useState<boolean | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [queens, setQueens] = useState<(QueenStatus | null)[]>(() =>
    q.kind === 'queensTaken' ? q.queens.map((r) => (r.mine ? 'none' : null)) : [],
  );
  const [team, setTeam] = useState<[number, number]>([0, 0]);

  let input: ReactNode = null;
  let draft: AnswerValue | null = null;
  let hint: string | null = null;
  switch (q.kind) {
    case 'suitCount':
    case 'diamondsLeft':
      input = <NumberPad value={graded ? (result.given as number) : num} answer={graded ? q.answer : null} onPick={setNum} />;
      draft = num;
      break;
    case 'wasPlayed':
      input = (
        <Choices
          options={[
            { value: true, label: t.yes },
            { value: false, label: t.no },
          ]}
          value={graded ? (result.given as boolean) : bool}
          answer={graded ? q.answer : null}
          onPick={setBool}
        />
      );
      draft = bool;
      break;
    case 'whoDoubled':
      input = (
        <Choices
          options={q.options.map((s) => ({ value: s as number, label: t.seats[s] }))}
          value={graded ? (result.given as number) : num}
          answer={graded ? q.answer : null}
          onPick={setNum}
        />
      );
      draft = num;
      break;
    case 'suitRecall':
    case 'doublesOut':
    case 'fullRecall': {
      const universe = q.kind === 'suitRecall' ? cardsOfSuit(q.suit) : q.kind === 'fullRecall' ? FULL_DECK : q.options;
      input = (
        <CardGrid
          cards={universe}
          locked={q.kind === 'doublesOut' ? [] : q.mine}
          marked={graded ? (result.given as number[]) : cards}
          answer={graded ? q.answer : null}
          onToggle={(c) => setCards((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}
        />
      );
      hint = q.kind === 'suitRecall' ? t.recallHint : q.kind === 'fullRecall' ? t.fullRecallHint : null;
      draft = cards;
      break;
    }
    case 'queensTaken':
      input = (
        <QueenRows
          rows={q.queens}
          value={graded ? (result.given as QueenStatus[]) : queens}
          graded={graded}
          onPick={(i, s) => setQueens((x) => x.map((v, j) => (j === i ? s : v)))}
        />
      );
      draft = queens.every((v) => v !== null) ? (queens as QueenStatus[]) : null;
      break;
    case 'teamCount':
      input = <TeamCounter value={graded ? (result.given as number[]) : team} answer={graded ? q.answer : null} onChange={setTeam} />;
      draft = team;
      break;
  }

  const tablePlays = onTable?.plays ?? [];
  let feedback: ReactNode = null;
  if (graded) {
    const { grade } = result;
    const multi = isMultiPart(q);
    const title = grade.correct ? t.correct : multi && grade.score > 0 ? t.partly(Math.round(grade.score * 100)) : t.wrong;
    const given = answerLabel(q, result.given, t);
    const right = answerLabel(q, correctAnswer(q), t);
    feedback = (
      <div className={`feedback ${grade.correct ? 'good' : multi && grade.score > 0 ? 'mid' : 'bad'}`} role="status">
        <strong className="fb-title">{title}</strong>
        {!grade.correct && given !== null && right !== null && (
          <p>
            {t.yourAnswer(given)} · {t.answerIs(right)}
          </p>
        )}
        {explain(q, contract, t, grade.score).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {(q.kind === 'suitRecall' || q.kind === 'doublesOut' || q.kind === 'fullRecall') && <p className="legend">{t.legend}</p>}
      </div>
    );
  }

  const panel = (
    <section className={`qpanel ${variant}`} role={variant === 'sheet' ? 'dialog' : 'region'} aria-modal={variant === 'sheet' || undefined} aria-labelledby="q-title">
      <div className="q-kicker">{q.kind === 'fullRecall' ? t.finalTestBtn : t.questionTitle}</div>
      <h2 id="q-title">{questionText(q, t)}</h2>
      {hint && <p className="hint">{hint}</p>}
      {tablePlays.length > 0 && !graded && (
        <p className="hint">{t.onTableNow(tablePlays.map((p) => `${cardText(p.card)} (${t.seatsShort[p.seat]})`).join(' · '))}</p>
      )}
      {input}
      {feedback}
      <div className="q-actions">
        {graded ? (
          <button type="button" className="btn primary" onClick={onContinue} autoFocus>
            {t.next}
          </button>
        ) : (
          <button type="button" className="btn primary" disabled={draft === null} onClick={() => draft !== null && onSubmit(draft)}>
            {t.check}
          </button>
        )}
      </div>
    </section>
  );

  return variant === 'sheet' ? <div className="sheet-backdrop">{panel}</div> : panel;
}
