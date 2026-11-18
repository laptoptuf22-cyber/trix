import { Card, cardLabel } from './cards';
import { ltr } from './i18n';

/** Card name like "Q♠", kept left-to-right inside Arabic text. */
export const cardText = (card: Card): string => ltr(cardLabel(card));

/** +75, −150, 0 (with a real minus sign). */
export const formatPoints = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export const pointsClass = (n: number): string => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
