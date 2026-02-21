/**
 * Login Modal
 *
 * Full-screen modal shown when no token exists.
 * Supports social login (Google, X, LinkedIn) and email OTP.
 */

import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { OTPInput, SlotProps } from 'input-otp';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { RiGoogleFill, RiTwitterXFill, RiLinkedinFill } from 'react-icons/ri';
import logoUrl from '../assets/logo.svg';
import { useSocialPopup } from '../hooks/useSocialPopup';

type Step = 'social' | 'email' | 'code';

const getConfig = () => window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000', token: '' };

function OTPSlot({ char, hasFakeCaret, isActive }: SlotProps) {
    return (
        <div
            className={`relative flex h-12 w-10 items-center justify-center border-y border-r border-gray-300 text-lg font-semibold transition-all first:rounded-l-lg first:border-l last:rounded-r-lg ${
                isActive ? 'z-10 ring-2 ring-blue-500 border-blue-500' : ''
            }`}
        >
            {char}
            {hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-px animate-pulse bg-gray-900" />
                </div>
            )}
        </div>
    );
}

interface LoginModalProps {
    onConnected: () => void;
}

export default function LoginModal({ onConnected }: LoginModalProps) {
    const [step, setStep] = useState<Step>('social');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const openSocialLogin = (platform: string) => {
        const { apiUrl } = getConfig();
        const origin = window.location.origin;
        openPopup(`${apiUrl}/social/${platform}/login?origin=${encodeURIComponent(origin)}&source=wordpress`, platform);
    };

    const handleSendCode = async () => {
        const { apiUrl } = getConfig();
        setSending(true);
        setErrors({});

        try {
            const response = await fetch(`${apiUrl}/api/auth/email/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email, source: 'wordpress' }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const errs: Record<string, string> = {};
                if (data.errors) {
                    for (const [key, val] of Object.entries(data.errors)) {
                        errs[key] = Array.isArray(val) ? val[0] : (val as string);
                    }
                }
                setErrors(errs);
                setSending(false);
                return;
            }

            setSending(false);
            setStep('code');
        } catch {
            setSending(false);
            setErrors({ email: 'Something went wrong. Please try again.' });
        }
    };

    const handleVerifyCode = async () => {
        const { apiUrl } = getConfig();
        setVerifying(true);
        setErrors({});

        try {
            const response = await fetch(`${apiUrl}/api/auth/email/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email, code, source: 'wordpress' }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const errs: Record<string, string> = {};
                if (data.errors) {
                    for (const [key, val] of Object.entries(data.errors)) {
                        errs[key] = Array.isArray(val) ? val[0] : (val as string);
                    }
                }
                setErrors(errs);
                setVerifying(false);
                return;
            }

            const data = await response.json();
            if (data.token) {
                await saveTokenAndConnect(data.token);
            }
        } catch {
            setVerifying(false);
            setErrors({ code: 'Something went wrong. Please try again.' });
        }
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

                    {/* Social step */}
                    {step === 'social' && (
                        <>
                            <div className="space-y-2 text-center">
                                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Get started</h2>
                                <p className="text-sm text-gray-500">Sign up or log in to Repurposa</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                                <button
                                    onClick={() => openSocialLogin('google')}
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
                                    onClick={() => openSocialLogin('twitter')}
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
                                    onClick={() => openSocialLogin('linkedin')}
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
                                    onClick={() => setStep('email')}
                                    disabled={!!loadingPlatform}
                                    className="flex items-center gap-2 h-9 px-4 text-sm font-medium border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Mail size={16} />
                                    Email
                                </button>
                            </div>
                        </>
                    )}

                    {/* Email step */}
                    {step === 'email' && (
                        <>
                            <div className="space-y-1 text-center">
                                <h2 className="text-xl font-bold tracking-tight text-gray-900">Continue with email</h2>
                                <p className="text-sm text-gray-500">We'll send you a login code</p>
                            </div>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700">
                                        Email
                                    </label>
                                    <input
                                        id="auth-email"
                                        type="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && email.trim()) {
                                                e.preventDefault();
                                                handleSendCode();
                                            }
                                        }}
                                        placeholder="you@example.com"
                                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                                </div>

                                <button
                                    onClick={handleSendCode}
                                    disabled={!email.trim() || sending}
                                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Sending code...
                                        </>
                                    ) : (
                                        'Send me a code'
                                    )}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep('social');
                                    setErrors({});
                                }}
                                className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft size={14} />
                                Back
                            </button>
                        </>
                    )}

                    {/* Code step */}
                    {step === 'code' && (
                        <div
                            className={`flex flex-col items-center gap-6 transition-all duration-300 ${
                                verifying ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                            }`}
                        >
                            <div className="space-y-1 text-center">
                                <h2 className="text-xl font-bold tracking-tight text-gray-900">Check your email</h2>
                                <p className="text-sm text-gray-500">We sent a code to {email}</p>
                            </div>

                            <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                                <div className="space-y-2">
                                    <OTPInput
                                        maxLength={6}
                                        autoFocus
                                        value={code}
                                        onChange={(value) => setCode(value)}
                                        onComplete={() => {
                                            setVerifying(true);
                                            setTimeout(() => handleVerifyCode(), 400);
                                        }}
                                        containerClassName="flex items-center gap-2"
                                        render={({ slots }) => (
                                            <div className="flex items-center gap-1">
                                                {slots.slice(0, 3).map((slot, i) => (
                                                    <OTPSlot key={i} {...slot} />
                                                ))}
                                                <span className="mx-1 text-gray-400">-</span>
                                                {slots.slice(3).map((slot, i) => (
                                                    <OTPSlot key={i + 3} {...slot} />
                                                ))}
                                            </div>
                                        )}
                                    />
                                    {errors.code && <p className="text-sm text-red-600 text-center">{errors.code}</p>}
                                </div>

                                <button
                                    onClick={handleVerifyCode}
                                    disabled={code.length !== 6 || verifying}
                                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        'Verify & continue'
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setCode('');
                                        setErrors({});
                                    }}
                                    className="flex items-center gap-1.5 text-gray-500 cursor-pointer hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    Change email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCode('');
                                        setErrors({});
                                        handleSendCode();
                                    }}
                                    disabled={sending}
                                    className="text-gray-500 cursor-pointer hover:text-gray-900 transition-colors disabled:opacity-50"
                                >
                                    Resend code
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
