import { useState, useRef, useEffect } from '@wordpress/element';

interface SocialPopupOptions {
    messageType: string;
    onSuccess: (platformId: string, eventData: MessageEvent['data']) => void;
}

export function useSocialPopup({ messageType, onSuccess }: SocialPopupOptions) {
    const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
    const popupRef = useRef<Window | null>(null);

    useEffect(() => {
        return () => { popupRef.current = null; };
    }, []);

    const openPopup = (url: string, platformId: string) => {
        setConnectingPlatform(platformId);

        const popup = window.open(url, 'repurposa-social-auth', 'width=600,height=700,scrollbars=yes');
        popupRef.current = popup;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== messageType) return;

            window.removeEventListener('message', handleMessage);
            clearInterval(checkClosed);
            setConnectingPlatform(null);
            popupRef.current = null;
            onSuccess(platformId, event.data);
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
            if (popup?.closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', handleMessage);
                setConnectingPlatform(null);
                popupRef.current = null;
            }
        }, 500);
    };

    return { connectingPlatform, openPopup };
}
