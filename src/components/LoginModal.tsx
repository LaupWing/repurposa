/**
 * Login Modal
 *
 * Full-screen modal shown when no token exists.
 * All login methods (Google, X, LinkedIn, Email) open popups to the Laravel app.
 */

import apiFetch from '@wordpress/api-fetch';
import { useState } from '@wordpress/element';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { RiGoogleFill, RiTwitterXFill, RiLinkedinFill } from 'react-icons/ri';
import logoUrl from '@/assets/logo.svg';
import { useSocialPopup } from '@/hooks/useSocialPopup';

const getConfig = () => window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000', token: '' };

interface LoginModalProps {
    onConnected: () => void;
}

export default function LoginModal({ onConnected }: LoginModalProps) {
    const [view, setView] = useState<'buttons' | 'email'>('buttons');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isSending, setIsSending] = useState(false);

    const saveTokenAndConnect = async (token: string) => {
        try {
            try { localStorage.removeItem('onboarding-step'); } catch { /* ignore */ }

            await apiFetch({
                path: '/wbrp/v1/auth/token',
                method: 'POST',
                data: { token },
            });
            window.wbrpConfig.token = token;
            onConnected();
        } catch (error) {
            console.error('Failed to save token:', error);
        }
    };

    const { connectingPlatform: loadingPlatform, openPopup } = useSocialPopup({
        messageType: 'wbrp-auth',
        onSuccess: (_platformId, eventData) => {
            if (eventData.token) {
                saveTokenAndConnect(eventData.token);
            }
        },
    });

    const openLogin = (platform: string) => {
        const { apiUrl } = getConfig();
        const origin = window.location.origin;
        const url = `${apiUrl}/api/auth/social/${platform}?origin=${encodeURIComponent(origin)}`;
        openPopup(url, platform);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div className="relative overflow-hidden border border-gray-200 bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur rounded-xl w-full max-w-xl mx-4 aspect-[5/4]">
                {/* Gradient blob */}
                <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[400px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-400/20 via-violet-400/20 to-fuchsia-400/20 blur-3xl" />

                <div className="relative flex h-full flex-col items-center justify-center gap-8 py-4">
                    {/* Logo */}
                    <img src={logoUrl} alt="Repurposa" className="h-20 w-20 rounded-2xl shadow-lg" />

                    {view === 'email' ? (
                        <>
                            <div className="space-y-2 text-center">
                                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Log in with email</h2>
                                <p className="text-sm text-gray-500">We'll send you a code to verify</p>
                            </div>

                            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                    placeholder="you@example.com"
                                    className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    autoFocus
                                />
                                {emailError && (
                                    <p className="text-sm text-red-500">{emailError}</p>
                                )}
                                <button
                                    disabled={!email.trim() || isSending}
                                    className="w-full h-10 text-sm font-medium text-white bg-violet-600 rounded-lg cursor-pointer hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isSending ? <Loader2 size={16} className="animate-spin" /> : 'Send me a code'}
                                </button>
                                <button
                                    onClick={() => { setView('buttons'); setEmail(''); setEmailError(''); }}
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2 text-center">
                                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Get started</h2>
                                <p className="text-sm text-gray-500">Sign up or log in to Repurposa</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                                <button
                                    onClick={() => openLogin('google')}
                                    disabled={!!loadingPlatform}
                                    className="flex items-center gap-2 h-9 px-4 text-sm font-medium border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingPlatform === 'google' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <RiGoogleFill size={16} className="text-[#4285F4]" />
                                    )}
                                    Google
                                </button>
                                <button
                                    onClick={() => openLogin('twitter')}
                                    disabled={!!loadingPlatform}
                                    className="flex items-center gap-2 h-9 px-4 text-sm font-medium border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingPlatform === 'twitter' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <RiTwitterXFill size={16} />
                                    )}
                                    X / Twitter
                                </button>
                                <button
                                    onClick={() => openLogin('linkedin')}
                                    disabled={!!loadingPlatform}
                                    className="flex items-center gap-2 h-9 px-4 text-sm font-medium border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingPlatform === 'linkedin' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <RiLinkedinFill size={16} className="text-[#0A66C2]" />
                                    )}
                                    LinkedIn
                                </button>
                                <button
                                    onClick={() => setView('email')}
                                    disabled={!!loadingPlatform}
                                    className="flex items-center gap-2 h-9 px-4 text-sm font-medium border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Mail size={16} />
                                    Email
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
