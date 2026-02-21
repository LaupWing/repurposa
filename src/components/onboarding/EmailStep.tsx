interface EmailStepProps {
    email: string;
    setEmail: (email: string) => void;
    errors: Record<string, string>;
    onSave: (data: Record<string, unknown>) => void;
    onNext: () => void;
}

export default function EmailStep({ email, setEmail, errors, onSave, onNext }: EmailStepProps) {
    const handleContinue = () => {
        onSave({ email });
        onNext();
    };

    return (
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
                                handleContinue();
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
                    onClick={handleContinue}
                    disabled={!email.trim()}
                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
