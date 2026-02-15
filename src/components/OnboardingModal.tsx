/**
 * Onboarding Modal
 *
 * Full-screen forced modal shown after login when onboarding is not complete.
 * Steps are dynamic based on signup provider:
 *   - Google/LinkedIn: welcome → business → preferences
 *   - Twitter: welcome → email → business → preferences
 *   - Email: welcome → profile (name) → connect → business → preferences
 */

import { useState, useEffect } from '@wordpress/element';
import { Check, Flame, Loader2, MessageCircle, Shield } from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { useProfile } from '../context/ProfileContext';
import logoUrl from '../assets/logo.svg';

type Step = 'welcome' | 'setup-profile' | 'setup-email' | 'setup-connect' | 'setup-business' | 'setup-preferences';

const STORAGE_KEY = 'onboarding-step';

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'nl', label: 'Nederlands' },
] as const;

const CONNECT_PLATFORMS = [
    { id: 'twitter', name: 'X / Twitter', Icon: RiTwitterXFill, color: '', comingSoon: false },
    { id: 'linkedin', name: 'LinkedIn', Icon: RiLinkedinFill, color: 'text-[#0A66C2]', comingSoon: false },
    { id: 'threads', name: 'Threads', Icon: RiThreadsFill, color: '', comingSoon: true },
    { id: 'instagram', name: 'Instagram', Icon: RiInstagramFill, color: 'text-[#E4405F]', comingSoon: true },
    { id: 'facebook', name: 'Facebook', Icon: RiFacebookFill, color: 'text-[#1877F2]', comingSoon: true },
] as const;

const getConfig = () => window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000', token: '' };

function getStepsForProvider(provider?: string): Step[] {
    switch (provider) {
        case 'twitter':
            return ['welcome', 'setup-email', 'setup-business', 'setup-preferences'];
        case 'email':
            return ['welcome', 'setup-profile', 'setup-connect', 'setup-business', 'setup-preferences'];
        default:
            // google, linkedin, or unknown
            return ['welcome', 'setup-business', 'setup-preferences'];
    }
}

interface OnboardingModalProps {
    onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
    const { user, refreshProfile } = useProfile();
    const provider = user?.signup_provider;
    const steps = getStepsForProvider(provider);

