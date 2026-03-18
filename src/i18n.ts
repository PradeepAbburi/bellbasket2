import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';

const resources = {
    English: { translation: en },
    Hindi: { translation: hi },
    Bengali: { translation: bn },
    Tamil: { translation: ta },
    Telugu: { translation: te },
    Marathi: { translation: mr },
    Gujarati: { translation: gu },
    Kannada: { translation: kn },
    Malayalam: { translation: ml },
    Punjabi: { translation: pa },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'English',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;
