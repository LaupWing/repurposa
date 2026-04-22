/**
 * Blog Wizard Component
 *
 * Multi-step wizard for creating blog posts:
 * - Step 1: Topic selection
 * - Step 2: Rough outline (add your ideas)
 * - Step 3: Review generated outline & generate blog
 */

import { useState, useEffect, useRef } from "@wordpress/element";
import { ArrowRight, ArrowLeft, Sparkles, Loader2, SkipForward, Check, X } from "lucide-react";
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
  refineOutline,
  generateBlog,
  createEmptyBlog,
  getWizard,
  createWizard,
  updateWizard,
} from "@/services/blogApi";
import type { TopicSuggestion, BlogGenerationMode } from "@/types";
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
  const [showRefinePopover, setShowRefinePopover] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [isRefiningOutline, setIsRefiningOutline] = useState(false);
  const [refinedOutline, setRefinedOutline] = useState<OutlineSection[] | null>(null);
  const [data, setData] = useState<WizardData>({
    topic: "",
    targetAudience: profile?.target_audience || "",
    generatedTopics: [],
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
      window.location.href = `admin.php?page=repurposa-blogs&post_id=${blog.id}`;
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

  // Refine outline with AI — fetch preview
  const handleRefineOutline = async (): Promise<void> => {
    if (!refineInstruction.trim()) return;
    setIsRefiningOutline(true);
    try {
      const outlineForApi = data.outline.map((s) => ({
        title: s.title,
        purpose: s.purpose,
      }));

      const response = await refineOutline(
        data.topic,
        outlineForApi,
        refineInstruction,
        { target_audience: data.targetAudience || profile?.target_audience },
      );

      const outlineWithIds = response.sections.map((section, index) => ({
        id: `section-${index + 1}`,
        title: section.title,
        purpose: section.purpose,
      }));

      setRefinedOutline(outlineWithIds);
    } catch (error) {
      console.error("Failed to refine outline:", error);
      toast.error("Failed to refine outline", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsRefiningOutline(false);
    }
  };

  // Accept refined outline — update local state + persist to wizard
  const handleAcceptRefinedOutline = () => {
    if (refinedOutline) {
      setData((prev) => ({ ...prev, outline: refinedOutline }));
      updateWizard({
        outline: refinedOutline.map((s) => ({ title: s.title, purpose: s.purpose })),
      }).catch((err) => console.error("Failed to save refined outline:", err));
      toast.success("Outline updated!");
    }
    setRefinedOutline(null);
    setRefineInstruction("");
  };

  // Discard refined outline
  const handleDiscardRefinedOutline = () => {
    setRefinedOutline(null);
    setRefineInstruction("");
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
            descriptions={[
                'Analyzing your topic and ideas...',
                'Researching key talking points...',
                'Structuring a compelling flow...',
                'Finalizing your outline...',
            ]}
          />
        )}
        {isGeneratingBlog && (
          <GeneratingOverlay
            title="Writing Your Blog"
            descriptions={[
                'Creating engaging content...',
                'Developing each section...',
                'Adding depth and detail...',
                'Polishing the final draft...',
            ]}
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
            <div className="relative flex items-center gap-1">
              <button
                onClick={() => setShowRefinePopover(true)}
                disabled={isGeneratingBlog || isRefiningOutline || data.outline.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 border border-gray-200 disabled:opacity-50 transition-colors"
              >
                <Sparkles size={16} className="text-blue-600" />
                Refine Outline
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isGeneratingBlog || isRefiningOutline || data.outline.length === 0}
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

            </div>
          )}
        </div>
      </div>

      <ConfirmGenerateBlogModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleGenerateBlog}
      />

      {/* Refine Outline Modal */}
      {showRefinePopover && (() => {
        // Build diff rows when we have a refined result
        type DiffRow =
          | { type: "unchanged"; index: number; section: OutlineSection }
          | { type: "modified"; index: number; old: OutlineSection; new: OutlineSection }
          | { type: "added"; index: number; section: OutlineSection }
          | { type: "removed"; index: number; section: OutlineSection };

        let rows: DiffRow[] | null = null;
        let modifiedCount = 0;
        let addedCount = 0;
        let removedCount = 0;

        if (refinedOutline) {
          rows = [];
          const maxLen = Math.max(data.outline.length, refinedOutline.length);
          for (let i = 0; i < maxLen; i++) {
            const oldS = data.outline[i];
            const newS = refinedOutline[i];
            if (oldS && newS) {
              if (oldS.title === newS.title && oldS.purpose === newS.purpose) {
                rows.push({ type: "unchanged", index: i, section: newS });
              } else {
                rows.push({ type: "modified", index: i, old: oldS, new: newS });
              }
            } else if (newS) {
              rows.push({ type: "added", index: i, section: newS });
            } else if (oldS) {
              rows.push({ type: "removed", index: i, section: oldS });
            }
          }
          modifiedCount = rows.filter((r) => r.type === "modified").length;
          addedCount = rows.filter((r) => r.type === "added").length;
          removedCount = rows.filter((r) => r.type === "removed").length;
        }

        const handleClose = () => {
          setShowRefinePopover(false);
          setRefinedOutline(null);
          setRefineInstruction("");
        };

        return (
          <div className="fixed inset-0 z-100000 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isRefiningOutline ? handleClose : undefined} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
              {/* Refining overlay */}
              {isRefiningOutline && (
                <GeneratingOverlay
                  title="Refining Your Outline"
                  descriptions={[
                    'Analyzing your instructions...',
                    'Restructuring sections...',
                    'Optimizing the flow...',
                    'Finalizing changes...',
                  ]}
                />
              )}
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {refinedOutline ? "Review Changes" : "Refine Outline"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {refinedOutline ? "Review the AI suggestions before applying" : "Tell AI how to adjust your outline"}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isRefiningOutline}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content — scrollable outline or diff */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {!refinedOutline ? (
                  <>
                    {/* Current outline (read-only) */}
                    <div className="space-y-1">
                      {data.outline.map((section, i) => (
                        <div key={section.id} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-white">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-700">{section.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{section.purpose}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Diff view */}
                    <div className="space-y-2">
                      {rows!.map((row, i) => {
                        if (row.type === "unchanged") {
                          return (
                            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                              <div className="flex items-start gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-white">
                                  {row.index + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-gray-500">{row.section.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{row.section.purpose}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (row.type === "modified") {
                          return (
                            <div key={i} className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                              <div className="flex items-start gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                  {row.index + 1}
                                </span>
                                <div className="space-y-1.5">
                                  {row.old.title !== row.new.title ? (
                                    <>
                                      <p className="text-sm font-semibold text-red-600/70 line-through">{row.old.title}</p>
                                      <p className="text-sm font-semibold text-green-700">{row.new.title}</p>
                                    </>
                                  ) : (
                                    <p className="text-sm font-semibold text-gray-900">{row.new.title}</p>
                                  )}
                                  {row.old.purpose !== row.new.purpose ? (
                                    <>
                                      <p className="text-xs text-red-400 line-through">{row.old.purpose}</p>
                                      <p className="text-xs text-green-600">{row.new.purpose}</p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">{row.new.purpose}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (row.type === "added") {
                          return (
                            <div key={i} className="rounded-lg border border-green-200 bg-green-50 p-3">
                              <div className="flex items-start gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                                  +
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-green-800">{row.section.title}</p>
                                  <p className="text-xs text-green-600 mt-0.5">{row.section.purpose}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // removed
                        return (
                          <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3 opacity-60">
                            <div className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-400 text-[10px] font-bold text-white">
                                &minus;
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-red-700 line-through">{row.section.title}</p>
                                <p className="text-xs text-red-400 mt-0.5 line-through">{row.section.purpose}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="text-xs text-gray-400 flex items-center gap-3">
                      <span>{data.outline.length} &rarr; {refinedOutline.length} sections</span>
                      {modifiedCount > 0 && <span className="text-blue-500">{modifiedCount} modified</span>}
                      {addedCount > 0 && <span className="text-green-500">{addedCount} added</span>}
                      {removedCount > 0 && <span className="text-red-400">{removedCount} removed</span>}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 space-y-3">
                {!refinedOutline ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Instructions</p>
                    </div>
                    <textarea
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder="e.g., split section 3 into two parts, add a section about common mistakes..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleRefineOutline();
                        }
                      }}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleClose}
                        disabled={isRefiningOutline}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRefineOutline}
                        disabled={isRefiningOutline || !refineInstruction.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isRefiningOutline ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Refining...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Refine
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setRefinedOutline(null)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => { handleAcceptRefinedOutline(); setShowRefinePopover(false); }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Check size={16} />
                      Accept Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
