'use client';

import { useEffect, useState } from 'react';
import { STRINGS } from '@/lib/i18n';
import { Settings, loadSettings, saveSettings } from '@/lib/settings';
import { LangContext } from './LangContext';
import Home from './Home';
import Game from './Game';

export default function Trainer() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [gameKey, setGameKey] = useState(0);

  // Settings live in the browser, so they are read after the first render.
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.lang = settings.lang;
    document.documentElement.dir = settings.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = STRINGS[settings.lang].appTitle;
    saveSettings(settings);
  }, [settings]);

  if (!settings) return <div className="splash" aria-hidden="true" />;

  const t = STRINGS[settings.lang];
  const update = (patch: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const toggleLang = () => update({ lang: settings.lang === 'ar' ? 'en' : 'ar' });

  return (
    <LangContext.Provider value={{ lang: settings.lang, t }}>
      {screen === 'home' ? (
        <Home
          settings={settings}
          onChange={update}
          onToggleLang={toggleLang}
          onStart={() => {
            setGameKey((k) => k + 1);
            setScreen('game');
          }}
        />
      ) : (
        <Game
          key={gameKey}
          settings={settings}
          onHome={() => setScreen('home')}
          onAgain={() => setGameKey((k) => k + 1)}
          onToggleLang={toggleLang}
        />
      )}
    </LangContext.Provider>
  );
}
