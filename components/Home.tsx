'use client';

import { CONTRACTS, Contract } from '@/lib/rules';
import type { Settings } from '@/lib/settings';
import { useLang } from './LangContext';

const ICONS: Record<Contract | 'random', string> = { king: 'K♥', queens: 'Q', diamonds: '♦', tricks: '13', random: '?' };

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onToggleLang: () => void;
  onStart: () => void;
}

export default function Home({ settings, onChange, onToggleLang, onStart }: Props) {
  const { t } = useLang();
  const contracts: (Contract | 'random')[] = [...CONTRACTS, 'random'];
  return (
    <div className="page">
      <header className="topbar">
        <h1>{t.appTitle}</h1>
        <button type="button" className="btn ghost small" onClick={onToggleLang}>
          {t.otherLang}
        </button>
      </header>

      <main className="home">
        <p className="tagline">{t.tagline}</p>

        <section className="panel">
          <h2>{t.modeLabel}</h2>
          <div className="options two">
            {(['play', 'watch'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`option ${settings.mode === m ? 'on' : ''}`}
                aria-pressed={settings.mode === m}
                onClick={() => onChange({ mode: m })}
              >
                <strong>{m === 'play' ? t.modePlay : t.modeWatch}</strong>
                <span>{m === 'play' ? t.modePlayHint : t.modeWatchHint}</span>
              </button>
            ))}
          </div>

          <h2>{t.contractLabel}</h2>
          <div className="options contracts">
            {contracts.map((c) => (
              <button
                key={c}
                type="button"
                className={`option contract ${settings.contract === c ? 'on' : ''}`}
                aria-pressed={settings.contract === c}
                onClick={() => onChange({ contract: c })}
              >
                <span className={`icon ${c === 'king' || c === 'diamonds' ? 'red' : ''}`} dir="ltr">
                  {ICONS[c]}
                </span>
                <span>{c === 'random' ? t.random : t.contracts[c]}</span>
              </button>
            ))}
          </div>

          <h2>{t.everyLabel}</h2>
          <div className="seg wide">
            {([1, 2, 3] as const).map((n) => (
              <button key={n} type="button" className={settings.every === n ? 'on' : ''} aria-pressed={settings.every === n} onClick={() => onChange({ every: n })}>
                {t.tricksCount(n)}
              </button>
            ))}
          </div>

          <label className="toggle">
            <input type="checkbox" checked={settings.showDoubles} onChange={(e) => onChange({ showDoubles: e.target.checked })} />
            <span>
              <strong>{t.showDoublesLabel}</strong>
              <small>{t.showDoublesHint}</small>
            </span>
          </label>
        </section>

        <button type="button" className="btn primary big" onClick={onStart}>
          {t.deal}
        </button>

        <section className="panel how">
          <h2>{t.howTitle}</h2>
          <ol>
            {t.how.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
