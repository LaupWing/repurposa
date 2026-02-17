/**
 * TipTap Editor Component
 *
 * Rich text editor with toolbar and bubble menu for AI actions.
 */

import { BubbleMenu, useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import { common, createLowlight } from 'lowlight';
import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Heading1,
    Heading2,
    Heading3,
    Sparkles,
    Wand2,
    Minimize2,
    Maximize2,
    RefreshCw,
    Link2,
    Unlink,
    Loader2,
    Copy,
    CornerDownLeft,
} from 'lucide-react';
import { toast } from 'sonner';

const lowlight = createLowlight(common);

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

const ACTION_LABELS: Record<string, string> = {
    improve: 'Improving',
    rewrite: 'Rewriting',
    shorter: 'Shortening',
    longer: 'Expanding',
    fix: 'Fixing',
    refine: 'Refining',
};

// ============================================
// WORD DIFF
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
// AI STATE
// ============================================

interface AIState {
    status: 'idle' | 'loading' | 'preview';
    action: string;
    originalText: string;
    refinedText: string;
    selectionFrom: number;
    selectionTo: number;
}

const IDLE_AI_STATE: AIState = {
    status: 'idle',
    action: '',
    originalText: '',
    refinedText: '',
    selectionFrom: 0,
    selectionTo: 0,
};

// ============================================
// EDITOR
// ============================================

interface TiptapEditorProps {
    content?: string;
    onUpdate?: (content: string) => void;
    onAIRequest?: (selectedText: string, action: string) => Promise<string>;
}

