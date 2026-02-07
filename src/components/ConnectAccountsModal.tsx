/**
 * Connect Accounts Modal
 *
 * One-time modal shown after onboarding to encourage users
 * to connect their social media accounts.
 */

import { useState, useEffect, useRef } from '@wordpress/element';
import { X, ExternalLink, Check, Loader2 } from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { toast } from 'sonner';
import { useProfile } from '../context/ProfileContext';

// ============================================
// CONSTANTS
// ============================================

const PLATFORMS = [
    { id: 'twitter', name: 'X', icon: <RiTwitterXFill size={20} />, color: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn', icon: <RiLinkedinFill size={20} />, color: 'bg-blue-700' },
    { id: 'threads', name: 'Threads', icon: <RiThreadsFill size={20} />, color: 'bg-gray-900', comingSoon: true },
    { id: 'instagram', name: 'Instagram', icon: <RiInstagramFill size={20} />, color: 'bg-gradient-to-br from-purple-600 to-pink-500', comingSoon: true },
    { id: 'facebook', name: 'Facebook', icon: <RiFacebookFill size={20} />, color: 'bg-blue-600', comingSoon: true },
];

// ============================================
// HELPERS
// ============================================

const getConfig = () => window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000', token: '' };

async function dismissConnectModal(): Promise<void> {
    const { apiUrl, token } = getConfig();
    await fetch(`${apiUrl}/api/dismiss-connect-modal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
}

// ============================================
// COMPONENT
// ============================================

export function ConnectAccountsModal() {
    const { profile, socialConnections, isLoading, refreshProfile } = useProfile();
    const [dismissed, setDismissed] = useState(false);
    const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
    const popupRef = useRef<Window | null>(null);

    // Cleanup popup ref on unmount
    useEffect(() => {
        return () => {
            popupRef.current = null;
        };
    }, []);

    // Don't show if loading, already dismissed, already seen, or has connected accounts
    if (isLoading || dismissed) return null;
    if (profile?.has_seen_connect_modal) return null;
    if (socialConnections.length > 0) return null;

    const mergedPlatforms = PLATFORMS.map((p) => {
        const connection = socialConnections.find((c) => c.platform === p.id);
        return {
            ...p,
            connected: !!connection,
            username: connection?.username,
        };
    });

    const handleConnect = (platformId: string) => {
        const { apiUrl } = getConfig();
        const origin = window.location.origin;

        setConnectingPlatform(platformId);

        const popup = window.open(
            `${apiUrl}/social/${platformId}/connect?origin=${encodeURIComponent(origin)}`,
            'wbrp-social-auth',
            'width=600,height=700,scrollbars=yes'
        );
        popupRef.current = popup;

        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type !== 'social-connected') return;

            window.removeEventListener('message', handleMessage);
            clearInterval(checkClosed);

            try {
                await refreshProfile();
                toast.success(`Connected to ${event.data.platform || platformId}!`);
            } catch (error) {
                console.error('Failed to refresh profile after connect:', error);
            } finally {
                setConnectingPlatform(null);
                popupRef.current = null;
            }
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

    const handleSkip = async () => {
        setDismissed(true);
        try {
            await dismissConnectModal();
        } catch {
            // Silent — modal stays dismissed locally either way
        }
    };

    const connectedCount = socialConnections.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Connect your <em className="font-serif font-normal italic">accounts</em>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Link your social media so you can schedule posts directly.
                    </p>
                </div>

                {/* Platforms */}
                <div className="px-6 py-4 space-y-2">
                    {mergedPlatforms.map((platform) => (
                        <div
                            key={platform.id}
                            className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 ${platform.comingSoon ? 'opacity-50' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 ${platform.comingSoon ? 'bg-gray-300' : platform.color} text-white rounded-lg flex items-center justify-center`}>
                                    {platform.icon}
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                                    {platform.comingSoon && (
                                        <p className="text-xs text-gray-400">Coming soon</p>
                                    )}
                                    {platform.connected && (
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                            <Check size={12} />
                                            @{platform.username}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {platform.comingSoon ? (
                                <span className="text-xs text-gray-400">Soon</span>
                            ) : platform.connected ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                                    <Check size={12} />
                                    Connected
                                </span>
                            ) : (
                                <button
                                    onClick={() => handleConnect(platform.id)}
                                    disabled={connectingPlatform === platform.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    {connectingPlatform === platform.id ? (
                                        <><Loader2 size={12} className="animate-spin" /> Connecting...</>
                                    ) : (
                                        <><ExternalLink size={12} /> Connect</>
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-500">We never post without your permission.</p>
                    <button
                        onClick={handleSkip}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
}
