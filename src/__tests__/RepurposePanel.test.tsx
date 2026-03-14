import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { RepurposePanel } from '@/components/repurpose/RepurposePanel';

// --- Hook mocks ---

const mockUseShortPosts = vi.fn();
vi.mock('@/hooks/useShortPosts', () => ({
    useShortPosts: (...args: unknown[]) => mockUseShortPosts(...args),
}));

const mockUseThreads = vi.fn();
vi.mock('@/hooks/useThreads', () => ({
    useThreads: (...args: unknown[]) => mockUseThreads(...args),
}));

const mockUseVisuals = vi.fn();
vi.mock('@/hooks/useVisuals', () => ({
    useVisuals: (...args: unknown[]) => mockUseVisuals(...args),
}));

const mockUseScheduling = vi.fn();
vi.mock('@/hooks/useScheduling', () => ({
    useScheduling: () => mockUseScheduling(),
}));

// --- Child component mocks ---

// Captures props so we can invoke internal callbacks (e.g. onScheduled)
let capturedScheduleModalProps: Record<string, unknown> = {};

vi.mock('@/components/repurpose/cards/ShortPostCard', () => ({
    default: ({ pattern }: { pattern: { id: number } }) => (
        <div data-testid={`short-post-card-${pattern.id}`} />
    ),
}));

vi.mock('@/components/repurpose/cards/ThreadCard', () => ({
    default: ({ thread }: { thread: { id: number } }) => (
        <div data-testid={`thread-card-${thread.id}`} />
    ),
}));

vi.mock('@/components/repurpose/cards/VisualCard', () => ({
    default: ({ visual }: { visual: { id: number } }) => (
        <div data-testid={`visual-card-${visual.id}`} />
    ),
}));

vi.mock('@/components/repurpose/modals', () => ({
    ConfirmGenerateModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="confirm-generate-modal" /> : null,
    ConfirmDeleteModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="confirm-delete-modal" /> : null,
    AddShortPostModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="add-short-post-modal" /> : null,
    SchedulePostModal: (props: Record<string, unknown>) => {
        capturedScheduleModalProps = props;
        return props.isOpen ? <div data-testid="schedule-post-modal" /> : null;
    },
    PublishNowModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="publish-now-modal" /> : null,
    SourcePickerModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="source-picker-modal" /> : null,
}));

vi.mock('@/components/repurpose/modals/VisualPreviewModal', () => ({
    VisualPreviewModal: () => <div data-testid="visual-preview-modal" />,
}));

vi.mock('@/components/GeneratingOverlay', () => ({
    GeneratingOverlay: ({ title }: { title: string; descriptions: string[] }) => (
        <div data-testid="generating-overlay">{title}</div>
    ),
}));

// --- Default hook returns (idle state) ---

function defaultShortPosts() {
    return {
        shortPosts: [],
        isGenerating: false,
        showConfirmModal: false,
        setShowConfirmModal: vi.fn(),
        showAddModal: false,
        setShowAddModal: vi.fn(),
        onGenerateClick: vi.fn(),
        handleGenerateShortPosts: vi.fn(),
        handleAddShortPost: vi.fn(),
        getCardProps: vi.fn(() => ({})),
        incrementVisualCount: vi.fn(),
        addScheduledPosts: vi.fn(),
        removeScheduledPost: vi.fn(),
    };
}

function defaultThreads() {
    return {
        threads: [],
        isGeneratingThreads: false,
        handleGenerateThreads: vi.fn(),
        getCardProps: vi.fn(() => ({})),
        addScheduledPosts: vi.fn(),
        removeScheduledPost: vi.fn(),
    };
}

function defaultVisuals() {
    return {
        visuals: [],
        viewingVisual: null,
        setViewingVisual: vi.fn(),
        deletingVisualId: null,
        setDeletingVisualId: vi.fn(),
        highlightVisualId: null,
        setHighlightVisualId: vi.fn(),
        confirmDelete: vi.fn(),
        addVisual: vi.fn(),
        updateVisual: vi.fn(),
        addScheduledPosts: vi.fn(),
        removeScheduledPost: vi.fn(),
        showSourcePicker: false,
        setShowSourcePicker: vi.fn(),
        sourcePickerTab: 'short_posts' as const,
        setSourcePickerTab: vi.fn(),
        sourcePickerSearch: '',
        setSourcePickerSearch: vi.fn(),
        creatingVisualSource: null,
        setCreatingVisualSource: vi.fn(),
        closeSourcePicker: vi.fn(),
        selectSource: vi.fn(),
        onVisualCreatedFromSource: vi.fn(),
        onVisualUpdated: vi.fn(),
    };
}

function defaultScheduling() {
    return {
        schedulingPost: null,
        schedulingContentType: 'short_post' as const,
        schedulingVisual: null,
        schedulingThreadPosts: null,
        publishingPost: null,
        publishingContentType: 'short_post' as const,
        scheduleShortPost: vi.fn(),
        scheduleThread: vi.fn(),
        scheduleVisual: vi.fn(),
        publishShortPost: vi.fn(),
        publishThread: vi.fn(),
        clearScheduling: vi.fn(),
        clearPublishing: vi.fn(),
        handleScheduled: vi.fn(),
        removeScheduledFromModal: vi.fn(),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    capturedScheduleModalProps = {};
    mockUseShortPosts.mockReturnValue(defaultShortPosts());
    mockUseThreads.mockReturnValue(defaultThreads());
    mockUseVisuals.mockReturnValue(defaultVisuals());
    mockUseScheduling.mockReturnValue(defaultScheduling());
});

// --- Tests ---

describe('RepurposePanel', () => {
    it('renders without crashing', () => {
        render(<RepurposePanel />);
    });

    describe('cross-hook orchestration: handleScheduled', () => {
        it('routes scheduled posts to the short posts hook when contentType is short_post', () => {
            const spAddScheduledPosts = vi.fn();
            mockUseShortPosts.mockReturnValue({
                ...defaultShortPosts(),
                addScheduledPosts: spAddScheduledPosts,
            });

            const thAddScheduledPosts = vi.fn();
            mockUseThreads.mockReturnValue({
                ...defaultThreads(),
                addScheduledPosts: thAddScheduledPosts,
            });

            const schedHandleScheduled = vi.fn().mockReturnValue({
                contentType: 'short_post',
                postId: 42,
                visualId: null,
                scheduledPosts: [
                    { id: 100, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-01T12:00:00Z' },
                ],
            });

            mockUseScheduling.mockReturnValue({
                ...defaultScheduling(),
                handleScheduled: schedHandleScheduled,
            });

            render(<RepurposePanel />);

            // Grab the internal callback via captured modal props
            const onScheduled = capturedScheduleModalProps.onScheduled as (
                posts: Array<{ id: number; platform: string; status: string; scheduled_at: string }>
            ) => void;

            onScheduled([
                { id: 100, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-01T12:00:00Z' },
            ]);

            expect(schedHandleScheduled).toHaveBeenCalledWith([
                { id: 100, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-01T12:00:00Z' },
            ]);
            expect(spAddScheduledPosts).toHaveBeenCalledWith(42, [
                { id: 100, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-01T12:00:00Z' },
            ]);
            expect(thAddScheduledPosts).not.toHaveBeenCalled();
        });
    });
});
