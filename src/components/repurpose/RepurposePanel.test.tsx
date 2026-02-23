import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { RepurposePanel } from './RepurposePanel';

// ============================================
// HOOK MOCKS
// ============================================
//
// vi.fn() creates a "spy" — a fake function that:
//   1. Does nothing by default
//   2. Records every time it was called and with what arguments
//   3. Can be told what to return via .mockReturnValue()
//
// We create one spy per hook. Then vi.mock() tells Vitest:
// "When RepurposePanel imports this module, use MY fake instead."

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

// ============================================
// CHILD COMPONENT MOCKS
// ============================================
//
// RepurposePanel renders ShortPostCard, ThreadCard, modals, etc.
// Those are complex components with their own dependencies.
// We replace them with simple stubs that:
//   - Render a small div so we can verify they appear
//   - Expose their props so we can inspect what RepurposePanel passed to them
//
// The key insight: for the cross-hook orchestration tests,
// we need to grab the `onScheduled` callback that RepurposePanel
// passes to SchedulePostModal. So our mock captures props.

let capturedScheduleModalProps: Record<string, unknown> = {};

vi.mock('./cards/ShortPostCard', () => ({
    default: ({ pattern }: { pattern: { id: number } }) => (
        <div data-testid={`short-post-card-${pattern.id}`} />
    ),
}));

vi.mock('./cards/ThreadCard', () => ({
    default: ({ thread }: { thread: { id: number } }) => (
        <div data-testid={`thread-card-${thread.id}`} />
    ),
}));

vi.mock('./cards/VisualCard', () => ({
    default: ({ visual }: { visual: { id: number } }) => (
        <div data-testid={`visual-card-${visual.id}`} />
    ),
}));

vi.mock('./modals', () => ({
    ConfirmGenerateModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="confirm-generate-modal" /> : null,
    ConfirmDeleteModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="confirm-delete-modal" /> : null,
    AddShortPostModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="add-short-post-modal" /> : null,
    // THIS is the important one for our cross-hook test.
    // We capture ALL the props so we can call onScheduled() ourselves.
    SchedulePostModal: (props: Record<string, unknown>) => {
        capturedScheduleModalProps = props;
        return props.isOpen ? <div data-testid="schedule-post-modal" /> : null;
    },
    PublishNowModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="publish-now-modal" /> : null,
    SourcePickerModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="source-picker-modal" /> : null,
}));

vi.mock('./modals/VisualPreviewModal', () => ({
    VisualShortPostPreviewModal: () => <div data-testid="visual-sp-preview-modal" />,
    VisualThreadPreviewModal: () => <div data-testid="visual-thread-preview-modal" />,
}));

vi.mock('@/components/GeneratingOverlay', () => ({
    GeneratingOverlay: ({ title }: { title: string }) => (
        <div data-testid="generating-overlay">{title}</div>
    ),
}));

// ============================================
// DEFAULT HOOK RETURN VALUES
// ============================================
//
// Each hook returns an object full of state and functions.
// These defaults represent the "idle" state — nothing loaded, nothing happening.
//
// Why functions as defaults? Because RepurposePanel calls things like
// sp.addScheduledPosts() and sched.handleScheduled(). If those aren't
// functions, the component would crash. vi.fn() gives us safe no-op
// functions that also track whether they were called.

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

// ============================================
// BEFORE EACH
// ============================================
//
// Runs before every single test. Resets all mocks to default state.
// Without this, mock setup from test #1 would bleed into test #2.

beforeEach(() => {
    vi.clearAllMocks();
    capturedScheduleModalProps = {};
    mockUseShortPosts.mockReturnValue(defaultShortPosts());
    mockUseThreads.mockReturnValue(defaultThreads());
    mockUseVisuals.mockReturnValue(defaultVisuals());
    mockUseScheduling.mockReturnValue(defaultScheduling());
});

// ============================================
// TESTS — we'll add these one at a time
// ============================================

describe('RepurposePanel', () => {
    it('renders without crashing', () => {
        render(<RepurposePanel />);
    });

    describe('cross-hook orchestration: handleScheduled', () => {
        it('routes scheduled posts to the short posts hook when contentType is short_post', () => {
            // ARRANGE —
            // We need two hooks set up with specific behavior:
            //
            // 1. The scheduling hook's handleScheduled() must return a result
            //    that says "this was a short_post being scheduled"
            // 2. The short posts hook needs a trackable addScheduledPosts spy
            //    so we can verify it was called

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

            // This is what sched.handleScheduled() will return when called.
            // It tells RepurposePanel: "a short_post (id: 42) was scheduled"
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

            // ACT —
            // Render the component. Our mock SchedulePostModal captures its props,
            // including the onScheduled callback that RepurposePanel created.
            render(<RepurposePanel />);

            // Grab the onScheduled callback from the captured modal props
            // and call it — simulating what happens when the user confirms a schedule.
            const onScheduled = capturedScheduleModalProps.onScheduled as (
                posts: Array<{ id: number; platform: string; status: string; scheduled_at: string }>
            ) => void;

            onScheduled([
                { id: 100, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-01T12:00:00Z' },
            ]);

            // ASSERT —
            // 1. The scheduling hook was asked to process the new scheduled posts
            expect(schedHandleScheduled).toHaveBeenCalledWith([
                { id: 100, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-01T12:00:00Z' },
            ]);

            // 2. Since contentType was 'short_post', the SHORT POSTS hook got the update
            expect(spAddScheduledPosts).toHaveBeenCalledWith(42, [
                { id: 100, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-01T12:00:00Z' },
            ]);

            // 3. The threads hook should NOT have been called — this wasn't a thread
            expect(thAddScheduledPosts).not.toHaveBeenCalled();
        });
    });
});
