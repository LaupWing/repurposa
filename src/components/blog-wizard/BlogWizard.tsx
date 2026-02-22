/**
 * Blog Wizard Component
 *
 * Multi-step wizard for creating blog posts:
 * - Step 1: Topic selection
 * - Step 2: Rough outline (add your ideas)
 * - Step 3: Review generated outline & generate blog
 */

import { useState, useEffect, useRef } from "@wordpress/element";
import { ArrowRight, ArrowLeft, Sparkles, Loader2, SkipForward, Check } from "lucide-react";
import { toast } from "sonner";

// Steps
import Step1Topic from "./steps/Step1Topic";
import Step2RoughOutline from "./steps/Step2RoughOutline";
import Step3GeneratedOutline from "./steps/Step3GeneratedOutline";
import ConfirmGenerateBlogModal from "./ConfirmGenerateBlogModal";
import { GeneratingOverlay } from "@/components/GeneratingOverlay";

// API & Context
import {
  generateOutline,
  generateBlog,
  createEmptyBlog,
  getWizard,
  createWizard,
  updateWizard,
} from "@/services/blogApi";
import type { TopicSuggestion, TopicHistoryEntry, BlogGenerationMode } from "@/types";
import { useProfileStore } from "@/store/profileStore";

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
  targetAudience: string;
  generatedTopics: TopicSuggestion[];
  topicHistory: TopicHistoryEntry[];
  topicHistoryIndex: number;
  roughOutline: string[];
  outline: OutlineSection[];
  generatedBlogId?: number;
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
  const { profile } = useProfileStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [data, setData] = useState<WizardData>({
    topic: "",
    targetAudience: profile?.target_audience || "",
    generatedTopics: [],
    topicHistory: [],
    topicHistoryIndex: 0,
    roughOutline: [],
    outline: [],
  });

  // ============================================
  // WIZARD LIFECYCLE
  // ============================================
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const wizard = await getWizard();
        if (cancelled) return;

        setData({
          topic: wizard.topic || "",
          targetAudience:
            wizard.target_audience || profile?.target_audience || "",
          generatedTopics: wizard.generated_topics || [],
          topicHistory: wizard.topic_history || [],
          topicHistoryIndex: wizard.topic_history_index || 0,
          roughOutline: wizard.rough_outline || [],
          outline: (wizard.outline || []).map((s, i) => ({
            id: `section-${i + 1}`,
            title: s.title,
            purpose: s.purpose,
          })),
        });
        setCurrentStep(wizard.current_step || 1);
      } catch {
        // 404 = no wizard yet, create one
        try {
          await createWizard();
        } catch (err) {
          console.error("Failed to create wizard:", err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced auto-save for topic + target_audience
  const isInitialized = useRef(false);
  useEffect(() => {
    // Skip the first render (initial state / wizard load)
    if (!isInitialized.current) {
      if (!isLoading) isInitialized.current = true;
      return;
    }

    const timer = setTimeout(() => {
      updateWizard({
        topic: data.topic || null,
        target_audience: data.targetAudience || null,
      }).catch((err) => console.error("Failed to auto-save wizard:", err));
    }, 500);

    return () => clearTimeout(timer);
  }, [data.topic, data.targetAudience]);

  // Debounced auto-save for rough_outline
  useEffect(() => {
    if (!isInitialized.current) return;

    const timer = setTimeout(() => {
      updateWizard({
        rough_outline: data.roughOutline.length > 0 ? data.roughOutline : null,
      }).catch((err) => console.error("Failed to auto-save wizard:", err));
    }, 500);

    return () => clearTimeout(timer);
  }, [data.roughOutline]);

  // Debounced auto-save for outline
  useEffect(() => {
    if (!isInitialized.current) return;

    const timer = setTimeout(() => {
      const outlineForApi =
        data.outline.length > 0
          ? data.outline.map((s) => ({ title: s.title, purpose: s.purpose }))
          : null;
      updateWizard({ outline: outlineForApi }).catch((err) =>
        console.error("Failed to auto-save wizard:", err),
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [data.outline]);

  // ============================================
  // HELPERS
  // ============================================
  const canProceed = (): boolean => {
    if (currentStep === 1) return data.topic.trim().length > 0;
    return true;
  };

  const handleStep1Next = (): void => {
    setCurrentStep(2);
    updateWizard({
      topic: data.topic,
      target_audience: data.targetAudience,
      topic_history: data.topicHistory.length > 0 ? data.topicHistory : null,
      topic_history_index: data.topicHistoryIndex,
      current_step: 2,
    }).catch((err) => console.error("Failed to save wizard:", err));
  };

  const prevStep = (): void => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const updateTopic = (topic: string): void => {
    setData((prev) => ({ ...prev, topic }));
  };

  const updateRoughOutline = (roughOutline: string[]): void => {
    setData((prev) => ({ ...prev, roughOutline }));
  };

  const updateOutline = (outline: OutlineSection[]): void => {
    setData((prev) => ({ ...prev, outline }));
  };

  // Generate outline from topic + rough ideas
  const handleGenerateOutline = async (): Promise<void> => {
    setIsGeneratingOutline(true);

    try {
      const response = await generateOutline(data.topic, data.roughOutline, {
        target_audience: data.targetAudience || profile?.target_audience,
      });

      // Convert API response to our format (add IDs)
      const outlineWithIds: OutlineSection[] = response.sections.map(
        (section, index) => ({
          id: `section-${index + 1}`,
          title: section.title,
          purpose: section.purpose,
        }),
      );

      setData((prev) => ({ ...prev, outline: outlineWithIds }));
      setCurrentStep(3);
    } catch (error) {
      console.error("Failed to generate outline:", error);
      toast.error("Failed to generate outline", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // Skip all steps — create an empty blog and go to the editor
  const handleSkipAll = async (): Promise<void> => {
    setIsGeneratingBlog(true);
    try {
      const blog = await createEmptyBlog();
      window.location.href = `admin.php?page=blog-repurpose-blogs&post_id=${blog.id}`;
    } catch (error) {
      console.error("Failed to create blog:", error);
      toast.error("Failed to create blog", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGeneratingBlog(false);
    }
  };

  // Generate full blog from outline
  const handleGenerateBlog = async (mode: BlogGenerationMode): Promise<void> => {
    setShowConfirmModal(false);
    setIsGeneratingBlog(true);

    try {
      // Convert outline back to API format (without IDs)
      const outlineForApi = data.outline.map((section) => ({
        title: section.title,
        purpose: section.purpose,
      }));

      const response = await generateBlog(data.topic, outlineForApi, {
        target_audience: data.targetAudience || profile?.target_audience,
        mode,
      });

      onComplete({
        ...data,
        generatedBlogId: response.id,
        generatedTitle: response.title,
        generatedContent: response.content,
      });
    } catch (error) {
      console.error("Failed to generate blog:", error);
      toast.error("Failed to generate blog", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGeneratingBlog(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

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
            Create <em className="font-serif font-normal italic">New Blog</em>
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-600">
              Step {currentStep} of 3
            </span>
            {currentStep < 3 && (
              <button
                onClick={handleSkipAll}
                disabled={isGeneratingOutline || isGeneratingBlog}
                className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <SkipForward size={12} />
                Skip All
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1.5 px-6 py-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-1 rounded-full transition-colors ${
                currentStep >= step ? "bg-blue-600" : "bg-gray-200"
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
              targetAudience={data.targetAudience}
              onTargetAudienceChange={(value) =>
                setData((prev) => ({ ...prev, targetAudience: value }))
              }
              generatedTopics={data.generatedTopics}
              onGeneratedTopicsChange={(topics) =>
                setData((prev) => ({ ...prev, generatedTopics: topics }))
              }
              topicHistory={data.topicHistory}
              topicHistoryIndex={data.topicHistoryIndex}
              onTopicHistoryUpdate={(history, index) =>
                setData((prev) => ({
                  ...prev,
                  topicHistory: history,
                  topicHistoryIndex: index,
                }))
              }
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
              onClick={handleStep1Next}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight size={16} />
            </button>
          )}

          {currentStep === 2 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${
                  data.outline.length > 0
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isGeneratingOutline ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" size={16} />
                    {data.outline.length > 0 ? "Regenerate" : "Generate"}{" "}
                    <em className="font-serif font-normal italic ml-1">
                      Outline
                    </em>
                  </>
                )}
              </button>
              {data.outline.length > 0 && (
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={isGeneratingOutline}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <button
              onClick={() => setShowConfirmModal(true)}
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

      <ConfirmGenerateBlogModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleGenerateBlog}
      />
    </div>
  );
}
