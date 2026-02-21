interface ProfileStepProps {
    name: string;
    setName: (name: string) => void;
    onSave: (data: Record<string, unknown>) => void;
    onNext: () => void;
}

export default function ProfileStep({ name, setName, onSave, onNext }: ProfileStepProps) {
    const handleContinue = () => {
        onSave({ name });
        onNext();
    };

    return (
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
                                handleContinue();
                            }
                        }}
                        placeholder="Your name"
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <button
                    onClick={handleContinue}
                    disabled={!name.trim()}
                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
