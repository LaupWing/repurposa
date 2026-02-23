import { useState, useEffect } from '@wordpress/element';

interface AnimatedTextProps {
    texts: string[];
    interval?: number;
    className?: string;
}

export function AnimatedText({ texts, interval = 3000, className = '' }: AnimatedTextProps) {
    const [index, setIndex] = useState(0);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (texts.length <= 1) return;

        const timer = setInterval(() => {
            setAnimating(true);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % texts.length);
                setAnimating(false);
            }, 300);
        }, interval);

        return () => clearInterval(timer);
    }, [texts, interval]);

    return (
        <span
            className={`animated-text-cycle inline-block transition-all duration-300 ${animating ? 'animated-text-out' : 'animated-text-in'} ${className}`}
        >
            {texts[index]}
        </span>
    );
}
