/**
 * Blog Wizard Component
 *
 * Multi-step wizard for creating blog posts:
 * - Step 1: Topic selection
 * - Step 2: Rough outline (coming soon)
 * - Step 3: Review & generate (coming soon)
 */

import { useState } from '@wordpress/element';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

// Steps
import Step1Topic from './steps/Step1Topic';

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
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [data, setData] = useState<WizardData>({
        topic: '',
        roughOutline: [],
        outline: [],
    });

    // ============================================
    // HELPERS
    // ============================================
    const canProceed = (): boolean => {
        if (currentStep === 1) return data.topic.trim().length > 0;
        return true;
    };

    const nextStep = (): void => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const prevStep = (): void => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const updateTopic = (topic: string): void => {
        setData(prev => ({ ...prev, topic }));
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="max-w-3xl mx-auto mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Create <em className="font-normal italic">New Blog</em>
                    </h2>
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-600">
                        Step {currentStep} of 3
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-1.5 px-6 py-4">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`flex-1 h-1 rounded-full transition-colors ${
                                currentStep >= step ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 py-6 min-h-75">
                    {currentStep === 1 && (
                        <Step1Topic
                            topic={data.topic}
                            onTopicChange={updateTopic}
                        />
                    )}

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

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    {currentStep > 1 ? (
                        <button
                            onClick={prevStep}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={16} />
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
