/**
 * AI Text Popup
 *
 * Floating toolbar that appears above selected text in a textarea.
 * Left-aligned with the textarea, vertically above the selection.
 */

import { useState, useEffect, useRef } from '@wordpress/element';
import {
    Sparkles,
    Wand2,
    Minimize2,
    Maximize2,
    RefreshCw,
    Loader2,
    MessageSquare,
    Send,
} from 'lucide-react';
import { refineText } from '../services/api';
import { toast } from 'sonner';

interface AITextPopupProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (newValue: string) => void;
}

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
    const [loading, setLoading] = useState<string | null>(null);
    const [showCustom, setShowCustom] = useState(false);
    const [customInstruction, setCustomInstruction] = useState('');
    const customInputRef = useRef<HTMLInputElement>(null);

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

                // Count newlines before selection to find which line it's on
                const textBefore = textarea.value.substring(0, selectionStart);
                const lines = textBefore.split('\n');
                // Account for wrapping: measure each line's wrapped line count
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
            } else {
                setHasSelection(false);
            }
        };

        const handleMouseUp = () => {
            clearTimeout(timeout);
            timeout = setTimeout(checkSelection, 50);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.shiftKey) {
                clearTimeout(timeout);
                timeout = setTimeout(checkSelection, 50);
            }
        };
        const handleMouseDown = () => {
            setHasSelection(false);
        };

        textarea.addEventListener('mouseup', handleMouseUp);
        textarea.addEventListener('mousedown', handleMouseDown);
        textarea.addEventListener('keyup', handleKeyUp);

        return () => {
            clearTimeout(timeout);
            textarea.removeEventListener('mouseup', handleMouseUp);
            textarea.removeEventListener('mousedown', handleMouseDown);
            textarea.removeEventListener('keyup', handleKeyUp);
        };
    }, [textareaRef]);

    const handleAction = async (actionId: string, instruction: string) => {
        const selectedText = value.slice(selection.start, selection.end);
        if (!selectedText) return;

        setLoading(actionId);
        try {
            const result = await refineText(selectedText, instruction);
            const newValue = value.slice(0, selection.start) + result.text + value.slice(selection.end);
            onChange(newValue);
            setHasSelection(false);
        } catch (error) {
            toast.error('AI action failed', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setLoading(null);
        }
    };

    const handleCustomSubmit = () => {
        if (!customInstruction.trim()) return;
        handleAction('custom', customInstruction.trim());
        setCustomInstruction('');
        setShowCustom(false);
    };

    if (!hasSelection) return null;

    return (
        <div
            className="fixed z-50 inline-flex items-center gap-0.5 p-1 rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{ top: position.top, left: position.left }}
        >
            {actions.map(({ id, label, icon: Icon, instruction }) => (
                <button
                    key={id}
                    onClick={() => handleAction(id, instruction)}
                    disabled={loading !== null}
                    className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                    {loading === id ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Icon size={12} />
                    )}
                    {label}
                </button>
            ))}

            <div className="w-px h-5 bg-gray-200 mx-0.5" />

            <div className="relative">
                <button
                    onClick={() => { setShowCustom(!showCustom); setTimeout(() => customInputRef.current?.focus(), 50); }}
                    disabled={loading !== null}
                    className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                    {loading === 'custom' ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <MessageSquare size={12} />
                    )}
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
                                disabled={!customInstruction.trim() || loading !== null}
                                className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                            >
                                <Send size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
