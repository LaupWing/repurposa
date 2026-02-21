import {
    Share2,
    FileText,
    Image,
    Video,
    Sparkles,
    Lightbulb,
} from 'lucide-react';

type TabType = 'short' | 'threads' | 'visuals' | 'video';

export function EmptyState({
    type,
    onGenerate,
    isGenerating,
    isPublished,
}: {
    type: TabType;
    onGenerate: () => void;
    isGenerating: boolean;
    isPublished?: boolean;
}) {
    const config = {
        short: { title: 'Short Posts', button: 'Generate Short Posts', icon: Share2 },
        threads: { title: 'Threads', button: 'Generate Threads', icon: FileText },
        visuals: { title: 'Visuals', button: 'Generate Visuals', icon: Image },
        video: { title: 'Video Scripts', button: 'Generate Scripts', icon: Video },
    };

    const { title, button, icon: Icon } = config[type];

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
            <div className="mb-4 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                <Icon size={20} className="text-gray-400" />
            </div>
            <h3 className="mb-1 font-medium text-gray-900">No {title} Yet</h3>
            <p className="mb-4 max-w-[240px] text-sm text-gray-500">
                Generate optimized {title.toLowerCase()} from your blog post content.
            </p>
            {!isPublished && type === 'short' && (
                <p className="mb-4 max-w-[280px] text-xs text-amber-600">
                    Tip: Publish your blog first to create short posts with effective CTAs that link back to your post.
                </p>
            )}
            <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                <Sparkles size={16} />
                {isGenerating ? 'Generating...' : button}
            </button>
        </div>
    );
}

export function DependencyGate({
    type,
    onSwitchTab,
}: {
    type: 'visuals' | 'video';
    onSwitchTab?: (tab: TabType) => void;
}) {
    const description = type === 'visuals'
        ? 'Generate short posts or threads from your blog before creating visuals.'
        : 'Generate short posts or threads from your blog before creating video scripts.';

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
            <div className="mb-4 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                <Lightbulb size={20} className="text-gray-400" />
            </div>
            <h3 className="mb-1 font-medium text-gray-900">Create Content First</h3>
            <p className="mb-4 max-w-[280px] text-sm text-gray-500">
                {description}
            </p>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onSwitchTab?.('short')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Share2 size={16} />
                    Generate Short Posts
                </button>
                <button
                    onClick={() => onSwitchTab?.('threads')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <FileText size={16} />
                    Generate Threads
                </button>
            </div>
        </div>
    );
}
