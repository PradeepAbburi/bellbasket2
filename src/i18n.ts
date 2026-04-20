import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';

const resources: any = {
    English: { translation: en },
};

const loaders: Record<string, () => Promise<any>> = {
    Hindi: () => import('./locales/hi.json'),
    Bengali: () => import('./locales/bn.json'),
    Tamil: () => import('./locales/ta.json'),
    Telugu: () => import('./locales/te.json'),
    Marathi: () => import('./locales/mr.json'),
    Gujarati: () => import('./locales/gu.json'),
    Kannada: () => import('./locales/kn.json'),
    Malayalam: () => import('./locales/ml.json'),
    Punjabi: () => import('./locales/pa.json'),
};

export const loadLanguage = async (lng: string) => {
    if (resources[lng]) return;
    if (loaders[lng]) {
        try {
            const mod = await loaders[lng]();
            i18n.addResourceBundle(lng, 'translation', mod.default);
            resources[lng] = { translation: mod.default };
        } catch (e) {
            console.error(`Failed to load language: ${lng}`, e);
        }
    }
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
