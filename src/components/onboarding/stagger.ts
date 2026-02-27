import type { CSSProperties } from 'react';

/** Stagger helper — returns props to spread on an element for enter/exit animations */
export const stagger = (index: number, leaving: boolean) =>
    ({
        [leaving ? 'data-stagger-out' : 'data-stagger-in']: '',
        style: { '--stagger': index } as CSSProperties,
    }) as const;
