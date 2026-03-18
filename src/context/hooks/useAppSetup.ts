import { useEffect } from 'react';
import i18n from 'i18next';
import { initAudio } from '@/utils/notifications';
import { BeforeInstallPromptEvent, useAppStore } from '../appStore';

export const useAppSetup = () => {
  const language = useAppStore((state) => state.user?.language);
  const refreshProducts = useAppStore((state) => state.refreshProducts);
  const setInstallPrompt = useAppStore((state) => state.setInstallPrompt);

  useEffect(() => {
    if (language) i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    const unlockAudio = () => {
      initAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setInstallPrompt]);
};
