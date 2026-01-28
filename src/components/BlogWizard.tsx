/**
 * Blog Wizard Component
 *
 * Multi-step wizard for creating blog posts:
 * - Step 1: Topic selection
 * - Step 2: Rough outline (add your ideas)
 * - Step 3: Review generated outline & generate blog
 */

import { useState } from '@wordpress/element';
import { ArrowRight, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';

// Steps
import Step1Topic from './steps/Step1Topic';
import Step2RoughOutline from './steps/Step2RoughOutline';
import Step3GeneratedOutline from './steps/Step3GeneratedOutline';
import { GeneratingOverlay } from './GeneratingOverlay';

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
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
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

    const updateRoughOutline = (roughOutline: string[]): void => {
        setData(prev => ({ ...prev, roughOutline }));
    };

    const updateOutline = (outline: OutlineSection[]): void => {
        setData(prev => ({ ...prev, outline }));
    };

    // Generate outline from topic + rough ideas (placeholder for AI)
    const handleGenerateOutline = async (): Promise<void> => {
        setIsGeneratingOutline(true);

        // Simulate AI call - replace with actual API call later
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock generated outline based on topic
        const mockOutline: OutlineSection[] = [
            {
                id: 'section-1',
                title: 'Introduction',
                purpose: 'Hook the reader and introduce the main topic',
            },
            {
                id: 'section-2',
                title: 'The Problem',
                purpose: 'Explain the common challenges and pain points',
            },
            {
                id: 'section-3',
                title: 'Key Insights',
                purpose: 'Share the main learnings and discoveries',
            },
            {
                id: 'section-4',
                title: 'Practical Steps',
                purpose: 'Provide actionable advice readers can implement',
            },
            {
                id: 'section-5',
                title: 'Conclusion',
                purpose: 'Summarize key points and call to action',
            },
        ];

        setData(prev => ({ ...prev, outline: mockOutline }));
        setIsGeneratingOutline(false);
        setCurrentStep(3);
    };

    // Generate full blog from outline (placeholder for AI)
    const handleGenerateBlog = async (): Promise<void> => {
        setIsGeneratingBlog(true);

        // Simulate AI call - replace with actual API call later
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Mock generated content
        const mockContent = `<h2>Introduction</h2>
<p>This is your AI-generated blog post about: ${data.topic}</p>
<p>The content will be generated based on your outline and ideas.</p>

<h2>The Problem</h2>
<p>Here we discuss the challenges...</p>

<h2>Key Insights</h2>
<p>The main learnings include...</p>

<h2>Practical Steps</h2>
<p>Here's what you can do...</p>

<h2>Conclusion</h2>
<p>To wrap up...</p>`;

        setIsGeneratingBlog(false);

        onComplete({
            ...data,
            generatedTitle: data.topic,
            generatedContent: mockContent,
        });
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="max-w-3xl mx-auto mt-6">
            <div className="relative bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Generating Overlays */}
                {isGeneratingOutline && (
                    <GeneratingOverlay
                        title="Crafting Your Outline"
                        description="Analyzing your topic and ideas to create a compelling blog structure..."
                    />
                )}
                {isGeneratingBlog && (
                    <GeneratingOverlay
                        title="Writing Your Blog"
                        description="Creating engaging content based on your outline..."
                    />
                )}

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
                        <Step2RoughOutline
                            topic={data.topic}
                            roughOutline={data.roughOutline}
                            onRoughOutlineChange={updateRoughOutline}
                        />
                    )}

                    {currentStep === 3 && (
                        <Step3GeneratedOutline
                            topic={data.topic}
                            outline={data.outline}
                            onOutlineChange={updateOutline}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    {currentStep > 1 ? (
                        <button
                            onClick={prevStep}
                            disabled={isGeneratingOutline || isGeneratingBlog}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {currentStep === 1 && (
                        <button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <ArrowRight size={16} />
                        </button>
                    )}

                    {currentStep === 2 && (
                        <button
                            onClick={handleGenerateOutline}
                            disabled={isGeneratingOutline}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isGeneratingOutline ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generate <em className="font-normal italic ml-0.5">Outline</em>
                                </>
                            )}
                        </button>
                    )}

                    {currentStep === 3 && (
                        <button
                            onClick={handleGenerateBlog}
                            disabled={isGeneratingBlog || data.outline.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isGeneratingBlog ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generate Blog
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
