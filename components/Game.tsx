'use client';

import { useEffect, useState } from 'react';
import { Card, makeRng, pick, randomSeed } from '@/lib/cards';
import { CONTRACTS, SEATS, Seat, YOU, contractHasDoubling, legalCards, teamOf, winningPlay } from '@/lib/rules';
import { HandState, applyDoubles, collectTrick, doubleableCards, newHand, playCard, turnOf, viewFor } from '@/lib/game';
import { botPlay, collectBotDoubles } from '@/lib/bot';
import { AnswerValue, Question, QuestionKind, fullRecall, generateQuestion, grade, signature } from '@/lib/questions';
import type { Settings } from '@/lib/settings';
import { cardText } from '@/lib/format';
import { HandView, Table } from './Table';
import { QuestionPanel, QuestionResult } from './QuestionPanel';
import { AnswerRecord, Review } from './Review';
import { PlayingCard } from './PlayingCard';
import { useLang } from './LangContext';

const BOT_DELAY_MS = 750;
const TRICK_PAUSE_MS = 1600;
const OTHERS: Seat[] = [1, 2, 3];

type Stage = 'choose-doubles' | 'announce' | 'play' | 'review';

interface Pending {
  q: Question;
  result?: QuestionResult;
}

/** Deal, and let the computer players double. The player chooses their own doubles in Play mode. */
function setup(settings: Settings) {
  const rng = makeRng(randomSeed());
  const contract = settings.contract === 'random' ? pick(CONTRACTS, rng) : settings.contract;
  let hand = newHand(contract, rng);
  let stage: Stage = 'announce';
  if (hand.phase === 'doubling') {
    if (settings.mode === 'play' && doubleableCards(hand, YOU).length > 0) stage = 'choose-doubles';
    else hand = applyDoubles(hand, collectBotDoubles(hand, settings.mode === 'watch' ? SEATS : OTHERS, rng));
  }
  return { rng, hand, stage };
}

