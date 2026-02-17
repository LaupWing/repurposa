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
import { useState, useEffect, useRef } from '@wordpress/element';
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
} from 'lucide-react';

const lowlight = createLowlight(common);

interface TiptapEditorProps {
    content?: string;
    onUpdate?: (content: string) => void;
    onAIRequest?: (selectedText: string, action: string) => void;
}

export function TiptapEditor({ content = '', onUpdate, onAIRequest }: TiptapEditorProps) {
    const [showBubbleMenu, setShowBubbleMenu] = useState(false);
    const [bubbleMenuPosition, setBubbleMenuPosition] = useState({ top: 0, left: 0 });
    const bubbleMenuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
            if (bubbleMenuRef.current && !bubbleMenuRef.current.contains(e.target as Node)) {
                if (editor?.view.dom.contains(e.target as Node)) return;
                setShowBubbleMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editor]);

    if (!editor) {
        return null;
    }

    const handleAIAction = (action: string) => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        onAIRequest?.(selectedText, action);
        setShowBubbleMenu(false);
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
                {showBubbleMenu && (
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

                <EditorContent editor={editor} className="p-4" />
            </div>
        </div>
    );
}
