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
import { useProfileStore } from '@/store/profileStore';
import { useSocialPopup } from '@/hooks/useSocialPopup';
import { canonicalTimezone } from '@/components/TimezonePicker';
import WelcomeStep from './WelcomeStep';
import ProfileStep from './ProfileStep';
import EmailStep from './EmailStep';
import ConnectStep from './ConnectStep';
import BusinessStep from './BusinessStep';
import PreferencesStep from './PreferencesStep';

type Step = 'welcome' | 'setup-profile' | 'setup-email' | 'setup-connect' | 'setup-business' | 'setup-preferences';

const STORAGE_KEY = 'onboarding-step';

const getConfig = () => window.repurposaConfig || { apiUrl: 'http://127.0.0.1:8000', token: '' };

function getStepsForProvider(provider?: string): Step[] {
    switch (provider) {
        case 'twitter':
        case 'linkedin':
            return ['welcome', 'setup-email', 'setup-business', 'setup-preferences'];
        case 'email':
            return ['welcome', 'setup-profile', 'setup-connect', 'setup-business', 'setup-preferences'];
        default:
            return ['welcome', 'setup-business', 'setup-preferences'];
    }
}

interface OnboardingModalProps {
    onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
    const { user, refreshProfile } = useProfileStore();
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
    const [leaving, setLeaving] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null);
    const [email, setEmail] = useState(user?.email ?? '');
    const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        niche: '',
        target_audience: '',
        brand_voice: 'conversational',
        content_lang: 'en',
    });
    const [timezone, setTimezone] = useState(() =>
        canonicalTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    );
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, step); } catch { /* ignore */ }
    }, [step]);

    const currentStepIndex = steps.indexOf(step);

    const nextAfterWelcome: Step = provider === 'twitter' || provider === 'linkedin'
        ? 'setup-email'
        : provider === 'email'
          ? 'setup-profile'
          : 'setup-business';

    const goTo = (next: Step) => {
        setLeaving(true);
        setTimeout(() => {
            setStep(next);
            setLeaving(false);
        }, 250);
    };

    const saveStepData = async (data: Record<string, unknown>) => {
        const { apiUrl, token } = getConfig();
        try {
            await fetch(`${apiUrl}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
        } catch {
            // silent — incremental save is best-effort
        }
    };

    const { connectingPlatform, openPopup } = useSocialPopup({
        messageType: 'social-connected',
        onSuccess: (platformId) => {
            setConnectedPlatforms((prev) => [...prev, platformId]);
        },
    });

    const handleConnectPlatform = (platformId: string) => {
        const { apiUrl } = getConfig();
        const origin = window.location.origin;
        openPopup(`${apiUrl}/social/${platformId}/connect?origin=${encodeURIComponent(origin)}`, platformId);
    };

    const handleComplete = async () => {
        setSending(true);
        setErrors({});

        const payload = {
            brand_voice: formData.brand_voice,
            content_lang: formData.content_lang,
            timezone,
            onboarding_completed: true,
        };
        const { apiUrl, token } = getConfig();
        try {
            const response = await fetch(`${apiUrl}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
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

    const renderStep = () => {
        switch (step) {
            case 'welcome':
                return <WelcomeStep leaving={leaving} onNext={() => goTo(nextAfterWelcome)} />;
            case 'setup-profile':
                return <ProfileStep leaving={leaving} name={name} setName={setName} email={user?.email ?? ''} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} onSave={saveStepData} onNext={() => goTo('setup-connect')} />;
            case 'setup-email':
                return <EmailStep leaving={leaving} email={email} setEmail={setEmail} errors={errors} onSave={saveStepData} onNext={() => goTo('setup-business')} provider={provider} />;
            case 'setup-connect':
                return <ConnectStep leaving={leaving} connectedPlatforms={connectedPlatforms} connectingPlatform={connectingPlatform} onConnect={handleConnectPlatform} onNext={() => goTo('setup-business')} />;
            case 'setup-business':
                return (
                    <BusinessStep
                        leaving={leaving}
                        formData={{ niche: formData.niche, target_audience: formData.target_audience }}
                        setFormData={(data) => setFormData({ ...formData, ...data })}
                        onSave={saveStepData}
                        onNext={() => goTo('setup-preferences')}
                    />
                );
            case 'setup-preferences':
                return (
                    <PreferencesStep
                        leaving={leaving}
                        brandVoice={formData.brand_voice}
                        contentLang={formData.content_lang}
                        timezone={timezone}
                        setBrandVoice={(voice) => setFormData({ ...formData, brand_voice: voice })}
                        setContentLang={(lang) => setFormData({ ...formData, content_lang: lang })}
                        setTimezone={setTimezone}
                        errors={errors}
                        sending={sending}
                        onComplete={handleComplete}
                    />
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-overlay" />

            <div className="relative overflow-hidden border border-gray-200 bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur rounded-xl w-full max-w-xl mx-4 aspect-[5/4] animate-modal-content">
                <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[400px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-400/20 via-violet-400/20 to-fuchsia-400/20 blur-3xl" />

                <div className="relative flex h-full flex-col items-center justify-center gap-8">
                    {renderStep()}

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
