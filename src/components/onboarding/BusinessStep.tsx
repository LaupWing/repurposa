interface BusinessFormData {
    niche: string;
    target_audience: string;
}

interface BusinessStepProps {
    formData: BusinessFormData;
    setFormData: (data: BusinessFormData) => void;
    onSave: (data: Record<string, unknown>) => void;
    onNext: () => void;
}

export default function BusinessStep({ formData, setFormData, onSave, onNext }: BusinessStepProps) {
    const handleContinue = () => {
        onSave({ niche: formData.niche, target_audience: formData.target_audience });
        onNext();
    };

    return (
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
                    onClick={handleContinue}
                    disabled={!formData.niche.trim() || !formData.target_audience.trim()}
                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
