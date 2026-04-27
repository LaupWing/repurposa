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

function tokenize(text: string): string[] {
    // Split into words and newline tokens, preserving line breaks
    return text.split(/(\n)/).flatMap(part =>
        part === '\n' ? ['\n'] : part.split(/[ \t]+/).filter(Boolean)
    );
}

function computeWordDiff(oldText: string, newText: string): DiffWord[] {
    const oldWords = tokenize(oldText);
    const newWords = tokenize(newText);

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
    const [revealedCount, setRevealedCount] = useState(0);
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
        setRevealedCount(0);
        setShowCustom(false);
        setCustomInstruction('');
    }, []);

    const dismiss = useCallback(() => {
        setHasSelection(false);
        resetAI();
    }, [resetAI]);

    // Selection detection via selectionchange
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const computePosition = (selectionStart: number) => {
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

            return {
                top: rect.top + paddingTop + lineOffset - textarea.scrollTop - 44,
                left: rect.left,
            };
        };

        const handleSelectionChange = () => {
            if (status !== 'idle') return;
            if (document.activeElement !== textarea) return;

            const { selectionStart, selectionEnd } = textarea;
            const selectedText = textarea.value.slice(selectionStart, selectionEnd);
            if (selectionStart !== selectionEnd && selectedText.trim()) {
                setSelection({ start: selectionStart, end: selectionEnd });
                setPosition(computePosition(selectionStart));
                setHasSelection(true);
            } else {
                setHasSelection(false);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (popupRef.current?.contains(target)) return;
            if (status !== 'idle' || !textarea.contains(target)) {
                dismiss();
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
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

    const diffWordsRef = useRef<DiffWord[]>([]);
    if (status === 'preview' && diffWordsRef.current.length === 0 && refinedText) {
        diffWordsRef.current = computeWordDiff(originalText, refinedText);
    }
    if (status === 'idle' || status === 'loading') {
        diffWordsRef.current = [];
    }
    const diffWords = diffWordsRef.current;

    // Kick off word-by-word reveal when diff is ready
    useEffect(() => {
        if (status !== 'preview') return;
        setRevealedCount(0);
        if (diffWords.length === 0) return;
        let i = 0;
        const tick = () => {
            i++;
            setRevealedCount(i);
            if (i < diffWords.length) {
                setTimeout(tick, 50);
            }
        };
        setTimeout(tick, 18);
    }, [status, diffWords.length]);

    if (!hasSelection) return null;

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

            {/* Loading + diff preview (same card) */}
            {(status === 'loading' || status === 'preview') && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-lg">
                    {/* Content area: spinner or diff */}
                    <div className="px-4 py-3 min-h-[60px] max-h-60 overflow-y-auto flex items-center">
                        {status === 'loading' ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 w-full justify-center py-2">
                                <Loader2 size={14} className="animate-spin text-blue-600 shrink-0" />
                                {ACTION_LABELS[action] || 'Processing'}...
                            </div>
                        ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap w-full">
                                {diffWords.slice(0, revealedCount).map((word, i) => {
                                    const isNewline = word.text === '\n';
                                    const prevIsNewline = i > 0 && diffWords[i - 1].text === '\n';
                                    const sep = i === 0 || isNewline || prevIsNewline ? '' : ' ';

                                    if (isNewline) {
                                        if (word.type === 'removed') return <span key={i} className="bg-red-100 text-red-700">{'↵\n'}</span>;
                                        if (word.type === 'added') return <span key={i} className="bg-green-100 text-green-700">{'↵\n'}</span>;
                                        return <br key={i} />;
                                    }
                                    if (word.type === 'equal') return <span key={i}>{sep}{word.text}</span>;
                                    if (word.type === 'removed') return <span key={i} className="bg-red-100 text-red-700 line-through decoration-red-400/70">{sep}{word.text}</span>;
                                    return <span key={i} className="bg-green-100 text-green-700">{sep}{word.text}</span>;
                                })}
                                {revealedCount < diffWords.length && (
                                    <span className="inline-block w-0.5 h-3.5 bg-blue-500 animate-pulse ml-0.5 align-middle" />
                                )}
                            </p>
                        )}
                    </div>

                    {/* Char count */}
                    {status === 'preview' && (
                        <div className="flex justify-end px-4 pb-2">
                            <span className="text-xs tabular-nums">
                                <span className="text-gray-400">{originalText.length}</span>
                                <span className="text-gray-300 mx-1">&rarr;</span>
                                <span className={refinedText.length > originalText.length ? 'text-green-600' : refinedText.length < originalText.length ? 'text-red-500' : 'text-gray-400'}>
                                    {refinedText.length}
                                </span>
                            </span>
                        </div>
                    )}

                    {/* Action bar */}
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-gray-100">
                        <button
                            onClick={handleReplace}
                            disabled={status === 'loading' || revealedCount < diffWords.length}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40"
                        >
                            Replace
                            <kbd className="ml-0.5 text-[10px] text-blue-200 font-normal">{isMac ? '⌘' : 'Ctrl'}↵</kbd>
                        </button>
                        <button
                            onClick={handleInsert}
                            disabled={status === 'loading' || revealedCount < diffWords.length}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
                        >
                            Insert
                            <kbd className="ml-0.5 text-[10px] text-gray-400 font-normal">⇧↵</kbd>
                        </button>
                        <button
                            onClick={handleRetry}
                            disabled={status === 'loading'}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
                        >
                            <RefreshCw size={12} />
                            Retry
                        </button>
                        <button
                            onClick={handleCopy}
                            disabled={status === 'loading' || revealedCount < diffWords.length}
                            className="flex items-center justify-center h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-auto disabled:opacity-40"
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
                                disabled={status === 'loading'}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-3 pr-8 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors disabled:opacity-40"
                            />
                            <button
                                onClick={() => handleRefine(refineInput)}
                                disabled={!refineInput.trim() || status === 'loading'}
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
