/**
 * AI Text Popup
 *
 * Floating toolbar that appears above selected text in a textarea.
 * Shows diff preview before applying changes (same UX as TipTap bubble menu).
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import {
    Sparkles,
    Wand2,
    Minimize2,
    Maximize2,
    RefreshCw,
    Loader2,
    MessageSquare,
    Send,
    Copy,
    CornerDownLeft,
} from 'lucide-react';
import { refineText } from '@/services/blogApi';
import { toast } from 'sonner';

// ============================================
// WORD DIFF (same as TipTap)
// ============================================

type DiffType = 'equal' | 'added' | 'removed';

interface DiffWord {
    type: DiffType;
    text: string;
}

function computeWordDiff(oldText: string, newText: string): DiffWord[] {
    const oldWords = oldText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);

    const m = oldWords.length;
    const n = newWords.length;

    const dp: number[][] = [];
    for (let i = 0; i <= m; i++) {
        dp[i] = [];
        for (let j = 0; j <= n; j++) {
            if (i === 0 || j === 0) {
                dp[i][j] = 0;
            } else if (oldWords[i - 1] === newWords[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const result: DiffWord[] = [];
    let i = m, j = n;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
            result.unshift({ type: 'equal', text: oldWords[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'added', text: newWords[j - 1] });
            j--;
        } else {
            result.unshift({ type: 'removed', text: oldWords[i - 1] });
            i--;
        }
    }

    return result;
}

// ============================================
// TYPES
// ============================================

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

const ACTION_LABELS: Record<string, string> = {
    improve: 'Improving',
    rewrite: 'Rewriting',
    shorter: 'Shortening',
    longer: 'Expanding',
    fix: 'Fixing',
    custom: 'Refining',
};

interface AITextPopupProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (newValue: string) => void;
}

type PopupStatus = 'idle' | 'loading' | 'preview';

const actions = [
    { id: 'improve', label: 'Improve', icon: Sparkles, instruction: 'Improve this text. Keep the same tone and length.' },
    { id: 'rewrite', label: 'Rewrite', icon: Wand2, instruction: 'Rewrite this text with different wording. Keep the same meaning.' },
    { id: 'shorter', label: 'Shorter', icon: Minimize2, instruction: 'Make this text shorter and more concise.' },
    { id: 'longer', label: 'Longer', icon: Maximize2, instruction: 'Expand this text with more detail.' },
    { id: 'fix', label: 'Fix', icon: RefreshCw, instruction: 'Fix any grammar, spelling, or punctuation errors in this text.' },
];

export function AITextPopup({ textareaRef, value, onChange }: AITextPopupProps) {
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [hasSelection, setHasSelection] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [status, setStatus] = useState<PopupStatus>('idle');
    const [action, setAction] = useState('');
    const [originalText, setOriginalText] = useState('');
    const [refinedText, setRefinedText] = useState('');
    const [refineInput, setRefineInput] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [customInstruction, setCustomInstruction] = useState('');
    const customInputRef = useRef<HTMLInputElement>(null);
    const refineInputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const resetAI = useCallback(() => {
        setStatus('idle');
        setAction('');
        setOriginalText('');
        setRefinedText('');
        setRefineInput('');
        setShowCustom(false);
        setCustomInstruction('');
    }, []);

    const dismiss = useCallback(() => {
        setHasSelection(false);
        resetAI();
    }, [resetAI]);

    // Selection detection
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        let timeout: ReturnType<typeof setTimeout>;

        const checkSelection = () => {
            const { selectionStart, selectionEnd } = textarea;
            if (selectionStart !== selectionEnd) {
                setSelection({ start: selectionStart, end: selectionEnd });

                const rect = textarea.getBoundingClientRect();
                const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
                const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 0;

                const textBefore = textarea.value.substring(0, selectionStart);
                const lines = textBefore.split('\n');
                const charPerLine = Math.floor(textarea.clientWidth / (parseFloat(getComputedStyle(textarea).fontSize) * 0.6)) || 80;
                let totalLines = 0;
                for (const line of lines) {
                    totalLines += Math.max(1, Math.ceil(line.length / charPerLine));
                }
                const lineOffset = (totalLines - 1) * lineHeight;

                setPosition({
                    top: rect.top + paddingTop + lineOffset - textarea.scrollTop - 44,
                    left: rect.left,
                });

                setHasSelection(true);
            } else if (status === 'idle') {
                setHasSelection(false);
            }
        };

        const handleMouseUp = () => {
            if (status !== 'idle') return;
            clearTimeout(timeout);
            timeout = setTimeout(checkSelection, 50);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (status !== 'idle') return;
            if (e.shiftKey) {
                clearTimeout(timeout);
                timeout = setTimeout(checkSelection, 50);
            }
        };
        const handleMouseDown = () => {
            if (status !== 'idle') return;
            setHasSelection(false);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'idle') return;
            if (e.key === 'Backspace' || e.key === 'Delete') {
                setHasSelection(false);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                !textarea.contains(target) &&
                !popupRef.current?.contains(target)
            ) {
                dismiss();
            }
        };

        textarea.addEventListener('mouseup', handleMouseUp);
        textarea.addEventListener('mousedown', handleMouseDown);
        textarea.addEventListener('keyup', handleKeyUp);
        textarea.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearTimeout(timeout);
            textarea.removeEventListener('mouseup', handleMouseUp);
            textarea.removeEventListener('mousedown', handleMouseDown);
            textarea.removeEventListener('keyup', handleKeyUp);
            textarea.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [textareaRef, status, dismiss]);

    // AI request
    const runAIRequest = useCallback(async (text: string, actionId: string, instruction: string, original: string) => {
        setStatus('loading');
        setAction(actionId);
        setOriginalText(original);

        try {
            const result = await refineText(text, instruction);
            setRefinedText(result.text);
            setStatus('preview');
            setRefineInput('');
        } catch (error) {
            toast.error('AI action failed', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
            resetAI();
        }
    }, [resetAI]);

    const handleAction = useCallback((actionId: string, instruction: string) => {
        const selectedText = value.slice(selection.start, selection.end);
        if (!selectedText) return;
        runAIRequest(selectedText, actionId, instruction, selectedText);
    }, [value, selection, runAIRequest]);

    const handleCustomSubmit = useCallback(() => {
        if (!customInstruction.trim()) return;
        const selectedText = value.slice(selection.start, selection.end);
        if (!selectedText) return;
        setShowCustom(false);
        runAIRequest(selectedText, 'custom', customInstruction.trim(), selectedText);
        setCustomInstruction('');
    }, [customInstruction, value, selection, runAIRequest]);

    // Preview actions
    const handleReplace = useCallback(() => {
        const newValue = value.slice(0, selection.start) + refinedText + value.slice(selection.end);
        onChange(newValue);
        dismiss();
    }, [value, selection, refinedText, onChange, dismiss]);

    const handleInsert = useCallback(() => {
        const newValue = value.slice(0, selection.end) + ' ' + refinedText + value.slice(selection.end);
        onChange(newValue);
        dismiss();
    }, [value, selection, refinedText, onChange, dismiss]);

    const handleReject = useCallback(() => {
        resetAI();
    }, [resetAI]);

    const handleRetry = useCallback(() => {
        const instruction = actions.find(a => a.id === action)?.instruction || action;
        runAIRequest(originalText, action, instruction, originalText);
    }, [action, originalText, runAIRequest]);

    const handleRefine = useCallback((instruction: string) => {
        if (!instruction.trim()) return;
        runAIRequest(refinedText, instruction, instruction, originalText);
    }, [refinedText, originalText, runAIRequest]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(refinedText);
        toast.success('Copied to clipboard');
    }, [refinedText]);

    // Keyboard shortcuts for preview
    useEffect(() => {
        if (status !== 'preview') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { handleReject(); return; }
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleReplace(); }
            else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); handleInsert(); }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [status, handleReject, handleReplace, handleInsert]);

    if (!hasSelection) return null;

    const diffWords = status === 'preview'
        ? computeWordDiff(originalText, refinedText)
        : [];

    return (
        <div
            ref={popupRef}
            className="fixed z-50"
            style={{ top: position.top, left: position.left }}
        >
            {/* Idle: action buttons */}
            {status === 'idle' && (
                <div className="inline-flex items-center gap-0.5 p-1 rounded-lg border border-gray-200 bg-white shadow-lg">
                    {actions.map(({ id, label, icon: Icon, instruction }) => (
                        <button
                            key={id}
                            onClick={() => handleAction(id, instruction)}
                            className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100 transition-colors whitespace-nowrap"
                        >
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}

                    <div className="w-px h-5 bg-gray-200 mx-0.5" />

                    <div className="relative">
                        <button
                            onClick={() => { setShowCustom(!showCustom); setTimeout(() => customInputRef.current?.focus(), 50); }}
                            className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100 transition-colors whitespace-nowrap"
                        >
                            <MessageSquare size={12} />
                            Other
                        </button>

                        {showCustom && (
                            <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                                <div className="flex items-center gap-1.5">
                                    <input
                                        ref={customInputRef}
                                        type="text"
                                        value={customInstruction}
                                        onChange={(e) => setCustomInstruction(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') setShowCustom(false); }}
                                        placeholder="e.g. Make it funnier..."
                                        className="flex-1 h-8 px-2 text-xs border border-gray-300 rounded-md bg-gray-50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleCustomSubmit}
                                        disabled={!customInstruction.trim()}
                                        className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                                    >
                                        <Send size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Loading */}
            {status === 'loading' && (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                    <span className="text-sm text-gray-700">
                        {ACTION_LABELS[action] || 'Processing'}...
                    </span>
                </div>
            )}

            {/* Diff preview */}
            {status === 'preview' && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-lg">
                    {/* Inline diff */}
                    <div className="px-4 py-3 max-h-60 overflow-y-auto">
                        <p className="text-sm leading-relaxed">
                            {diffWords.map((word, i) => {
                                if (word.type === 'equal') {
                                    return <span key={i}>{i > 0 ? ' ' : ''}{word.text}</span>;
                                }
                                if (word.type === 'removed') {
                                    return (
                                        <span key={i} className="bg-red-100 text-red-700 line-through decoration-red-400/70">
                                            {i > 0 ? ' ' : ''}{word.text}
                                        </span>
                                    );
                                }
                                return (
                                    <span key={i} className="bg-green-100 text-green-700">
                                        {i > 0 ? ' ' : ''}{word.text}
                                    </span>
                                );
                            })}
                        </p>
                    </div>

                    {/* Char count */}
                    <div className="flex justify-end px-4 pb-2">
                        <span className="text-xs tabular-nums">
                            <span className="text-gray-400">{originalText.length}</span>
                            <span className="text-gray-300 mx-1">&rarr;</span>
                            <span className={refinedText.length > originalText.length ? 'text-green-600' : refinedText.length < originalText.length ? 'text-red-500' : 'text-gray-400'}>
                                {refinedText.length}
                            </span>
                        </span>
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-gray-100">
                        <button
                            onClick={handleReplace}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            Replace
                            <kbd className="ml-0.5 text-[10px] text-blue-200 font-normal">{isMac ? '⌘' : 'Ctrl'}↵</kbd>
                        </button>
                        <button
                            onClick={handleInsert}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Insert
                            <kbd className="ml-0.5 text-[10px] text-gray-400 font-normal">⇧↵</kbd>
                        </button>
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <RefreshCw size={12} />
                            Retry
                        </button>
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                            title="Copy to clipboard"
                        >
                            <Copy size={14} />
                        </button>
                    </div>

                    {/* Refine input */}
                    <div className="px-4 pb-3">
                        <div className="relative">
                            <input
                                ref={refineInputRef}
                                type="text"
                                value={refineInput}
                                onChange={(e) => setRefineInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                                        e.preventDefault();
                                        handleRefine(refineInput);
                                    }
                                    if (e.key === 'Escape') handleReject();
                                }}
                                placeholder="Refine this response..."
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-3 pr-8 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors"
                            />
                            <button
                                onClick={() => handleRefine(refineInput)}
                                disabled={!refineInput.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
                                title="Send"
                            >
                                <CornerDownLeft size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
