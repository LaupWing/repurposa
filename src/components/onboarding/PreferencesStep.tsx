import { Loader2, MessageCircle, Shield, Flame } from 'lucide-react';
import { stagger } from './stagger';

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'nl', label: 'Nederlands' },
] as const;

interface PreferencesStepProps {
    leaving: boolean;
    brandVoice: string;
    contentLang: string;
    setBrandVoice: (voice: string) => void;
    setContentLang: (lang: string) => void;
    errors: Record<string, string>;
    sending: boolean;
    onComplete: () => void;
}

export default function PreferencesStep({ leaving, brandVoice, contentLang, setBrandVoice, setContentLang, errors, sending, onComplete }: PreferencesStepProps) {
    return (
        <div className="flex flex-col items-center gap-6 w-full">
            <div {...stagger(0, leaving)} className="space-y-2 text-center">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Almost done!</h2>
                <p className="text-sm text-gray-500">Set your content preferences</p>
            </div>

            <div className="w-full max-w-sm space-y-4">
                <div {...stagger(1, leaving)} className="space-y-2">
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
                                onClick={() => setBrandVoice(value)}
                                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                                    brandVoice === value
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

                <div {...stagger(2, leaving)} className="space-y-2">
                    <label htmlFor="content-lang" className="block text-sm font-medium text-gray-500">
                        Content language
                    </label>
                    <select
                        id="content-lang"
                        value={contentLang}
                        onChange={(e) => setContentLang(e.target.value)}
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
                    {...stagger(3, leaving)}
                    onClick={onComplete}
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
    );
}
