import { useState } from '@wordpress/element';
import { Check, AlertTriangle, X } from 'lucide-react';

interface ConfirmGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (includeCta: boolean) => void;
    isPublished?: boolean;
}

export default function ConfirmGenerateModal({
    isOpen,
    onClose,
    onConfirm,
    isPublished,
}: ConfirmGenerateModalProps) {
    const [includeCta, setIncludeCta] = useState(!!isPublished);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Generate Short Posts</h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    {/* CTA Checkbox */}
                    <label
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isPublished
                                ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                                : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <div className="relative flex items-center justify-center mt-0.5">
                            <input
                                type="checkbox"
                                checked={includeCta}
                                onChange={(e) => setIncludeCta(e.target.checked)}
                                disabled={!isPublished}
                                className="sr-only"
                            />
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    includeCta && isPublished
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'border-gray-300 bg-white'
                                }`}
                            >
                                {includeCta && isPublished && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-900">Include CTA to blog post</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Add a call-to-action linking back to your published blog.
                            </p>
                        </div>
                    </label>

                    {/* Warning if not published */}
                    {!isPublished && (
                        <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                                Publish your blog first to enable CTAs that link back to your post.
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(includeCta && !!isPublished)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Generate Short Posts
                    </button>
                </div>
            </div>
        </div>
    );
}
