import { Loader2, Check } from 'lucide-react';
import { CONNECT_PLATFORMS } from '../../constants/platforms';

interface ConnectStepProps {
    connectedPlatforms: string[];
    connectingPlatform: string | null;
    onConnect: (platformId: string) => void;
    onNext: () => void;
}

export default function ConnectStep({ connectedPlatforms, connectingPlatform, onConnect, onNext }: ConnectStepProps) {
    return (
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
                            disabled={isConnected || isConnecting}
                            onClick={() => onConnect(platform.id)}
                            className={`relative flex flex-col items-center gap-2.5 py-5 rounded-lg border text-xs font-medium transition-colors ${
                                isConnected
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-300 cursor-pointer hover:bg-gray-100'
                            } disabled:cursor-default`}
                        >
                            {isConnecting ? (
                                <Loader2 size={24} className="animate-spin text-gray-400" />
                            ) : isConnected ? (
                                <Check size={24} className="text-green-600" />
                            ) : (
                                <platform.Icon size={24} className={platform.textColor} />
                            )}
                            <span className="text-gray-700">{platform.name}</span>
                        </button>
                    );
                })}
            </div>

            {connectedPlatforms.length > 0 && (
                <button
                    onClick={onNext}
                    className="px-6 h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                >
                    Continue
                </button>
            )}
        </div>
    );
}
