import { Card, SUIT_SYMBOLS, cardLabel, isRedSuit, rankLabel, rankOf, suitOf } from '@/lib/cards';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

interface Props {
  card: Card;
  size?: CardSize;
  /** playable: can be played now · selected: tapped once · dim: cannot be played now · win: wins the trick */
  state?: 'playable' | 'selected' | 'dim' | 'win' | 'fade';
  doubled?: boolean;
  onClick?: () => void;
}

export function PlayingCard({ card, size = 'md', state, doubled, onClick }: Props) {
  const suit = suitOf(card);
  const className = ['pcard', size, isRedSuit(suit) ? 'red' : 'black', state ?? ''].join(' ');
  const face = (
    <>
      <span className="pc-corner">
        <span className="pc-rank">{rankLabel(rankOf(card))}</span>
        <span className="pc-suit">{SUIT_SYMBOLS[suit]}</span>
      </span>
      <span className="pc-pip" aria-hidden="true">
        {SUIT_SYMBOLS[suit]}
      </span>
      {doubled && <span className="pc-dbl">×2</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-label={cardLabel(card)} aria-pressed={state === 'selected'}>
        {face}
      </button>
    );
  }
  return (
    <span className={className} role="img" aria-label={cardLabel(card)}>
      {face}
    </span>
  );
}

export function CardBack({ size = 'xs' }: { size?: CardSize }) {
  return <span className={`pcard back ${size}`} aria-hidden="true" />;
}
