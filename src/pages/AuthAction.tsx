import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { applyActionCode } from 'firebase/auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';

const AuthAction = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    const [message, setMessage] = useState('Processing your request...');

    useEffect(() => {
        if (!mode || !oobCode) {
            toast.error('Invalid or missing authentication code.');
            navigate('/auth');
            return;
        }

        const handleAction = async () => {
            try {
                if (mode === 'verifyEmail') {
                    setMessage('Verifying your email...');
                    await applyActionCode(auth, oobCode);
                    toast.success('Email verified successfully! You can now log in.');
                    navigate('/auth');
                } else if (mode === 'resetPassword') {
                    navigate(`/reset-password?oobCode=${oobCode}`);
                } else if (mode === 'recoverEmail') {
                    setMessage('Recovering your email...');
                    await applyActionCode(auth, oobCode);
                    toast.success('Email recovered successfully.');
                    navigate('/auth');
                } else {
                    toast.error('Unknown action mode.');
                    navigate('/auth');
                }
            } catch (error: any) {
                console.error("Action error:", error);
                toast.error(error.message || 'Action failed. The link might be expired.');
                navigate('/auth');
            }
        };

        handleAction();
    }, [mode, oobCode, navigate]);

    return (
        <div className="h-screen overflow-hidden gradient-warm relative flex items-center justify-center px-4 w-full">
            <Helmet>
                <title>Verifying... - BellBasket</title>
            </Helmet>
            <div className="fixed inset-0 z-0 bg-background/95 backdrop-blur-sm" />
            <div className="text-center relative z-10 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <h1 className="text-xl font-bold text-foreground">{message}</h1>
            </div>
        </div>
    );
};

export default AuthAction;
