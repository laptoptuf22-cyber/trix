'use client';

import { Card, FULL_DECK } from '@/lib/cards';
import { ScoreItem, Seat, scoreHand } from '@/lib/rules';
import type { HandState } from '@/lib/game';
import { AnswerValue, Grade, Question, gridCards } from '@/lib/questions';
import type { Strings } from '@/lib/i18n';
import { cardText, formatPoints, pointsClass } from '@/lib/format';
import { PlayingCard } from './PlayingCard';
import { CardGrid } from './QuestionPanel';
import { useLang } from './LangContext';

export interface AnswerRecord {
  q: Question;
  given: AnswerValue;
  grade: Grade;
}

function itemText(item: ScoreItem, t: Strings): string {
  switch (item.kind) {
    case 'king':
    case 'queen':
      return t.pointTaken(item.taker, cardText(item.card), item.doubledBy);
    case 'bonus':
      return t.pointBonus(cardText(item.card));
    case 'diamonds':
      return t.pointDiamonds(item.count);
    case 'tricks':
      return t.pointTricks(item.count);
  }
}

/** Cards the player got wrong, described as they were when the question was asked. */
function collectMisses(records: AnswerRecord[], hand: HandState, t: Strings): string[] {
  const playedAt = new Map<Card, { seat: Seat; trick: number }>();
  hand.tricks.forEach((tr, i) => tr.plays.forEach((p) => playedAt.set(p.card, { seat: p.seat, trick: i + 1 })));
  const misses = new Map<Card, boolean>(); // card → had it been played when asked?
  for (const r of records) {
    if (r.grade.correct) continue;
    const q = r.q;
    if (q.kind === 'wasPlayed') misses.set(q.card, q.answer);
    if (q.kind === 'suitRecall' || q.kind === 'doublesOut' || q.kind === 'fullRecall') {
      const given = r.given as number[];
      for (const c of gridCards(q)) {
        if (q.answer.includes(c) === given.includes(c)) continue;
        // suitRecall/doublesOut answers list cards still out; fullRecall lists cards played.
        misses.set(c, q.kind === 'fullRecall' ? q.answer.includes(c) : !q.answer.includes(c));
      }
    }
  }
  return [...misses.entries()]
    .sort(([a], [b]) => a - b)
    .map(([card, played]) => {
      const info = playedAt.get(card);
      return played && info ? t.missPlayed(cardText(card), info.seat, info.trick) : t.missStillOut(cardText(card));
    });
}

interface Props {
  hand: HandState;
  records: AnswerRecord[];
  finalRecord: AnswerRecord | null;
  onFinalTest: () => void;
  onAgain: () => void;
  onHome: () => void;
}

export function Review({ hand, records, finalRecord, onFinalTest, onAgain, onHome }: Props) {
  const { t } = useLang();
  const score = scoreHand(hand.contract, hand.tricks, hand.doubles);
  const right = records.filter((r) => r.grade.correct).length;
  // The end-of-hand test is shown as a coloured grid instead of a long list.
  const misses = collectMisses(records, hand, t);
  const MAX_MISSES = 15;
  const finalQ = finalRecord?.q.kind === 'fullRecall' ? finalRecord.q : null;
  const finalTotal = finalQ ? gridCards(finalQ).length : 0;

  return (
    <main className="review">
      <section className="panel">
        <h2>{t.teamPoints}</h2>
        <div className="team-scores">
          {([0, 1] as const).map((team) => {
            const items = score.items.filter((i) => i.team === team);
            return (
              <div className={`team-score team-${team}`} key={team}>
                <div className="ts-name">{t.teams[team]}</div>
                <div className={`ts-total num ${pointsClass(score.totals[team])}`}>{formatPoints(score.totals[team])}</div>
                <ul>
                  {items.length ? (
                    items.map((item, i) => (
                      <li key={i}>
                        <span>{itemText(item, t)}</span> <span className={`num ${pointsClass(item.points)}`}>{formatPoints(item.points)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="muted">{t.noPoints}</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>{t.practiceTitle}</h2>
        <p className="big">{records.length ? t.practiceScore(right, records.length) : t.noQuestions}</p>
        {finalRecord && finalQ ? (
          <>
            <p className="big">{t.finalTestDone(Math.round(finalRecord.grade.score * finalTotal), finalTotal)}</p>
            <p className="hint">{t.finalTestLegend}</p>
            <CardGrid cards={FULL_DECK} locked={finalQ.mine} marked={finalRecord.given as number[]} answer={finalQ.answer} onToggle={() => {}} />
            <p className="hint legend">{t.legend}</p>
          </>
        ) : (
          <button type="button" className="btn secondary wide" onClick={onFinalTest}>
            {t.finalTestBtn}
          </button>
        )}
        {misses.length > 0 && (
          <>
            <h3>{t.mistakesTitle}</h3>
            <ul className="misses">
              {misses.slice(0, MAX_MISSES).map((m) => (
                <li key={m}>{m}</li>
              ))}
              {misses.length > MAX_MISSES && <li className="muted">{t.andMore(misses.length - MAX_MISSES)}</li>}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <details>
          <summary>{t.replayTitle}</summary>
          <ol className="replay">
            {hand.tricks.map((tr, i) => (
              <li key={i}>
                <div className={`replay-head team-${tr.winner % 2}`}>{t.replayTrick(i + 1, tr.winner)}</div>
                <div className="replay-cards" dir="ltr">
                  {tr.plays.map((p) => (
                    <span key={p.card} className={`rc ${p.seat === tr.winner ? 'win' : ''}`}>
                      <PlayingCard card={p.card} size="sm" />
                      <small>{t.seatsShort[p.seat]}</small>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <div className="actions">
        <button type="button" className="btn primary" onClick={onAgain}>
          {t.playAgain}
        </button>
        <button type="button" className="btn secondary" onClick={onHome}>
          {t.home}
        </button>
      </div>
    </main>
  );
}
