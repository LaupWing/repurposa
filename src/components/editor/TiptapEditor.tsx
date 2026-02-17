/**
 * TipTap Editor Component
 *
 * Rich text editor with toolbar and bubble menu for AI actions.
 */

import { useEditor, EditorContent } from '@tiptap/react';
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
    Check,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

const lowlight = createLowlight(common);

const ACTION_LABELS: Record<string, string> = {
    improve: 'Improving',
    rewrite: 'Rewriting',
    shorter: 'Shortening',
    longer: 'Expanding',
    fix: 'Fixing',
};

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

interface TiptapEditorProps {
    content?: string;
    onUpdate?: (content: string) => void;
    onAIRequest?: (selectedText: string, action: string) => Promise<string>;
}

export function TiptapEditor({ content = '', onUpdate, onAIRequest }: TiptapEditorProps) {
    const [showBubbleMenu, setShowBubbleMenu] = useState(false);
    const [bubbleMenuPosition, setBubbleMenuPosition] = useState({ top: 0, left: 0 });
    const [aiState, setAiState] = useState<AIState>(IDLE_AI_STATE);
    const aiStateRef = useRef<AIState>(IDLE_AI_STATE);
    const bubbleMenuRef = useRef<HTMLDivElement>(null);
    const diffPanelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Keep ref in sync
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
        onSelectionUpdate: ({ editor }) => {
            // Don't show bubble menu during AI operations
            if (aiStateRef.current.status !== 'idle') return;

            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;

            if (hasSelection && containerRef.current) {
                const { view } = editor;
                const start = view.coordsAtPos(from);
                const end = view.coordsAtPos(to);
                const containerRect = containerRef.current.getBoundingClientRect();

                setBubbleMenuPosition({
                    top: start.top - containerRect.top - 50,
                    left: (start.left + end.left) / 2 - containerRect.left,
                });
                setShowBubbleMenu(true);
            } else {
                setShowBubbleMenu(false);
            }
        },
    });

    // Close bubble menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                bubbleMenuRef.current && !bubbleMenuRef.current.contains(e.target as Node) &&
                diffPanelRef.current && !diffPanelRef.current.contains(e.target as Node)
            ) {
                if (editor?.view.dom.contains(e.target as Node)) return;
                setShowBubbleMenu(false);
            }
            if (
                bubbleMenuRef.current && !bubbleMenuRef.current.contains(e.target as Node) &&
                !diffPanelRef.current
            ) {
                if (editor?.view.dom.contains(e.target as Node)) return;
                setShowBubbleMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editor]);

    // Escape key to reject preview
    useEffect(() => {
        if (aiState.status !== 'preview') return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleReject();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [aiState.status]);

    const handleReject = useCallback(() => {
        if (!editor) return;
        editor.setEditable(true);
        editor.chain().focus().setTextSelection({
            from: aiStateRef.current.selectionFrom,
            to: aiStateRef.current.selectionTo,
        }).run();
        setAiState(IDLE_AI_STATE);
    }, [editor]);

    const handleAccept = useCallback(() => {
        if (!editor) return;
        const { selectionFrom, selectionTo, refinedText } = aiStateRef.current;
        editor.setEditable(true);
        editor.chain()
            .focus()
            .setTextSelection({ from: selectionFrom, to: selectionTo })
            .insertContent(refinedText)
            .run();
        setAiState(IDLE_AI_STATE);
    }, [editor]);

    if (!editor) {
        return null;
    }

    const handleAIAction = async (action: string) => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');

        if (!onAIRequest) return;

        // Set loading state
        const loadingState: AIState = {
            status: 'loading',
            action,
            originalText: selectedText,
            refinedText: '',
            selectionFrom: from,
            selectionTo: to,
        };
        setAiState(loadingState);
        aiStateRef.current = loadingState;
        setShowBubbleMenu(false);
        editor.setEditable(false);

        try {
            const refined = await onAIRequest(selectedText, action);
            const previewState: AIState = {
                status: 'preview',
                action,
                originalText: selectedText,
                refinedText: refined,
                selectionFrom: from,
                selectionTo: to,
            };
            setAiState(previewState);
            aiStateRef.current = previewState;
        } catch {
            editor.setEditable(true);
            setAiState(IDLE_AI_STATE);
            aiStateRef.current = IDLE_AI_STATE;
            toast.error('AI request failed', {
                description: 'Something went wrong. Please try again.',
            });
        }
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

            {/* Editor Content with Bubble Menu */}
            <div ref={containerRef} className="relative">
                {/* Bubble Menu */}
                {showBubbleMenu && aiState.status === 'idle' && (
                    <div
                        ref={bubbleMenuRef}
                        className="absolute z-50 flex items-center gap-0.5 p-1 bg-white border border-gray-200 rounded-lg shadow-lg"
                        style={{
                            top: bubbleMenuPosition.top,
                            left: bubbleMenuPosition.left,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {/* Formatting buttons */}
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

                        {/* AI buttons */}
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

                {/* Loading indicator */}
                {aiState.status === 'loading' && (
                    <div
                        className="absolute z-50 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-lg"
                        style={{
                            top: bubbleMenuPosition.top,
                            left: bubbleMenuPosition.left,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <Loader2 size={14} className="animate-spin text-blue-600" />
                        <span className="text-sm text-gray-700">
                            {ACTION_LABELS[aiState.action] || 'Processing'}...
                        </span>
                    </div>
                )}

                {/* Diff preview panel */}
                {aiState.status === 'preview' && (
                    <div
                        ref={diffPanelRef}
                        className="absolute z-50 w-96 bg-white border border-gray-200 rounded-xl shadow-xl"
                        style={{
                            top: bubbleMenuPosition.top,
                            left: bubbleMenuPosition.left,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-blue-600" />
                                <span className="text-sm font-medium text-gray-900">AI Suggestion</span>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">
                                    {aiState.action}
                                </span>
                            </div>
                        </div>

                        {/* Diff content */}
                        <div className="px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
                            <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2">
                                <p className="text-sm text-red-800 line-through leading-relaxed">
                                    {aiState.originalText}
                                </p>
                            </div>
                            <div className="rounded-md bg-green-50 border border-green-100 px-3 py-2">
                                <p className="text-sm text-green-800 leading-relaxed">
                                    {aiState.refinedText}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-gray-100">
                            <button
                                onClick={handleReject}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={14} />
                                Reject
                            </button>
                            <button
                                onClick={handleAccept}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                <Check size={14} />
                                Accept
                            </button>
                        </div>
                    </div>
                )}

                <EditorContent editor={editor} className="p-4" />
            </div>
        </div>
    );
}
