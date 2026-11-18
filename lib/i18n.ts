import type { Contract, Seat } from './rules';

export type Lang = 'en' | 'ar';

/** Keeps card names and sums left-to-right inside Arabic sentences. */
export const ltr = (s: string) => `⁦${s}⁩`;

const seatsEn = ['You', 'Right opponent', 'Partner', 'Left opponent'];
const seatsEnLower = ['you', 'the right opponent', 'your partner', 'the left opponent'];
const seatsAr = ['أنت', 'خصم اليمين', 'شريكك', 'خصم اليسار'];

const en = {
  appTitle: 'Trix Counting Trainer',
  tagline: 'Practise remembering which cards have been played and which are still with the other players.',
  otherLang: 'العربية',
  home: 'Home',
  seats: seatsEn,
  seatsShort: ['You', 'Right', 'Partner', 'Left'],
  teams: ['Your team', 'Other team'],
  contracts: { king: 'King of Hearts', queens: 'Queens', diamonds: 'Diamonds', tricks: 'Tricks' } as Record<Contract, string>,

  // Home
  modeLabel: 'How do you want to practise?',
  modePlay: 'Play my cards',
  modePlayHint: 'You play your 13 cards with your partner.',
  modeWatch: 'Watch',
  modeWatchHint: 'Your cards are played for you, so you only have to remember.',
  contractLabel: 'Contract',
  random: 'Random',
  everyLabel: 'Ask me a question every',
  tricksCount: (n: number) => (n === 1 ? '1 trick' : `${n} tricks`),
  showDoublesLabel: 'Show doubled cards next to players',
  showDoublesHint: 'Turn this off for harder memory practice.',
  deal: 'Deal',
  howTitle: 'How it works',
  how: [
    'You and your partner (across from you) play against two opponents. Play goes to the right.',
    'When a trick is finished it is turned face down, so you have to remember the cards.',
    'Every few tricks you get a question about the cards. Answer it, read the explanation, and keep playing.',
  ],

  // Table
  trickN: (n: number) => `Trick ${n}`,
  scoreChip: (ok: number, total: number) => `${ok}/${total} right`,
  yourTurn: 'Your turn: tap a card, then tap it again to play it',
  yourTurnWatch: 'Playing your card…',
  thinking: (seat: Seat) => `${seatsEn[seat]} is playing…`,
  takesTrick: (seat: Seat) => (seat === 0 ? 'You take the trick' : `${seatsEn[seat]} takes the trick`),
  tapToContinue: 'Tap to continue',
  answerFirst: 'Answer the question to continue',
  onTableNow: (list: string) => `On the table now: ${list}`,

  // Doubling
  doublingTitle: 'Doubling',
  doublingIntro:
    'You can double these cards. If the other team takes a doubled card, they lose double and your team gets a bonus. If your own team takes it, your team loses double.',
  doubleIt: 'Double',
  keep: 'No',
  confirmDoubles: 'Done',
  announceTitle: 'Doubles this hand',
  noDoubles: 'Nobody doubled.',
  announceLine: (seat: Seat, card: string) => (seat === 0 ? `You doubled the ${card}` : `${seatsEn[seat]} doubled the ${card}`),
  leadsFirst: (seat: Seat) => (seat === 0 ? 'You lead first.' : `${seatsEn[seat]} leads first.`),
  startPlaying: 'Start',

  // Questions
  questionTitle: 'Quick question',
  check: 'Check',
  next: 'Continue',
  correct: 'Correct!',
  partly: (pct: number) => `Partly right (${pct}%)`,
  wrong: 'Not quite',
  yes: 'Yes',
  no: 'No',
  qSuitCount: (suit: string) => `How many ${suit} are still with the other 3 players?`,
  qWasPlayed: (card: string) => `Has the ${card} been played?`,
  qSuitRecall: (suit: string) => `Tap the ${suit} cards that are still with the other players.`,
  recallHint: 'Your own cards are greyed out.',
  qWhoDoubled: (card: string) => `Who doubled the ${card}?`,
  qDoublesOut: 'Which doubled cards have not been played yet?',
  qQueensTaken: 'Which queens has each team taken?',
  queenStatus: { us: 'Your team', them: 'Other team', none: 'Not taken', mine: 'In your hand' },
  qTeamTricks: 'How many tricks has each team taken?',
  qTeamDiamonds: 'How many ♦ has each team taken?',
  qDiamondsLeft: 'How many ♦ have not been played yet? Count yours too.',
  qFullRecall: 'Tap every card that was played this hand.',
  fullRecallHint: 'Cards still in your hand are greyed out.',
  legend: 'Green: right · Red outline: you missed it · Orange: marked by mistake',
  yourAnswer: (x: string) => `You said: ${x}`,
  answerIs: (x: string) => `Answer: ${x}`,

  // Explanations
  eSuitCount: (suit: string, inHand: number, played: number, answer: number) =>
    `You have ${inHand} ${suit} and ${played} have been played, so ${ltr(`13 − ${inHand} − ${played} = ${answer}`)} are still out.`,
  ePlayedBy: (seat: Seat, trick: number) =>
    seat === 0 ? `Yes. You played it in trick ${trick}.` : `Yes. ${seatsEn[seat]} played it in trick ${trick}.`,
  eNotPlayed: "No. It's still with one of the other players.",
  eKingNote: `Once the ${ltr('A♥')} is gone, the ${ltr('K♥')} is the highest heart left.`,
  ePlayedList: (list: string) => `Played: ${list}`,
  eStillOut: (list: string) => `Still out: ${list}`,
  none: 'none',
  playedEntry: (card: string, seat: Seat, trick: number) => `${card} (${['you', 'right', 'partner', 'left'][seat]}, trick ${trick})`,
  eWhoDoubled: (seat: Seat, card: string) => `${seatsEn[seat]} doubled the ${card} at the start of the hand.`,
  eQueenTaken: (card: string, team: string, seat: Seat, trick: number) =>
    `${card}: ${team} (${seatsEnLower[seat]} took it in trick ${trick})`,
  eQueenNone: (card: string) => `${card}: not taken yet`,
  eQueenMine: (card: string) => `${card}: in your hand`,
  eTeamCount: (us: number, them: number) => `Your team: ${us} · Other team: ${them}`,
  eDiamondsLeft: (played: number, answer: number, mine: number) =>
    `${played} ♦ have been played, so ${ltr(`13 − ${played} = ${answer}`)} are left (${mine} of them are yours).`,
  eFullRecall: (ok: number, total: number) => `You got ${ok} of ${total} cards right.`,

  // Review
  handOver: 'Hand over',
  teamPoints: 'Points this hand',
  pointTaken: (taker: Seat, card: string, doubledBy: Seat | null) =>
    `${seatsEn[taker]} took the ${card}` + (doubledBy !== null ? ` (doubled by ${seatsEnLower[doubledBy]})` : ''),
  pointBonus: (card: string) => `Doubling bonus for the ${card}`,
  pointDiamonds: (count: number) => `${count} ♦ taken`,
  pointTricks: (count: number) => (count === 1 ? '1 trick taken' : `${count} tricks taken`),
  noPoints: 'Nothing taken',
  practiceTitle: 'Your counting',
  practiceScore: (ok: number, total: number) => `${ok} of ${total} questions right`,
  noQuestions: 'No questions this hand, because it ended early. Try the end-of-hand test below.',
  mistakesTitle: 'What you missed',
  andMore: (n: number) => `…and ${n} more`,
  finalTestLegend: 'Cards you marked in the end-of-hand test',
  missPlayed: (card: string, seat: Seat, trick: number) =>
    seat === 0 ? `${card}: you played it in trick ${trick}` : `${card}: played by ${seatsEnLower[seat]} in trick ${trick}`,
  missStillOut: (card: string) => `${card}: had not been played yet`,
  finalTestBtn: 'End-of-hand test: mark every played card',
  finalTestDone: (ok: number, total: number) => `End-of-hand test: ${ok} of ${total} cards right`,
  replayTitle: 'Replay the hand, trick by trick',
  replayTrick: (n: number, seat: Seat) => (seat === 0 ? `Trick ${n}: you took it` : `Trick ${n}: ${seatsEnLower[seat]} took it`),
  playAgain: 'Play again',
};

