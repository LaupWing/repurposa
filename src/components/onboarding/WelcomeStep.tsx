import logoUrl from '@/assets/logo.svg';
import { stagger } from './stagger';

interface WelcomeStepProps {
    leaving: boolean;
    onNext: () => void;
}

export default function WelcomeStep({ leaving, onNext }: WelcomeStepProps) {
    return (
        <div className="flex flex-col items-center gap-6 py-4">
            <p {...stagger(0, leaving)} className="text-sm text-gray-500">Welcome to</p>
            <div {...stagger(1, leaving)} className="flex items-center gap-3">
                <img src={logoUrl} alt="Repurposa" className="h-11 w-11 rounded-xl shadow-md" />
                <span className="font-serif text-3xl tracking-tight italic text-gray-900">
                    Repurposa
                </span>
            </div>
            <button
                {...stagger(2, leaving)}
                onClick={onNext}
                className="mt-2 px-6 h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
            >
                Get started
            </button>
        </div>
    );
}
