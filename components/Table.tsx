'use client';

import { Card, cardLabel } from '@/lib/cards';
import { Seat, YOU, teamOf, winningPlay } from '@/lib/rules';
import type { HandState } from '@/lib/game';
import { CardBack, PlayingCard } from './PlayingCard';
import { useLang } from './LangContext';

const POSITION = ['bottom', 'right', 'top', 'left'] as const;

function SeatBox({ seat, hand, showDoubles, active }: { seat: Seat; hand: HandState; showDoubles: boolean; active: boolean }) {
  const { t } = useLang();
  const count = hand.hands[seat].length;
  const doubles = showDoubles ? hand.doubles.filter((d) => d.seat === seat && hand.hands[seat].includes(d.card)) : [];
  return (
    <div className={`seat seat-${POSITION[seat]} team-${teamOf(seat)} ${active ? 'active' : ''}`}>
      <span className="seat-name">{t.seatsShort[seat]}</span>
      {seat !== YOU && (
        <span className="seat-cards">
          <CardBack />
          <span className="num">{count}</span>
        </span>
      )}
      {doubles.map((d) => (
        <span key={d.card} className="badge">
          ×2 <span dir="ltr">{cardLabel(d.card)}</span>
        </span>
      ))}
    </div>
  );
}

interface TableProps {
  hand: HandState;
  showDoubles: boolean;
  activeSeat: Seat | null;
  onTrickTap: () => void;
}

/** The felt: partner on top, opponents left and right, the current trick in the middle. */
export function Table({ hand, showDoubles, activeSeat, onTrickTap }: TableProps) {
  const ended = hand.phase === 'trickEnd';
  const winner = ended ? winningPlay(hand.trick)?.seat : undefined;
  return (
    <div className="table" dir="ltr">
      {([2, 3, 1, 0] as Seat[]).map((seat) => (
        <SeatBox key={seat} seat={seat} hand={hand} showDoubles={showDoubles} active={activeSeat === seat} />
      ))}
      <button type="button" className="trick" onClick={onTrickTap} aria-label="trick" tabIndex={ended ? 0 : -1}>
        {hand.trick.plays.map((p) => (
          <span key={p.card} className={`slot slot-${POSITION[p.seat]}`}>
            <PlayingCard card={p.card} size="md" state={ended ? (p.seat === winner ? 'win' : 'fade') : undefined} />
          </span>
        ))}
      </button>
    </div>
  );
}

interface HandProps {
  cards: Card[];
  legal: Card[] | null;
  selected: Card | null;
  doubled: Card[];
  onCard: (card: Card) => void;
}

/** Your cards. Legal cards can be tapped when it's your turn. */
export function HandView({ cards, legal, selected, doubled, onCard }: HandProps) {
  return (
    <div className="hand" dir="ltr">
      {cards.map((c) => {
        const state = legal ? (legal.includes(c) ? (selected === c ? 'selected' : 'playable') : 'dim') : undefined;
        return (
          <PlayingCard
            key={c}
            card={c}
            size="lg"
            state={state}
            doubled={doubled.includes(c)}
            onClick={legal && legal.includes(c) ? () => onCard(c) : undefined}
          />
        );
      })}
    </div>
  );
}
