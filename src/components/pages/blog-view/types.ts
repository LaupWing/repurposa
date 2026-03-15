export type ContentTab = 'blog' | 'short' | 'threads' | 'visuals' | 'video' | 'settings';

export interface BlogViewPageProps {
    postId?: number;
    onBack?: () => void;
}

export interface RegenerateSection {
    id: string;
    title: string;
    purpose: string;
}
