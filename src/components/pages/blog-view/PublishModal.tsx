import { useState } from '@wordpress/element';
import { X, Check } from 'lucide-react';

export function PublishModal({
    isOpen,
    onClose,
    onPublish,
}: {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (publishNow: boolean) => void;
}) {
    const [publishNow, setPublishNow] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Publish to WordPress</h2>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-sm text-gray-600 mb-5">
                        This will publish your blog post to WordPress. Once published, it will be visible on your website.
                    </p>

                    {/* Checkbox */}
                    <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-colors">
                        <div className="relative flex items-center justify-center mt-0.5">
                            <input
                                type="checkbox"
                                checked={publishNow}
                                onChange={(e) => setPublishNow(e.target.checked)}
                                className="sr-only"
                            />
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    publishNow
                                        ? 'bg-[#2271b1] border-[#2271b1]'
                                        : 'border-gray-300 bg-white'
                                }`}
                            >
                                {publishNow && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-900">Publish right away</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Also publish scheduled social media posts immediately
                            </p>
                        </div>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onPublish(publishNow)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#2271b1] hover:bg-[#135e96] rounded-lg transition-colors"
                    >
                        Publish
                    </button>
                </div>
            </div>
        </div>
    );
}
