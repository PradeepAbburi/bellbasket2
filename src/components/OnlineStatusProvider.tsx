import React, { useState, useEffect } from 'react';
import Offline from '@/pages/Offline';

interface OnlineStatusProviderProps {
    children: React.ReactNode;
}

const OnlineStatusProvider: React.FC<OnlineStatusProviderProps> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOnline) {
        return <Offline />;
    }

    return <>{children}</>;
};

export default OnlineStatusProvider;