export function TiptapEditor({ content = '', onUpdate, onAIRequest }: TiptapEditorProps) {
    const [aiState, setAiState] = useState<AIState>(IDLE_AI_STATE);
    const [refineInput, setRefineInput] = useState('');
    const aiStateRef = useRef<AIState>(IDLE_AI_STATE);
    const tippyRef = useRef<any>(null);

    useEffect(() => {
        aiStateRef.current = aiState;
    }, [aiState]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder: 'Start writing your blog post...',
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline cursor-pointer',
                },
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] px-1',
            },
        },
        onUpdate: ({ editor }) => {
            onUpdate?.(editor.getHTML());
        },
    });

    // Click outside diff panel → dismiss
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (aiStateRef.current.status !== 'preview') return;
            if (tippyRef.current?.popper?.contains(e.target as Node)) return;
            if (editor) {
                editor.setEditable(true);
                editor.chain().focus().setTextSelection({
                    from: aiStateRef.current.selectionFrom,
                    to: aiStateRef.current.selectionTo,
                }).run();
            }
            setAiState(IDLE_AI_STATE);
            setRefineInput('');
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editor]);

    // --- AI action helpers ---

    const runAIRequest = useCallback(async (
        text: string,
        action: string,
        originalText: string,
        selectionFrom: number,
        selectionTo: number,
    ) => {
        if (!onAIRequest || !editor) return;

        const loadingState: AIState = {
            status: 'loading', action, originalText, refinedText: '', selectionFrom, selectionTo,
        };
        setAiState(loadingState);
        aiStateRef.current = loadingState;

        try {
            const refined = await onAIRequest(text, action);
            const previewState: AIState = {
                status: 'preview', action, originalText, refinedText: refined, selectionFrom, selectionTo,
            };
            setAiState(previewState);
            aiStateRef.current = previewState;
            setRefineInput('');
        } catch {
            editor.setEditable(true);
            setAiState(IDLE_AI_STATE);
            aiStateRef.current = IDLE_AI_STATE;
            toast.error('AI request failed', {
                description: 'Something went wrong. Please try again.',
            });
        }
    }, [editor, onAIRequest]);

    const handleReject = useCallback(() => {
        if (!editor) return;
        editor.setEditable(true);
        editor.chain().focus().setTextSelection({
            from: aiStateRef.current.selectionFrom,
            to: aiStateRef.current.selectionTo,
        }).run();
        setAiState(IDLE_AI_STATE);
        setRefineInput('');
    }, [editor]);

    const handleReplace = useCallback(() => {
        if (!editor) return;
        const { selectionFrom, selectionTo, refinedText } = aiStateRef.current;
        editor.setEditable(true);
        editor.chain()
            .focus()
            .setTextSelection({ from: selectionFrom, to: selectionTo })
            .insertContent(refinedText)
            .run();
        setAiState(IDLE_AI_STATE);
        setRefineInput('');
    }, [editor]);

    const handleInsert = useCallback(() => {
        if (!editor) return;
        const { selectionTo, refinedText } = aiStateRef.current;
        editor.setEditable(true);
        editor.chain()
            .focus()
            .setTextSelection(selectionTo)
            .insertContent(' ' + refinedText)
            .run();
        setAiState(IDLE_AI_STATE);
        setRefineInput('');
    }, [editor]);

    const handleRetry = useCallback(() => {
        const { originalText, action, selectionFrom, selectionTo } = aiStateRef.current;
        runAIRequest(originalText, action, originalText, selectionFrom, selectionTo);
    }, [runAIRequest]);

    const handleRefine = useCallback((instruction: string) => {
        if (!instruction.trim()) return;
        const { refinedText, originalText, selectionFrom, selectionTo } = aiStateRef.current;
        runAIRequest(refinedText, instruction, originalText, selectionFrom, selectionTo);
    }, [runAIRequest]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(aiStateRef.current.refinedText);
        toast.success('Copied to clipboard');
    }, []);

    // Keyboard shortcuts for preview
    useEffect(() => {
        if (aiState.status !== 'preview') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { handleReject(); return; }
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleReplace(); }
            else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); handleInsert(); }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [aiState.status, handleReject, handleReplace, handleInsert]);

    if (!editor) {
        return null;
    }

    const handleAIAction = async (action: string) => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (!onAIRequest) return;

        editor.setEditable(false);
        await runAIRequest(selectedText, action, selectedText, from, to);
    };

    const handleSetLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Enter URL:', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const ToolbarButton = ({
        onClick,
        isActive = false,
        disabled = false,
        children,
    }: {
        onClick: () => void;
        isActive?: boolean;
        disabled?: boolean;
        children: React.ReactNode;
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                isActive
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );

    const diffWords = aiState.status === 'preview'
        ? computeWordDiff(aiState.originalText, aiState.refinedText)
        : [];

    return (
        <div className="tiptap-editor relative">
            {/* Toolbar */}
            <div className="sticky top-0 z-10 flex items-center gap-1 p-2 border-b border-gray-200 flex-wrap bg-white">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo size={16} />
                </ToolbarButton>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                >
                    <Heading1 size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                >
                    <Heading2 size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                >
                    <Heading3 size={16} />
                </ToolbarButton>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                >
                    <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                >
                    <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                >
                    <Strikethrough size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                >
                    <Code size={16} />
                </ToolbarButton>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                >
                    <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                >
                    <ListOrdered size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                >
                    <Quote size={16} />
                </ToolbarButton>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <ToolbarButton
                    onClick={handleSetLink}
                    isActive={editor.isActive('link')}
                >
                    <Link2 size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    disabled={!editor.isActive('link')}
                >
                    <Unlink size={16} />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <div className="relative">
                <BubbleMenu
                    editor={editor}
                    shouldShow={({ from, to }) => {
                        if (aiStateRef.current.status !== 'idle') return true;
                        return from !== to;
                    }}
                    tippyOptions={{
                        interactive: true,
                        maxWidth: 'none',
                        placement: 'top',
                        duration: [200, 150],
                        onCreate: (instance: any) => { tippyRef.current = instance; },
                        onHide: () => {
                            // Prevent Tippy from hiding during AI operations
                            if (aiStateRef.current.status !== 'idle') return false;
                        },
                    }}
                >
                    {/* Idle: formatting + AI buttons */}
                    {aiState.status === 'idle' && (
                        <div className="flex items-center gap-0.5 p-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={`h-7 w-7 flex items-center justify-center rounded ${
                                    editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'
                                }`}
                            >
                                <Bold size={14} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={`h-7 w-7 flex items-center justify-center rounded ${
                                    editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'
                                }`}
                            >
                                <Italic size={14} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                className={`h-7 w-7 flex items-center justify-center rounded ${
                                    editor.isActive('strike') ? 'bg-gray-200' : 'hover:bg-gray-100'
                                }`}
                            >
                                <Strikethrough size={14} />
                            </button>
                            <button
                                onClick={handleSetLink}
                                className={`h-7 w-7 flex items-center justify-center rounded ${
                                    editor.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-100'
                                }`}
                            >
                                <Link2 size={14} />
                            </button>

                            <div className="w-px h-5 bg-gray-200 mx-1" />

                            <button
                                onClick={() => handleAIAction('improve')}
                                className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100"
                            >
                                <Sparkles size={12} />
                                Improve
                            </button>
                            <button
                                onClick={() => handleAIAction('rewrite')}
                                className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100"
                            >
                                <Wand2 size={12} />
                                Rewrite
                            </button>
                            <button
                                onClick={() => handleAIAction('shorter')}
                                className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100"
                            >
                                <Minimize2 size={12} />
                                Shorter
                            </button>
                            <button
                                onClick={() => handleAIAction('longer')}
                                className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100"
                            >
                                <Maximize2 size={12} />
                                Longer
                            </button>
                            <button
                                onClick={() => handleAIAction('fix')}
                                className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100"
                            >
                                <RefreshCw size={12} />
                                Fix
                            </button>
                        </div>
                    )}

                    {/* Loading */}
                    {aiState.status === 'loading' && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-lg">
                            <Loader2 size={14} className="animate-spin text-blue-600" />
                            <span className="text-sm text-gray-700">
                                {ACTION_LABELS[aiState.action] || 'Processing'}...
                            </span>
                        </div>
                    )}

                    {/* Diff preview */}
                    {aiState.status === 'preview' && (
                        <div className="w-[480px] bg-white border border-gray-200 rounded-xl shadow-xl">
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
                                    <span className="text-gray-400">{aiState.originalText.length}</span>
                                    <span className="text-gray-300 mx-1">&rarr;</span>
                                    <span className={aiState.refinedText.length > aiState.originalText.length ? 'text-green-600' : aiState.refinedText.length < aiState.originalText.length ? 'text-red-500' : 'text-gray-400'}>
                                        {aiState.refinedText.length}
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
                                        type="text"
                                        value={refineInput}
                                        onChange={(e) => setRefineInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                                                e.preventDefault();
                                                handleRefine(refineInput);
                                            }
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
                </BubbleMenu>

                <EditorContent editor={editor} className="p-4" />
            </div>
        </div>
    );
}
