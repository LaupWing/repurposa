/**
 * Blog Wizard Component - TypeScript + Tailwind v4
 */

import { useState } from '@wordpress/element';
import { FileText, ArrowRight, Sparkles } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface OutlineSection {
    id: string;
    title: string;
    purpose: string;
}

export interface WizardData {
    topic: string;
    roughOutline: string[];
    outline: OutlineSection[];
    generatedTitle?: string;
    generatedContent?: string;
}

interface BlogWizardProps {
    onComplete: (data: WizardData) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function BlogWizard({ onComplete }: BlogWizardProps) {
    // ============================================
    // STATE
    // ============================================
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [data, setData] = useState<WizardData>({
        topic: '',
        roughOutline: [],
        outline: [],
    });

    // ============================================
    // HELPERS
    // ============================================
    const canProceed = (): boolean => data.topic.trim().length > 0;
    const nextStep = (): void => { if (currentStep < 3) setCurrentStep(currentStep + 1); };
    const prevStep = (): void => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

    const updateField = <K extends keyof WizardData>(field: K, value: WizardData[K]): void => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="max-w-3xl mx-auto mt-6">
            {/* Card Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">

                {/* ====== HEADER ====== */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Create <em className="font-normal italic">New Blog</em>
                    </h2>
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-600">
                        Step {currentStep} of 3
                    </span>
                </div>

                {/* ====== PROGRESS BAR ====== */}
                <div className="flex gap-1.5 px-6 py-4">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`flex-1 h-1 rounded-full transition-colors ${
                                currentStep >= step
                                    ? 'bg-blue-600'
                                    : 'bg-gray-200'
                            }`}
                        />
                    ))}
                </div>

                {/* ====== CONTENT ====== */}
                <div className="px-6 py-6 min-h-75">

                    {/* STEP 1: Topic */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <FileText size={16} className="text-blue-600" />
                                What's this blog about?
                            </label>

                            <textarea
                                value={data.topic}
                                onChange={(e) => updateField('topic', e.target.value)}
                                placeholder="e.g., 5 mistakes beginners make that sabotage their weight loss"
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />

                            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold text-blue-600">Tip:</span>{' '}
                                    Be specific! Instead of "weight loss tips", try
                                    "5 mistakes busy moms make when trying to lose weight"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Rough Outline (placeholder) */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Your topic: <span className="font-medium text-gray-900">{data.topic}</span>
                            </p>
                            <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                                <p className="text-gray-500">Step 2: Rough Outline - Coming soon!</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Generate (placeholder) */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Your topic: <span className="font-medium text-gray-900">{data.topic}</span>
                            </p>
                            <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                                <p className="text-gray-500">Step 3: Review & Generate - Coming soon!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ====== FOOTER ====== */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    {currentStep > 1 ? (
                        <button
                            onClick={prevStep}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {currentStep < 3 ? (
                        <button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={() => onComplete(data)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Sparkles size={16} />
                            Generate Blog
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
