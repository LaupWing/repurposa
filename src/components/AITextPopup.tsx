/**
 * AI Text Popup
 *
 * Lightweight selection-based popup with AI actions for plain text areas.
 * Attach to any textarea — when user selects text, a floating toolbar appears
 * directly above the selection with quick AI actions.
 * Uses a mirror div to calculate the position of selected text within the textarea.
 * Uses the refineText API endpoint.
 */

import { useState, useEffect } from '@wordpress/element';
import {
    Sparkles,
    Wand2,
    Minimize2,
    Maximize2,
    RefreshCw,
    Loader2,
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
    const [loading, setLoading] = useState<string | null>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        let timeout: ReturnType<typeof setTimeout>;

        const checkSelection = () => {
            const { selectionStart, selectionEnd } = textarea;
            if (selectionStart !== selectionEnd) {
                setSelection({ start: selectionStart, end: selectionEnd });
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

        textarea.addEventListener('mouseup', handleMouseUp);
        textarea.addEventListener('keyup', handleKeyUp);

        return () => {
            clearTimeout(timeout);
            textarea.removeEventListener('mouseup', handleMouseUp);
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

    if (!hasSelection) return null;

    return (
        <div className="inline-flex items-center gap-0.5 p-1 rounded-lg border border-gray-200 bg-gray-50 mb-2">
            {actions.map(({ id, label, icon: Icon, instruction }) => (
                <button
                    key={id}
                    onClick={() => handleAction(id, instruction)}
                    disabled={loading !== null || !hasSelection}
                    className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-white disabled:opacity-50 transition-colors"
                >
                    {loading === id ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Icon size={12} />
                    )}
                    {label}
                </button>
            ))}
        </div>
    );
}
