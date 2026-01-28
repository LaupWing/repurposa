/**
 * Connections Page
 *
 * Connect and manage social media accounts.
 */

import { Share2, Twitter, Linkedin, Check, ExternalLink } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface SocialPlatform {
    id: string;
    name: string;
    icon: React.ReactNode;
    connected: boolean;
    username?: string;
    color: string;
}

// ============================================
// MOCK DATA (will be replaced with real data)
// ============================================

const platforms: SocialPlatform[] = [
    {
        id: 'twitter',
        name: 'Twitter / X',
        icon: <Twitter size={20} />,
        connected: false,
        color: 'bg-black',
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: <Linkedin size={20} />,
        connected: false,
        color: 'bg-blue-700',
    },
];

// ============================================
// COMPONENT
// ============================================

export default function ConnectionsPage() {
    const handleConnect = (platformId: string) => {
        // TODO: Implement OAuth flow
        console.log('Connecting to:', platformId);
        alert(`Connect to ${platformId} - OAuth flow coming soon!`);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Connect your social media accounts to post directly
                </p>
            </div>

            {/* Platforms Grid */}
            <div className="grid gap-4 max-w-2xl">
                {platforms.map((platform) => (
                    <div
                        key={platform.id}
                        className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            {/* Platform Icon */}
                            <div className={`w-10 h-10 ${platform.color} text-white rounded-lg flex items-center justify-center`}>
                                {platform.icon}
                            </div>

                            {/* Platform Info */}
                            <div>
                                <h3 className="font-medium text-gray-900">{platform.name}</h3>
                                {platform.connected ? (
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                        <Check size={14} />
                                        Connected as @{platform.username}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500">Not connected</p>
                                )}
                            </div>
                        </div>

                        {/* Connect/Disconnect Button */}
                        {platform.connected ? (
                            <button
                                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Disconnect
                            </button>
                        ) : (
                            <button
                                onClick={() => handleConnect(platform.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Connect
                                <ExternalLink size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div className="mt-6 max-w-2xl bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-sm text-gray-700">
                    <span className="font-semibold text-blue-600">Note:</span>{' '}
                    Connecting your accounts allows you to post directly from this plugin.
                    We never post without your permission.
                </p>
            </div>
        </div>
    );
}
