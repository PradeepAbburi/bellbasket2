import { ReactNode } from 'react';
import { useAppSetup } from './hooks/useAppSetup';
import { useAuthSync } from './hooks/useAuthSync';
import { usePushTokenSync } from './hooks/usePushTokenSync';
import { useRealtimeDataSync } from './hooks/useRealtimeDataSync';
import { useNotificationSync } from './hooks/useNotificationSync';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  useAppSetup();
  useAuthSync();
  usePushTokenSync();
  useRealtimeDataSync();
  useNotificationSync();

  return <>{children}</>;
};