    const getInitialStep = (): Step => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY) as Step | null;
            if (saved && steps.includes(saved)) return saved;
        } catch { /* ignore */ }
        return 'welcome';
    };

    const [step, setStep] = useState<Step>(getInitialStep);
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState('');
    const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
    const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        niche: '',
        target_audience: '',
        brand_voice: 'conversational' as string,
        content_lang: 'en',
    });
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Persist step
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, step); } catch { /* ignore */ }
    }, [step]);

    const currentStepIndex = steps.indexOf(step);

    // Find next step after welcome based on provider
    const nextAfterWelcome: Step = provider === 'twitter'
        ? 'setup-email'
        : provider === 'email'
          ? 'setup-profile'
          : 'setup-business';

    const goTo = (next: Step) => {
        setStep(next);
    };

    const handleConnectPlatform = (platformId: string) => {
        const { apiUrl } = getConfig();
        const origin = window.location.origin;
        setConnectingPlatform(platformId);

        const popup = window.open(
            `${apiUrl}/social/${platformId}/connect?origin=${encodeURIComponent(origin)}`,
            'wbrp-social-auth',
            'width=600,height=700,scrollbars=yes'
        );

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== 'social-connected') return;
            window.removeEventListener('message', handleMessage);
            clearInterval(checkClosed);
            setConnectedPlatforms((prev) => [...prev, platformId]);
            setConnectingPlatform(null);
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
            if (popup?.closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', handleMessage);
                setConnectingPlatform(null);
            }
        }, 500);
    };

    const handleComplete = async () => {
        const { apiUrl, token } = getConfig();
        setSending(true);
        setErrors({});

        try {
            const response = await fetch(`${apiUrl}/api/profile/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name || undefined,
                    email: email || undefined,
                    niche: formData.niche,
                    target_audience: formData.target_audience,
                    brand_voice: formData.brand_voice,
                    content_lang: formData.content_lang,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    onboarding_completed: true,
                }),
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

            try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
            await refreshProfile();
            onComplete();
        } catch {
            setSending(false);
            setErrors({ general: 'Something went wrong. Please try again.' });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div className="relative overflow-hidden border border-gray-200 bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur rounded-xl w-full max-w-xl mx-4 aspect-[5/4]">
                {/* Gradient blob */}
                <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[400px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-400/20 via-violet-400/20 to-fuchsia-400/20 blur-3xl" />

                <div className="relative flex h-full flex-col items-center justify-center gap-8">

                    {/* Welcome */}
                    {step === 'welcome' && (
                        <div className="flex flex-col items-center gap-6 py-4">
                            <p className="text-sm text-gray-500">Welcome to</p>
                            <div className="flex items-center gap-3">
                                <img src={logoUrl} alt="Repurposa" className="h-11 w-11 rounded-xl shadow-md" />
                                <span className="font-serif text-3xl tracking-tight italic text-gray-900">
                                    Repurposa
                                </span>
                            </div>
                            <button
                                onClick={() => goTo(nextAfterWelcome)}
                                className="mt-2 px-6 h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                            >
                                Get started
                            </button>
                        </div>
                    )}

                    {/* Profile (name) — email signup only */}
                    {step === 'setup-profile' && (
                        <div className="flex flex-col items-center gap-6 w-full">
                            <div className="space-y-2 text-center">
                                <h2 className="text-xl font-bold tracking-tight text-gray-900">Set up your profile</h2>
                                <p className="text-sm text-gray-500">How you'll appear on Repurposa</p>
                            </div>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="profile-name" className="block text-sm font-medium text-gray-500">Name</label>
                                    <input
                                        id="profile-name"
                                        autoFocus
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && name.trim()) {
                                                e.preventDefault();
                                                goTo('setup-connect');
                                            }
                                        }}
                                        placeholder="Your name"
                                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <button
                                    onClick={() => goTo('setup-connect')}
                                    disabled={!name.trim()}
                                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Email — twitter signup only */}
                    {step === 'setup-email' && (
                        <div className="flex flex-col items-center gap-6 w-full">
                            <div className="space-y-2 text-center">
                                <h2 className="text-xl font-bold tracking-tight text-gray-900">What's your email?</h2>
                                <p className="text-sm text-gray-500">We'll use this for notifications and account recovery</p>
                            </div>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="setup-email" className="block text-sm font-medium text-gray-500">Email</label>
                                    <input
                                        id="setup-email"
                                        type="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && email.trim()) {
                                                e.preventDefault();
                                                goTo('setup-business');
                                            }
                                        }}
                                        placeholder="you@example.com"
                                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                                </div>

                                <p className="text-center text-sm text-gray-500">
                                    You'll still log in with <span className="font-semibold text-gray-900">X (Twitter)</span>.
                                </p>

                                <button
                                    onClick={() => goTo('setup-business')}
                                    disabled={!email.trim()}
                                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Connect accounts — email signup only */}
                    {step === 'setup-connect' && (
                        <div className="flex flex-col items-center gap-6 w-full">
                            <div className="space-y-1 text-center">
                                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                                    Connect an account where you want to publish
                                </h2>
                                <p className="text-sm text-gray-500">You can add more accounts later.</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                                {CONNECT_PLATFORMS.map((platform) => {
                                    const isConnected = connectedPlatforms.includes(platform.id);
                                    const isConnecting = connectingPlatform === platform.id;

                                    return (
                                        <button
                                            key={platform.id}
                                            disabled={platform.comingSoon || isConnected || isConnecting}
                                            onClick={() => handleConnectPlatform(platform.id)}
                                            className={`relative flex flex-col items-center gap-2.5 py-5 rounded-lg border text-xs font-medium transition-colors ${
                                                platform.comingSoon
                                                    ? 'opacity-40 cursor-default border-gray-200'
                                                    : isConnected
                                                      ? 'border-green-300 bg-green-50'
                                                      : 'border-gray-300 cursor-pointer hover:bg-gray-100'
                                            } disabled:cursor-default`}
                                        >
                                            {platform.comingSoon && (
                                                <span className="absolute -top-2 right-1 z-10 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                                    Soon
                                                </span>
                                            )}
                                            {isConnecting ? (
                                                <Loader2 size={24} className="animate-spin text-gray-400" />
                                            ) : isConnected ? (
                                                <Check size={24} className="text-green-600" />
                                            ) : (
                                                <platform.Icon size={24} className={platform.color} />
                                            )}
                                            <span className="text-gray-700">{platform.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => goTo('setup-business')}
                                className="text-sm text-gray-500 cursor-pointer hover:text-gray-900 transition-colors"
                            >
                                {connectedPlatforms.length > 0 ? 'Continue' : 'Skip for now'}
                            </button>
                        </div>
                    )}

                    {/* Business info */}
                    {step === 'setup-business' && (
                        <div className="flex flex-col items-center gap-6 w-full">
                            <div className="space-y-2 text-center">
                                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                                    Tell us about your business
                                </h2>
                                <p className="text-sm text-gray-500">This helps us generate better content for you</p>
                            </div>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="niche" className="block text-sm font-medium text-gray-500">
                                        What's your specialty?
                                    </label>
                                    <input
                                        id="niche"
                                        placeholder="e.g., web design, stress management, SEO"
                                        value={formData.niche}
                                        onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="target_audience" className="block text-sm font-medium text-gray-500">
                                        Who's it for?
                                    </label>
                                    <input
                                        id="target_audience"
                                        placeholder="e.g., small business owners"
                                        value={formData.target_audience}
                                        onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <button
                                    onClick={() => goTo('setup-preferences')}
                                    disabled={!formData.niche.trim() || !formData.target_audience.trim()}
                                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preferences */}
                    {step === 'setup-preferences' && (
                        <div className="flex flex-col items-center gap-6 w-full">
                            <div className="space-y-2 text-center">
                                <h2 className="text-xl font-bold tracking-tight text-gray-900">Almost done!</h2>
                                <p className="text-sm text-gray-500">Set your content preferences</p>
                            </div>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-500">Brand voice</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {([
                                            { value: 'conversational', label: 'Casual', Icon: MessageCircle },
                                            { value: 'professional', label: 'Professional', Icon: Shield },
                                            { value: 'bold', label: 'Bold', Icon: Flame },
                                        ] as const).map(({ value, label, Icon }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, brand_voice: value })}
                                                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                                                    formData.brand_voice === value
                                                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon size={16} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="content-lang" className="block text-sm font-medium text-gray-500">
                                        Content language
                                    </label>
                                    <select
                                        id="content-lang"
                                        value={formData.content_lang}
                                        onChange={(e) => setFormData({ ...formData, content_lang: e.target.value })}
                                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
                                    >
                                        {LANGUAGES.map((lang) => (
                                            <option key={lang.value} value={lang.value}>
                                                {lang.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {errors.general && <p className="text-sm text-red-600 text-center">{errors.general}</p>}

                                <button
                                    onClick={handleComplete}
                                    disabled={sending}
                                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Complete Setup'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Progress bar */}
                    {currentStepIndex >= 1 && (
                        <div className="flex justify-center gap-2 pt-2">
                            {steps.map((_, i) => (
                                <div key={i} className="h-1.5 w-8 overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className={`h-full rounded-full bg-blue-500 transition-all duration-500 ease-out ${
                                            currentStepIndex >= i ? 'w-full' : 'w-0'
                                        }`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
