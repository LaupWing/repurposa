import { useState } from '@wordpress/element';
import { X, Check, Zap, Info, ArrowRight } from 'lucide-react';
import { getConfig } from '@/services/client';

const SnelstackIcon = () => (
    <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 p-1.5 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
        </svg>
    </div>
);

interface SnelstackBannerProps {
    contentLang?: string;
    compact?: boolean;
}

export default function SnelstackBanner({ contentLang = 'en', compact = false }: SnelstackBannerProps) {
    const { snelstackLang } = getConfig();
    const [modalOpen, setModalOpen] = useState(false);

    if (snelstackLang === null) {
        if (compact) return null;
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                <Zap size={16} className="shrink-0" />
                <span>No Snelstack theme detected — content published as-is.</span>
            </div>
        );
    }

    const langsMatch = contentLang === snelstackLang;

    if (compact) {
        return (
            <>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
                        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                                <div className="flex items-center gap-2.5">
                                    <SnelstackIcon />
                                    <h2 className="text-base font-semibold text-gray-900">Snelstack Language Flow</h2>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="px-5 py-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5">
                                        <p className="text-xs text-gray-500 mb-0.5">Your content language</p>
                                        <p className="text-sm font-semibold text-gray-900">{contentLang.toUpperCase()}</p>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-400 shrink-0" />
                                    <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5">
                                        <p className="text-xs text-gray-500 mb-0.5">Site default language</p>
                                        <p className="text-sm font-semibold text-gray-900">{snelstackLang.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="space-y-2.5 text-sm text-gray-600">
                                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <Check size={15} className="text-green-500 shrink-0 mt-0.5" />
                                        <p>Posts are always generated in your <strong>content language</strong> ({contentLang.toUpperCase()}).</p>
                                    </div>
                                    {langsMatch ? (
                                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-50 border border-green-200">
                                            <Check size={15} className="text-green-500 shrink-0 mt-0.5" />
                                            <p>Languages match — posts publish <strong>as-is</strong> to your Snelstack site.</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                            <Zap size={15} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p>Languages differ — Repurposa will <strong>auto-translate</strong> to <strong>{snelstackLang.toUpperCase()}</strong> before publishing.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                    Got it
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Snelstack language flow"
                >
                    <SnelstackIcon />
                </button>
            </>
        );
    }

    return (
        <>
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <div className="flex items-center gap-2.5">
                                <SnelstackIcon />
                                <h2 className="text-base font-semibold text-gray-900">Snelstack Language Flow</h2>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5">
                                    <p className="text-xs text-gray-500 mb-0.5">Your content language</p>
                                    <p className="text-sm font-semibold text-gray-900">{contentLang.toUpperCase()}</p>
                                </div>
                                <ArrowRight size={16} className="text-gray-400 shrink-0" />
                                <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5">
                                    <p className="text-xs text-gray-500 mb-0.5">Site default language</p>
                                    <p className="text-sm font-semibold text-gray-900">{snelstackLang.toUpperCase()}</p>
                                </div>
                            </div>

                            <div className="space-y-2.5 text-sm text-gray-600">
                                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                    <Check size={15} className="text-green-500 shrink-0 mt-0.5" />
                                    <p>Posts are always generated in your <strong>content language</strong> ({contentLang.toUpperCase()}).</p>
                                </div>
                                {langsMatch ? (
                                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-50 border border-green-200">
                                        <Check size={15} className="text-green-500 shrink-0 mt-0.5" />
                                        <p>Languages match — posts publish <strong>as-is</strong> to your Snelstack site.</p>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                        <Zap size={15} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p>Languages differ — Repurposa will <strong>auto-translate</strong> to <strong>{snelstackLang.toUpperCase()}</strong> before publishing.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button onClick={() => setModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors text-left">
                <SnelstackIcon />
                <span className="flex-1">
                    <strong>Snelstack detected</strong> — site default language is <strong>{snelstackLang.toUpperCase()}</strong>. Full language flow enabled.
                </span>
                <Info size={15} className="shrink-0 text-blue-400" />
            </button>
        </>
    );
}
