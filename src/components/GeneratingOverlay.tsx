/**
 * Generating Overlay Component
 *
 * Shows a loading overlay with animated spinner while AI generates content.
 */

import { AnimatedText } from '@/components/AnimatedText';

interface GeneratingOverlayProps {
    title: string;
    descriptions: string[];
}

export function GeneratingOverlay({ title, descriptions }: GeneratingOverlayProps) {
    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center space-y-6 bg-white/80 backdrop-blur-sm rounded-lg">
            <div className="relative">
                {/* Static outer circle */}
                <div className="h-14 w-14 rounded-full border-2 border-gray-200" />
                {/* Spinning gradient border */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-14 w-14 animate-spin overflow-hidden rounded-full">
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background:
                                    'conic-gradient(from 0deg, transparent 0deg, transparent 60deg, #06b6d4 60deg, #3b82f6 120deg, #8b5cf6 180deg, #d946ef 220deg, #f43f5e 260deg, #f97316 300deg, #eab308 330deg, transparent 360deg)',
                                mask: 'radial-gradient(transparent 60%, black 61%)',
                                WebkitMask: 'radial-gradient(transparent 60%, black 61%)',
                            }}
                        />
                    </div>
                </div>
                {/* Center sparkle icon */}
                <svg
                    className="absolute inset-0 m-auto h-5 w-5 animate-pulse"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="sparklesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="33%" stopColor="#3b82f6" />
                            <stop offset="66%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                    </defs>
                    <path
                        d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
                        stroke="url(#sparklesGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M5 3v4M19 17v4M3 5h4M17 19h4"
                        stroke="url(#sparklesGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <div className="space-y-2 text-center">
                <h3
                    className="animate-shimmer bg-clip-text text-lg font-semibold"
                    style={{
                        backgroundImage:
                            'linear-gradient(90deg, #111827 0%, #111827 40%, #06b6d4 45%, #3b82f6 50%, #8b5cf6 55%, #d946ef 60%, #111827 65%, #111827 100%)',
                        backgroundSize: '200% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {title}
                </h3>
                <AnimatedText texts={descriptions} interval={1800} className="text-sm text-gray-500" />
            </div>
        </div>
    );
}