export type Strings = typeof en;

const ar: Strings = {
  appTitle: 'تدريب عدّ الورق - تركس',
  tagline: 'تدرّب على تذكّر الأوراق التي نزلت والأوراق التي ما زالت مع اللاعبين الآخرين.',
  otherLang: 'English',
  home: 'الرئيسية',
  seats: seatsAr,
  seatsShort: ['أنت', 'اليمين', 'شريكك', 'اليسار'],
  teams: ['فريقك', 'الفريق الآخر'],
  contracts: { king: 'شيخ الكبة', queens: 'البنات', diamonds: 'الديناري', tricks: 'اللطوش' },

  modeLabel: 'كيف تحب تتدرّب؟',
  modePlay: 'ألعب أوراقي',
  modePlayHint: 'تلعب أوراقك الـ13 مع شريكك.',
  modeWatch: 'مشاهدة',
  modeWatchHint: 'أوراقك تُلعب تلقائيًا، وأنت تركّز على التذكّر فقط.',
  contractLabel: 'اللعبة',
  random: 'عشوائي',
  everyLabel: 'اسألني سؤالًا كل',
  tricksCount: (n: number) => (n === 1 ? 'لطشة' : n === 2 ? 'لطشتين' : `${n} لطشات`),
  showDoublesLabel: 'أظهر الأوراق المدبّلة بجانب اللاعبين',
  showDoublesHint: 'أطفئها إذا تبي تمرين أصعب للذاكرة.',
  deal: 'وزّع الورق',
  howTitle: 'طريقة التدريب',
  how: [
    'أنت وشريكك (المقابل لك) ضد خصمين. اللعب يمشي لليمين.',
    'لما تخلص اللطشة تنقلب على وجهها، فلازم تتذكّر الأوراق.',
    'كل كم لطشة يجيك سؤال عن الأوراق. جاوب، اقرأ الشرح، وكمّل اللعب.',
  ],

  trickN: (n: number) => `اللطشة ${n}`,
  scoreChip: (ok: number, total: number) => `${ok}/${total} صح`,
  yourTurn: 'دورك: اضغط على ورقة ثم اضغط عليها مرة ثانية لتلعبها',
  yourTurnWatch: 'تُلعب ورقتك…',
  thinking: (seat: Seat) => `${seatsAr[seat]} يلعب…`,
  takesTrick: (seat: Seat) => (seat === 0 ? 'أخذتَ اللطشة' : `${seatsAr[seat]} أخذ اللطشة`),
  tapToContinue: 'اضغط للمتابعة',
  answerFirst: 'جاوب على السؤال لتكمل',
  onTableNow: (list: string) => `على الطاولة الآن: ${list}`,

  doublingTitle: 'الدبل',
  doublingIntro:
    'تقدر تدبّل هذه الأوراق. إذا أخذ الفريق الآخر ورقة مدبّلة يخسر الضعف وفريقك ياخذ مكافأة. وإذا أخذها فريقك، فريقك يخسر الضعف.',
  doubleIt: 'دبّل',
  keep: 'لا',
  confirmDoubles: 'تم',
  announceTitle: 'الدبل في هذه الجولة',
  noDoubles: 'ما أحد دبّل.',
  announceLine: (seat: Seat, card: string) => (seat === 0 ? `أنت دبّلت ${card}` : `${seatsAr[seat]} دبّل ${card}`),
  leadsFirst: (seat: Seat) => (seat === 0 ? 'أنت تبدأ اللعب.' : `${seatsAr[seat]} يبدأ اللعب.`),
  startPlaying: 'ابدأ',

  questionTitle: 'سؤال سريع',
  check: 'تحقّق',
  next: 'متابعة',
  correct: 'صح!',
  partly: (pct: number) => `صح جزئيًا (${pct}%)`,
  wrong: 'ليس تمامًا',
  yes: 'نعم',
  no: 'لا',
  qSuitCount: (suit: string) => `كم ورقة ${suit} باقية مع اللاعبين الثلاثة الآخرين؟`,
  qWasPlayed: (card: string) => `هل نزلت ${card}؟`,
  qSuitRecall: (suit: string) => `اضغط على أوراق ${suit} التي ما زالت مع اللاعبين الآخرين.`,
  recallHint: 'أوراقك باللون الرمادي.',
  qWhoDoubled: (card: string) => `مين دبّل ${card}؟`,
  qDoublesOut: 'أي الأوراق المدبّلة ما نزلت بعد؟',
  qQueensTaken: 'أي البنات أخذها كل فريق؟',
  queenStatus: { us: 'فريقك', them: 'الفريق الآخر', none: 'ما انأخذت', mine: 'معك' },
  qTeamTricks: 'كم لطشة أخذ كل فريق؟',
  qTeamDiamonds: 'كم ديناري ♦ أخذ كل فريق؟',
  qDiamondsLeft: 'كم ديناري ♦ ما نزل بعد؟ احسب اللي معك كمان.',
  qFullRecall: 'اضغط على كل ورقة نزلت في هذه الجولة.',
  fullRecallHint: 'الأوراق الباقية معك باللون الرمادي.',
  legend: 'أخضر: صح · إطار أحمر: فاتتك · برتقالي: اخترتها بالغلط',
  yourAnswer: (x: string) => `جوابك: ${x}`,
  answerIs: (x: string) => `الجواب: ${x}`,

  eSuitCount: (suit: string, inHand: number, played: number, answer: number) =>
    `معك ${inHand} ${suit} ونزل ${played}، إذن ${ltr(`13 − ${inHand} − ${played} = ${answer}`)} باقية مع الآخرين.`,
  ePlayedBy: (seat: Seat, trick: number) =>
    seat === 0 ? `نعم. أنت لعبتها في اللطشة ${trick}.` : `نعم. ${seatsAr[seat]} لعبها في اللطشة ${trick}.`,
  eNotPlayed: 'لا. ما زالت مع أحد اللاعبين الآخرين.',
  eKingNote: `إذا نزلت ${ltr('A♥')} يصير ${ltr('K♥')} أعلى ورقة ♥ باقية.`,
  ePlayedList: (list: string) => `نزلت: ${list}`,
  eStillOut: (list: string) => `باقية مع الآخرين: ${list}`,
  none: 'لا شيء',
  playedEntry: (card: string, seat: Seat, trick: number) => `${card} (${['أنت', 'اليمين', 'شريكك', 'اليسار'][seat]}، لطشة ${trick})`,
  eWhoDoubled: (seat: Seat, card: string) => `${seatsAr[seat]} دبّل ${card} في بداية الجولة.`,
  eQueenTaken: (card: string, team: string, seat: Seat, trick: number) =>
    seat === 0 ? `${card}: ${team} (أنت أخذتها في اللطشة ${trick})` : `${card}: ${team} (${seatsAr[seat]} أخذها في اللطشة ${trick})`,
  eQueenNone: (card: string) => `${card}: ما انأخذت بعد`,
  eQueenMine: (card: string) => `${card}: معك`,
  eTeamCount: (us: number, them: number) => `فريقك: ${us} · الفريق الآخر: ${them}`,
  eDiamondsLeft: (played: number, answer: number, mine: number) =>
    `نزل ${played} ديناري، إذن ${ltr(`13 − ${played} = ${answer}`)} باقية (منها ${mine} معك).`,
  eFullRecall: (ok: number, total: number) => `${ok} من ${total} ورقة صح.`,

  handOver: 'انتهت الجولة',
  teamPoints: 'نقاط هذه الجولة',
  pointTaken: (taker: Seat, card: string, doubledBy: Seat | null) =>
    (taker === 0 ? `أنت أخذت ${card}` : `${seatsAr[taker]} أخذ ${card}`) + (doubledBy !== null ? ` (مدبّلة من ${seatsAr[doubledBy]})` : ''),
  pointBonus: (card: string) => `مكافأة دبل ${card}`,
  pointDiamonds: (count: number) => `أخذ ${count} ديناري`,
  pointTricks: (count: number) => (count === 1 ? 'أخذ لطشة واحدة' : `أخذ ${count} لطشات`),
  noPoints: 'ما أخذ شيء',
  practiceTitle: 'عدّك للورق',
  practiceScore: (ok: number, total: number) => `${ok} من ${total} أسئلة صح`,
  noQuestions: 'ما في أسئلة في هذه الجولة لأنها خلصت بسرعة. جرّب اختبار نهاية الجولة تحت.',
  mistakesTitle: 'اللي فاتك',
  andMore: (n: number) => `…و${n} غيرها`,
  finalTestLegend: 'الأوراق التي حدّدتها في اختبار نهاية الجولة',
  missPlayed: (card: string, seat: Seat, trick: number) =>
    seat === 0 ? `${card}: أنت لعبتها في اللطشة ${trick}` : `${card}: ${seatsAr[seat]} لعبها في اللطشة ${trick}`,
  missStillOut: (card: string) => `${card}: ما نزلت بعد`,
  finalTestBtn: 'اختبار نهاية الجولة: حدّد كل ورقة نزلت',
  finalTestDone: (ok: number, total: number) => `اختبار نهاية الجولة: ${ok} من ${total} صح`,
  replayTitle: 'إعادة الجولة لطشة لطشة',
  replayTrick: (n: number, seat: Seat) => (seat === 0 ? `اللطشة ${n}: أخذتها أنت` : `اللطشة ${n}: أخذها ${seatsAr[seat]}`),
  playAgain: 'العب مرة ثانية',
};

export const STRINGS: Record<Lang, Strings> = { en, ar };
