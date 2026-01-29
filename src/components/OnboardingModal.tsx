/**
 * Onboarding Modal
 *
 * First-time setup to collect business info for better AI content.
 * Shows as a blocking modal until completed.
 */

import { useState } from '@wordpress/element';
import { Spinner } from '@wordpress/components';

// ============================================
// TYPES
// ============================================

export interface ProfileData {
    business_type: string;
    target_audience: string;
    brand_voice: 'conversational' | 'professional' | 'bold';
}

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: (data: ProfileData) => void;
}

// ============================================
// CONSTANTS
// ============================================

const BUSINESS_TYPES = [
    { value: 'coaching', label: 'Coaching' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'course', label: 'Course' },
    { value: 'digital-products', label: 'Digital Products' },
    { value: 'saas', label: 'SaaS' },
    { value: 'agency', label: 'Agency' },
    { value: 'freelance', label: 'Freelance Services' },
    { value: 'ecommerce', label: 'eCommerce' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'membership', label: 'Membership / Community' },
    { value: 'content-creator', label: 'Content Creator' },
    { value: 'local-business', label: 'Local Business' },
    { value: 'other', label: 'Other' },
];

const BRAND_VOICES = ['conversational', 'professional', 'bold'] as const;

// ============================================
// COMPONENT
// ============================================

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
    const [data, setData] = useState<ProfileData & { business_type_other: string }>({
        business_type: '',
        business_type_other: '',
        target_audience: '',
        brand_voice: 'conversational',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = () => {
        const hasBusinessType =
            data.business_type &&
            (data.business_type !== 'other' || data.business_type_other.trim());
        return hasBusinessType && data.target_audience.trim();
    };

    const handleSubmit = async () => {
        if (!canSubmit()) return;

        setIsSubmitting(true);

        // Use custom business type if "other" is selected
        const finalBusinessType =
            data.business_type === 'other'
                ? data.business_type_other
                : data.business_type;

        // TODO: Save to WordPress options via REST API
        // For now, just complete the onboarding
        await new Promise(resolve => setTimeout(resolve, 500));

        onComplete({
            business_type: finalBusinessType,
            target_audience: data.target_audience,
            brand_voice: data.brand_voice,
        });

        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Quick Setup - About Your Business
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Tell us about your business so we can create better content (takes 30 seconds)
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-5">
                    {/* Business Type */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            What do you sell? <span className="font-normal text-gray-500">(Business type)</span>
                        </label>
                        <select
                            value={data.business_type}
                            onChange={(e) =>
                                setData({
                                    ...data,
                                    business_type: e.target.value,
                                    business_type_other:
                                        e.target.value !== 'other' ? '' : data.business_type_other,
                                })
                            }
                            className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">Select...</option>
                            {BUSINESS_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>

                        {data.business_type === 'other' && (
                            <input
                                type="text"
                                placeholder="Please specify..."
                                value={data.business_type_other}
                                onChange={(e) =>
                                    setData({ ...data, business_type_other: e.target.value })
                                }
                                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Who's it for? <span className="font-normal text-gray-500">(Target audience)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., small business owners"
                            value={data.target_audience}
                            onChange={(e) =>
                                setData({ ...data, target_audience: e.target.value })
                            }
                            className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Brand Voice */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Brand voice
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {BRAND_VOICES.map((voice) => (
                                <button
                                    key={voice}
                                    type="button"
                                    onClick={() => setData({ ...data, brand_voice: voice })}
                                    className={`h-11 px-4 rounded-lg text-sm font-medium transition-colors ${
                                        data.brand_voice === voice
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {voice.charAt(0).toUpperCase() + voice.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 space-y-3">
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit() || isSubmitting}
                        className="w-full h-11 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner />
                                Saving...
                            </>
                        ) : (
                            'Complete Setup'
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-500">
                        You can change these settings anytime in your profile
                    </p>
                </div>
            </div>
        </div>
    );
}
