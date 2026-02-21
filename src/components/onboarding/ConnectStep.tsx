import { Loader2, Check } from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';

const CONNECT_PLATFORMS = [
    { id: 'twitter', name: 'X / Twitter', Icon: RiTwitterXFill, color: '', comingSoon: false },
    { id: 'linkedin', name: 'LinkedIn', Icon: RiLinkedinFill, color: 'text-[#0A66C2]', comingSoon: false },
    { id: 'threads', name: 'Threads', Icon: RiThreadsFill, color: '', comingSoon: true },
    { id: 'instagram', name: 'Instagram', Icon: RiInstagramFill, color: 'text-[#E4405F]', comingSoon: true },
    { id: 'facebook', name: 'Facebook', Icon: RiFacebookFill, color: 'text-[#1877F2]', comingSoon: true },
] as const;

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
                            disabled={platform.comingSoon || isConnected || isConnecting}
                            onClick={() => onConnect(platform.id)}
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
                onClick={onNext}
                className="text-sm text-gray-500 cursor-pointer hover:text-gray-900 transition-colors"
            >
                {connectedPlatforms.length > 0 ? 'Continue' : 'Skip for now'}
            </button>
        </div>
    );
}
