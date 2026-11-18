'use client';

import { createContext, useContext } from 'react';
import { Lang, STRINGS, Strings } from '@/lib/i18n';

export const LangContext = createContext<{ lang: Lang; t: Strings }>({ lang: 'en', t: STRINGS.en });

export const useLang = () => useContext(LangContext);
