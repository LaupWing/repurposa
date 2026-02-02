/**
 * Connect Account Screen
 *
 * Shown when no Sanctum token exists.
 * Opens a popup to Laravel for login/register.
 */

import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

interface ConnectAccountProps {
    onConnected: () => void;
}

export default function ConnectAccount({ onConnected }: ConnectAccountProps) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = () => {
        const { apiUrl } = window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000' };
        const origin = window.location.origin;

        setIsConnecting(true);

        // Open popup to Laravel auth page
        const popup = window.open(
            `${apiUrl}/auth/wordpress/register?origin=${encodeURIComponent(origin)}`,
            'wbrp-auth',
            'width=600,height=700,scrollbars=yes'
        );

        // Listen for token from popup
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type !== 'wbrp-auth') return;

            window.removeEventListener('message', handleMessage);

            const { token } = event.data;

            // Save token to WordPress
            try {
                await apiFetch({
                    path: '/wbrp/v1/auth/token',
                    method: 'POST',
                    data: { token },
                });

                // Update wbrpConfig so API calls work immediately
                window.wbrpConfig.token = token;

                onConnected();
            } catch (error) {
                console.error('Failed to save token:', error);
            }

            setIsConnecting(false);
        };

        window.addEventListener('message', handleMessage);

        // Handle popup closed without completing
        const checkClosed = setInterval(() => {
            if (popup?.closed) {
                clearInterval(checkClosed);
                setIsConnecting(false);
                window.removeEventListener('message', handleMessage);
            }
        }, 500);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-8 text-center">
                <div className="mb-6">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Connect Your Account
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">
                        Sign in or create an account to start creating AI-powered blog posts and social media content.
                    </p>
                </div>

                <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full h-11 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isConnecting ? 'Connecting...' : 'Connect Account'}
                </button>

                <p className="text-xs text-gray-400 mt-4">
                    Your data is stored securely on our servers.
                </p>
            </div>
        </div>
    );
}
