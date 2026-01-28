/**
 * Blog Wizard Component
 *
 * A multi-step wizard for creating blog posts:
 * - Step 1: Enter topic (what's the blog about?)
 * - Step 2: Add rough outline ideas (coming soon)
 * - Step 3: Review & generate (coming soon)
 *
 * We're building this step by step so you can understand each part.
 */

import { useState } from '@wordpress/element';
import { Button, TextareaControl } from '@wordpress/components';
import { FileText, ArrowRight, Sparkles } from 'lucide-react';

export default function BlogWizard({ onComplete }) {
    // ============================================
    // STATE - All the data we're tracking
    // ============================================

    // Which step are we on? (1, 2, or 3)
    const [currentStep, setCurrentStep] = useState(1);

    // The wizard data - this will grow as we add more steps
    const [data, setData] = useState({
        topic: '',           // Step 1: What's the blog about?
        roughOutline: [],    // Step 2: User's ideas (coming soon)
        outline: [],         // Step 3: AI-generated outline (coming soon)
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    // Can we proceed to next step?
    const canProceed = () => {
        if (currentStep === 1) {
            return data.topic.trim().length > 0;
        }
        return true;
    };

    // Go to next step
    const nextStep = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    // Go to previous step
    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Update a field in our data
    const updateField = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    // ============================================
    // RENDER - What the user sees
    // ============================================

    return (
        <div className="wbrp-wizard">
            {/* ====== HEADER ====== */}
            <div className="wbrp-wizard-header">
                <h2>
                    Create <em>New Blog</em>
                </h2>
                <span className="wbrp-step-badge">
                    Step {currentStep} of 3
                </span>
            </div>

            {/* ====== PROGRESS BAR ====== */}
            <div className="wbrp-progress">
                <div className={`wbrp-progress-step ${currentStep >= 1 ? 'active' : ''}`} />
                <div className={`wbrp-progress-step ${currentStep >= 2 ? 'active' : ''}`} />
                <div className={`wbrp-progress-step ${currentStep >= 3 ? 'active' : ''}`} />
            </div>

            {/* ====== STEP CONTENT ====== */}
            <div className="wbrp-wizard-content">
                {/* STEP 1: Topic */}
                {currentStep === 1 && (
                    <div className="wbrp-step wbrp-step-topic">
                        <div className="wbrp-input-group">
                            <label className="wbrp-input-label">
                                <FileText size={16} />
                                <span>What's this blog about?</span>
                            </label>
                            <TextareaControl
                                value={data.topic}
                                onChange={(value) => updateField('topic', value)}
                                placeholder="e.g., 5 mistakes beginners make that sabotage their weight loss"
                                rows={4}
                            />
                        </div>

                        <div className="wbrp-tip">
                            <strong>Tip:</strong> Be specific! Instead of "weight loss tips",
                            try "5 mistakes busy moms make when trying to lose weight"
                        </div>
                    </div>
                )}

                {/* STEP 2: Rough Outline (placeholder) */}
                {currentStep === 2 && (
                    <div className="wbrp-step wbrp-step-outline">
                        <p>Step 2: Rough Outline - Coming soon!</p>
                        <p>Current topic: {data.topic}</p>
                    </div>
                )}

                {/* STEP 3: Generate (placeholder) */}
                {currentStep === 3 && (
                    <div className="wbrp-step wbrp-step-generate">
                        <p>Step 3: Review & Generate - Coming soon!</p>
                        <p>Current topic: {data.topic}</p>
                    </div>
                )}
            </div>

            {/* ====== FOOTER NAVIGATION ====== */}
            <div className="wbrp-wizard-footer">
                {/* Back button (hidden on step 1) */}
                {currentStep > 1 ? (
                    <Button variant="secondary" onClick={prevStep}>
                        Back
                    </Button>
                ) : (
                    <div /> /* Empty div to maintain spacing */
                )}

                {/* Next/Generate button */}
                {currentStep < 3 ? (
                    <Button
                        variant="primary"
                        onClick={nextStep}
                        disabled={!canProceed()}
                    >
                        Next
                        <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        onClick={() => onComplete(data)}
                    >
                        <Sparkles size={16} style={{ marginRight: '8px' }} />
                        Generate Blog
                    </Button>
                )}
            </div>
        </div>
    );
}