function DoublingPanel({ cards, onDone }: { cards: Card[]; onDone: (chosen: Card[]) => void }) {
  const { t } = useLang();
  const [chosen, setChosen] = useState<Card[]>([]);
  return (
    <section className="panel compact">
      <h2>{t.doublingTitle}</h2>
      <p className="hint">{t.doublingIntro}</p>
      {cards.map((c) => (
        <div className="dbl-row" key={c}>
          <PlayingCard card={c} size="sm" />
          <div className="seg">
            <button type="button" className={chosen.includes(c) ? 'on' : ''} onClick={() => setChosen((x) => (x.includes(c) ? x : [...x, c]))}>
              {t.doubleIt}
            </button>
            <button type="button" className={!chosen.includes(c) ? 'on' : ''} onClick={() => setChosen((x) => x.filter((y) => y !== c))}>
              {t.keep}
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn primary wide" onClick={() => onDone(chosen)}>
        {t.confirmDoubles}
      </button>
    </section>
  );
}

function AnnouncePanel({ hand, onStart }: { hand: HandState; onStart: () => void }) {
  const { t } = useLang();
  return (
    <section className="panel compact">
      {contractHasDoubling(hand.contract) && (
        <>
          <h2>{t.announceTitle}</h2>
          {hand.doubles.length ? (
            <ul className="announce">
              {hand.doubles.map((d) => (
                <li key={d.card} className={`team-${teamOf(d.seat)}`}>
                  {t.announceLine(d.seat, cardText(d.card))}
                </li>
              ))}
            </ul>
          ) : (
            <p>{t.noDoubles}</p>
          )}
        </>
      )}
      <p className="hint">{t.leadsFirst(hand.firstLeader)}</p>
      <button type="button" className="btn primary wide" onClick={onStart} autoFocus>
        {t.startPlaying}
      </button>
    </section>
  );
}

interface Props {
  settings: Settings;
  onHome: () => void;
  onAgain: () => void;
  onToggleLang: () => void;
}

export default function Game({ settings, onHome, onAgain, onToggleLang }: Props) {
  const { t } = useLang();
  const [init] = useState(() => setup(settings));
  const rng = init.rng;
  const [hand, setHand] = useState<HandState>(init.hand);
  const [stage, setStage] = useState<Stage>(init.stage);
  const [pending, setPending] = useState<Pending | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [askedAt, setAskedAt] = useState(0);
  const [lastKind, setLastKind] = useState<QuestionKind | null>(null);
  const [asked, setAsked] = useState<string[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);
  const [finalTest, setFinalTest] = useState<Pending | null>(null);
  const [finalRecord, setFinalRecord] = useState<AnswerRecord | null>(null);

  const watch = settings.mode === 'watch';
  const turn = hand.phase === 'playing' ? turnOf(hand) : null;
  const questionDue = turn === YOU && hand.tricks.length >= askedAt + settings.every;
  const myTurn = stage === 'play' && !pending && !watch && turn === YOU && !questionDue;
  const legal = myTurn ? legalCards(hand.hands[YOU], hand.trick) : null;

  // Drives the game: computer turns, trick collection, and asking questions before your turn.
  useEffect(() => {
    if (stage !== 'play' || pending) return;
    if (hand.phase === 'over') {
      setStage('review');
      return;
    }
    if (hand.phase === 'trickEnd') {
      const id = window.setTimeout(() => setHand((h) => (h.phase === 'trickEnd' ? collectTrick(h) : h)), TRICK_PAUSE_MS);
      return () => window.clearTimeout(id);
    }
    if (hand.phase !== 'playing') return;
    const seat = turnOf(hand);
    if (seat === YOU && hand.tricks.length >= askedAt + settings.every) {
      setAskedAt(hand.tricks.length);
      const q = generateQuestion(viewFor(hand, YOU), { showDoubles: settings.showDoubles, lastKind, asked }, rng);
      if (q) {
        setLastKind(q.kind);
        setAsked((a) => [...a, signature(q)]);
        setPending({ q });
      }
      return;
    }
    if (seat === YOU && !watch) return; // wait for the player to tap a card
    const id = window.setTimeout(() => {
      setHand((h) => (h.phase === 'playing' && turnOf(h) === seat ? playCard(h, botPlay(viewFor(h, seat), rng)) : h));
    }, BOT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [hand, stage, pending, askedAt, lastKind, asked, settings.every, settings.showDoubles, watch, rng]);

  function onCard(card: Card) {
    if (!legal || !legal.includes(card)) return;
    if (selected === card) {
      setSelected(null);
      setHand((h) => (h.phase === 'playing' && turnOf(h) === YOU ? playCard(h, card) : h));
    } else {
      setSelected(card);
    }
  }

  function onTrickTap() {
    if (hand.phase === 'trickEnd' && !pending) setHand((h) => (h.phase === 'trickEnd' ? collectTrick(h) : h));
  }

  function confirmDoubles(chosen: Card[]) {
    setHand(applyDoubles(hand, [...chosen.map((card) => ({ seat: YOU, card })), ...collectBotDoubles(hand, OTHERS, rng)]));
    setStage('announce');
  }

  function submit(given: AnswerValue) {
    if (pending) setPending({ ...pending, result: { given, grade: grade(pending.q, given) } });
  }

  function proceed() {
    if (!pending?.result) return;
    setRecords((r) => [...r, { q: pending.q, ...pending.result! }]);
    setPending(null);
  }

  function submitFinal(given: AnswerValue) {
    if (finalTest) setFinalTest({ ...finalTest, result: { given, grade: grade(finalTest.q, given) } });
  }

  function closeFinal() {
    if (finalTest?.result) setFinalRecord({ q: finalTest.q, ...finalTest.result });
    setFinalTest(null);
  }

  let status = '';
  if (stage === 'play') {
    if (pending) status = t.answerFirst;
    else if (hand.phase === 'trickEnd') status = `${t.takesTrick(winningPlay(hand.trick)!.seat)} · ${t.tapToContinue}`;
    else if (turn === YOU) status = watch ? t.yourTurnWatch : questionDue ? '' : t.yourTurn;
    else if (turn !== null) status = t.thinking(turn);
  }

  const right = records.filter((r) => r.grade.correct).length;
  const myDoubles = hand.doubles.filter((d) => d.seat === YOU).map((d) => d.card);

  return (
    <div className="game">
      <header className="topbar">
        <button type="button" className="btn ghost small" onClick={onHome}>
          {t.home}
        </button>
        <div className="topbar-title">
          <strong>{t.contracts[hand.contract]}</strong>
          <span>{stage === 'review' ? t.handOver : t.trickN(Math.min(hand.tricks.length + 1, 13))}</span>
        </div>
        <div className="topbar-actions">
          {records.length > 0 && <span className="chip">{t.scoreChip(right, records.length)}</span>}
          <button type="button" className="btn ghost small" onClick={onToggleLang}>
            {t.otherLang}
          </button>
        </div>
      </header>

      {stage === 'review' ? (
        <Review
          hand={hand}
          records={records}
          finalRecord={finalRecord}
          onFinalTest={() => setFinalTest({ q: fullRecall(viewFor(hand, YOU)) })}
          onAgain={onAgain}
          onHome={onHome}
        />
      ) : (
        <main className="play">
          {pending ? (
            <QuestionPanel
              key={records.length}
              q={pending.q}
              contract={hand.contract}
              result={pending.result}
              onTable={hand.trick}
              onSubmit={submit}
              onContinue={proceed}
            />
          ) : (
            <Table hand={hand} showDoubles={settings.showDoubles} activeSeat={stage === 'play' ? turn : null} onTrickTap={onTrickTap} />
          )}
          {stage === 'choose-doubles' && <DoublingPanel cards={doubleableCards(hand, YOU)} onDone={confirmDoubles} />}
          {stage === 'announce' && <AnnouncePanel hand={hand} onStart={() => setStage('play')} />}
          <p className="status" aria-live="polite">
            {status}
          </p>
          <HandView cards={hand.hands[YOU]} legal={legal} selected={selected} doubled={myDoubles} onCard={onCard} />
        </main>
      )}

      {finalTest && (
        <QuestionPanel
          q={finalTest.q}
          contract={hand.contract}
          result={finalTest.result}
          variant="sheet"
          onSubmit={submitFinal}
          onContinue={closeFinal}
        />
      )}
    </div>
  );
}
