/**
 * AI Text Popup
 *
 * Lightweight selection-based popup with AI actions for plain text areas.
 * Attach to any textarea — when user selects text, a floating toolbar appears
 * with quick AI actions (improve, rewrite, shorten, expand, fix grammar).
 * Uses the refineText API endpoint.
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
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
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [loading, setLoading] = useState<string | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        if (selectionStart === selectionEnd) {
            setVisible(false);
            return;
        }

        setSelection({ start: selectionStart, end: selectionEnd });

        const rect = textarea.getBoundingClientRect();
        // Position above the textarea, centered horizontally
        setPosition({
            top: rect.top - 44,
            left: rect.left + rect.width / 2,
        });
        setVisible(true);
    }, [textareaRef]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleSelect = () => updatePosition();
        const handleMouseUp = () => setTimeout(updatePosition, 10);
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.shiftKey) updatePosition();
        };

        textarea.addEventListener('select', handleSelect);
        textarea.addEventListener('mouseup', handleMouseUp);
        textarea.addEventListener('keyup', handleKeyUp);

        return () => {
            textarea.removeEventListener('select', handleSelect);
            textarea.removeEventListener('mouseup', handleMouseUp);
            textarea.removeEventListener('keyup', handleKeyUp);
        };
    }, [textareaRef, updatePosition]);

    // Close on click outside
    useEffect(() => {
        if (!visible) return;
        const handleClick = (e: MouseEvent) => {
            if (
                popupRef.current && !popupRef.current.contains(e.target as Node) &&
                textareaRef.current && !textareaRef.current.contains(e.target as Node)
            ) {
                setVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [visible, textareaRef]);

    const handleAction = async (actionId: string, instruction: string) => {
        const selectedText = value.slice(selection.start, selection.end);
        if (!selectedText) return;

        setLoading(actionId);
        try {
            const result = await refineText(selectedText, instruction);
            const newValue = value.slice(0, selection.start) + result.text + value.slice(selection.end);
            onChange(newValue);
            setVisible(false);
        } catch (error) {
            toast.error('AI action failed', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setLoading(null);
        }
    };

    if (!visible) return null;

    return (
        <div
            ref={popupRef}
            className="fixed z-50 flex items-center gap-0.5 p-1 bg-white border border-gray-200 rounded-lg shadow-lg"
            style={{
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%)',
            }}
        >
            {actions.map(({ id, label, icon: Icon, instruction }) => (
                <button
                    key={id}
                    onClick={() => handleAction(id, instruction)}
                    disabled={loading !== null}
                    className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
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
