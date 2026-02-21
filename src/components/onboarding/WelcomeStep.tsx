import logoUrl from '../../assets/logo.svg';

interface WelcomeStepProps {
    onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
    return (
        <div className="flex flex-col items-center gap-6 py-4">
            <p className="text-sm text-gray-500">Welcome to</p>
            <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Repurposa" className="h-11 w-11 rounded-xl shadow-md" />
                <span className="font-serif text-3xl tracking-tight italic text-gray-900">
                    Repurposa
                </span>
            </div>
            <button
                onClick={onNext}
                className="mt-2 px-6 h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
            >
                Get started
            </button>
        </div>
    );
}
