import { useState, useEffect, useRef } from '@wordpress/element';
import { X, ChevronLeft, ChevronDown, FileText, MessageSquare, ListOrdered, Image, Loader2, Clock, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getBlogs } from '@/services/blogApi';
import { getShortPosts, getThreads, getVisuals } from '@/services/repurposeApi';
import { GRADIENT_PRESETS } from '@/components/repurpose/modals/VisualPreviewModal';
import { AITextPopup } from '@/components/AITextPopup';
import type { BlogPost, ShortPost, ThreadItem, Visual } from '@/types';

// ============================================
// MOCK DATA — remove when done testing UI
// ============================================
const USE_MOCK = true;

const MOCK_BLOGS: BlogPost[] = [
    {
        id: 1,
        title: '10 Ways AI Is Changing Content Marketing in 2026',
        content: '',
        status: 'published',
        thumbnail: 'https://picsum.photos/seed/blog1/200/200',
        short_posts: [{} as ShortPost, {} as ShortPost, {} as ShortPost, {} as ShortPost, {} as ShortPost],
        threads: [{} as ThreadItem, {} as ThreadItem, {} as ThreadItem],
        visuals: [{} as Visual, {} as Visual],
        created_at: '2026-03-10T09:00:00Z',
    },
    {
        id: 2,
        title: 'The Complete Guide to Building a Personal Brand on LinkedIn',
        content: '',
        status: 'draft',
        short_posts: [{} as ShortPost, {} as ShortPost, {} as ShortPost],
        threads: [{} as ThreadItem],
        visuals: [],
        created_at: '2026-03-08T14:30:00Z',
    },
    {
        id: 3,
        title: 'Why Every Developer Should Blog (And How to Start)',
        content: '',
        status: 'published',
        thumbnail: 'https://picsum.photos/seed/blog3/200/200',
        short_posts: [{} as ShortPost, {} as ShortPost, {} as ShortPost, {} as ShortPost, {} as ShortPost, {} as ShortPost, {} as ShortPost, {} as ShortPost],
        threads: [{} as ThreadItem, {} as ThreadItem],
        visuals: [{} as Visual, {} as Visual, {} as Visual],
        created_at: '2026-03-05T11:00:00Z',
    },
];

const MOCK_SHORT_POSTS: Record<number, ShortPost[]> = {
    1: [
        {
            id: 101,
            content: "AI isn't replacing content marketers — it's making the great ones unstoppable.\n\nHere's what changed in the last 6 months that nobody's talking about 🧵",
            media: null,
            metadata: { inspiration_id: 1, hook: 'contrarian', structure: 'hook → body → cta', emotions: ['curiosity', 'urgency'], why_it_works: 'Challenges assumption then promises insider knowledge', media: [] },
            scheduled_posts: [{ id: 1, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-13T10:00:00Z' }],
        },
        {
            id: 102,
            content: "Stop creating more content.\n\nStart repurposing the content you already have.\n\nOne blog post = 10 short posts, 3 threads, and 2 visual carousels.\n\nThat's 15x the reach for 1x the effort.",
            media: null,
            metadata: { inspiration_id: 2, hook: 'command', structure: 'stop/start → math → outcome', emotions: ['surprise', 'motivation'], why_it_works: 'Uses concrete numbers to demonstrate value', media: [] },
        },
        {
            id: 103,
            content: "I spent 4 hours writing a blog post last week.\n\nThen I turned it into:\n→ 10 tweets\n→ 3 LinkedIn posts\n→ 2 Instagram carousels\n→ 1 newsletter\n\nTotal time for repurposing: 12 minutes.\n\nHere's the tool I used:",
            media: null,
            metadata: { inspiration_id: 3, hook: 'story', structure: 'personal story → list → reveal', emotions: ['curiosity', 'fomo'], why_it_works: 'Shows tangible before/after with time savings', media: [] },
        },
        {
            id: 104,
            content: "The best content strategy for 2026 isn't about volume.\n\nIt's about leverage.\n\nWrite once, publish everywhere.\n\nHere's how to set this up in under 10 minutes:",
            media: null,
            metadata: { inspiration_id: 4, hook: 'reframe', structure: 'not X, it\'s Y → how-to', emotions: ['clarity', 'empowerment'], why_it_works: 'Reframes the problem and offers immediate solution', media: [] },
        },
        {
            id: 105,
            content: "Hot take: Most people's content fails not because it's bad, but because they only post it once.\n\nGreat content deserves multiple lives across multiple platforms.\n\nRepurpose relentlessly.",
            media: null,
            metadata: { inspiration_id: 5, hook: 'hot-take', structure: 'opinion → reason → directive', emotions: ['validation', 'motivation'], why_it_works: 'Validates creators who struggle and gives permission to repurpose', media: [] },
            scheduled_posts: [{ id: 2, platform: 'linkedin', status: 'published', scheduled_at: '2026-03-11T14:00:00Z' }],
        },
    ],
    2: [
        {
            id: 201,
            content: "Your LinkedIn profile isn't a resume.\n\nIt's a landing page.\n\nTreat it like one and watch what happens.",
            media: null,
            metadata: { inspiration_id: 6, hook: 'reframe', structure: 'not X → it\'s Y → CTA', emotions: ['surprise', 'motivation'], why_it_works: 'Challenges common LinkedIn misconception', media: [] },
        },
        {
            id: 202,
            content: "I grew from 500 to 12,000 LinkedIn followers in 6 months.\n\nNo ads. No engagement pods. No BS.\n\nJust 3 rules I followed religiously:\n\n1. Post daily (even when nobody's watching)\n2. Comment 30 min/day on target accounts\n3. Repurpose every blog post into 5+ LinkedIn posts\n\nConsistency > virality.",
            media: null,
            metadata: { inspiration_id: 7, hook: 'results', structure: 'result → anti-hacks → rules → lesson', emotions: ['aspiration', 'trust'], why_it_works: 'Shows real results with actionable and honest framework', media: [] },
        },
        {
            id: 203,
            content: "Personal branding tip nobody asked for:\n\nYour \"niche\" isn't a topic.\n\nIt's the intersection of:\n• What you know deeply\n• What people pay for\n• What you'd talk about for free\n\nFind that overlap. That's your brand.",
            media: null,
            metadata: { inspiration_id: 8, hook: 'unsolicited-advice', structure: 'reframe → framework → directive', emotions: ['clarity', 'self-reflection'], why_it_works: 'Provides a simple mental model for a complex decision', media: [] },
        },
    ],
    3: [
        {
            id: 301,
            content: "\"I have nothing to write about\"\n\nYes you do. You just solved a bug at work. You learned something new. You have an opinion.\n\nThe bar for blogging isn't expertise — it's experience.\n\nStart writing.",
            media: null,
            metadata: { inspiration_id: 9, hook: 'objection-buster', structure: 'objection → counter → reframe → CTA', emotions: ['validation', 'encouragement'], why_it_works: 'Addresses the #1 blocker and lowers the bar', media: [] },
        },
        {
            id: 302,
            content: "Every blog post you write is:\n\n• A future reference for your team\n• A portfolio piece for job interviews\n• Content for 10+ social media posts\n• SEO traffic that compounds over years\n\nBlogging is the highest-ROI activity nobody does.",
            media: null,
            metadata: { inspiration_id: 10, hook: 'list-value', structure: 'list of benefits → bold claim', emotions: ['fomo', 'motivation'], why_it_works: 'Stacks concrete benefits to build overwhelming case', media: [] },
        },
    ],
};

const MOCK_THREADS: Record<number, ThreadItem[]> = {
    1: [
        {
            id: 501,
            hook: "I analyzed 200+ viral content marketing campaigns from 2026.\n\nHere are 7 patterns that keep showing up (and how to steal them):",
            posts: [
                { content: "I analyzed 200+ viral content marketing campaigns from 2026.\n\nHere are 7 patterns that keep showing up (and how to steal them):", media: null },
                { content: "Pattern 1: The Repurpose Engine\n\nThe best marketers don't create more — they distribute more.\n\nOne pillar piece → 15+ derivative posts.\n\nThis alone 3x'd output for the top performers I studied.", media: null },
                { content: "Pattern 2: AI as Editor, Not Writer\n\nNobody's winning with pure AI content.\n\nBut creators using AI to refine, repurpose, and optimize their own ideas? They're crushing it.", media: null },
                { content: "Pattern 3: Platform-Native Formatting\n\nSame message, different packaging.\n\nWhat works on X doesn't work on LinkedIn.\n\nTop creators reformat for each platform, not just cross-post.", media: null },
                { content: "That's 3 of 7. Want the full breakdown?\n\nI wrote a deep-dive blog post covering all patterns with examples.\n\nLink in bio.", media: null },
            ],
            metadata: { inspiration_id: 1, hook_techniques: ['data-driven', 'listicle'], structure: 'hook → numbered patterns → CTA', emotions: ['curiosity', 'fomo'], why_it_works: 'Combines authority (200+ campaigns) with practical takeaways' },
        },
        {
            id: 502,
            hook: "Content marketing is broken.\n\nHere's why most brands are wasting 80% of their content budget (and how to fix it):",
            posts: [
                { content: "Content marketing is broken.\n\nHere's why most brands are wasting 80% of their content budget (and how to fix it):", media: null },
                { content: "The average blog post gets published once, shared twice, and forgotten.\n\nThat's not a content strategy. That's a content graveyard.", media: null },
                { content: "The fix isn't creating less content.\n\nIt's building a system that turns every piece into 10+.\n\nBlog → tweets, threads, carousels, newsletters.\n\nOne input, many outputs.", media: null },
            ],
            metadata: { inspiration_id: 2, hook_techniques: ['bold-claim', 'problem-solution'], structure: 'problem → data → solution', emotions: ['frustration', 'hope'], why_it_works: 'Names a pain point every marketer feels' },
            scheduled_posts: [{ id: 3, platform: 'twitter', status: 'pending', scheduled_at: '2026-03-14T09:00:00Z' }],
        },
        {
            id: 503,
            hook: "The AI content playbook that actually works in 2026.\n\n(Not the garbage \"just use ChatGPT\" advice you've seen everywhere)",
            posts: [
                { content: "The AI content playbook that actually works in 2026.\n\n(Not the garbage \"just use ChatGPT\" advice you've seen everywhere)", media: null },
                { content: "Step 1: Write your pillar content yourself.\n\nYour voice, your expertise, your stories.\n\nAI can't replicate what makes you, you.", media: null },
                { content: "Step 2: Use AI to repurpose.\n\nTake that blog post and generate:\n• Short posts in your voice\n• Thread breakdowns\n• Visual carousels\n\nThis is where AI shines — reformatting, not creating from scratch.", media: null },
                { content: "Step 3: Human review everything.\n\nAI gives you a 70% draft. Your job is the last 30%.\n\nEdit, refine, add personality.\n\nThat's the combo that wins.", media: null },
            ],
            metadata: { inspiration_id: 3, hook_techniques: ['anti-hype', 'step-by-step'], structure: 'contrarian hook → numbered steps → conclusion', emotions: ['trust', 'clarity'], why_it_works: 'Positions against hype while being genuinely helpful' },
        },
    ],
    2: [
        {
            id: 601,
            hook: "I went from unknown to 12K LinkedIn followers in 6 months.\n\nHere's the exact system I used (step by step):",
            posts: [
                { content: "I went from unknown to 12K LinkedIn followers in 6 months.\n\nHere's the exact system I used (step by step):", media: null },
                { content: "Week 1-4: Foundation\n\n• Rewrote my profile as a landing page\n• Defined my 3 content pillars\n• Set up a repurposing workflow from my blog\n\nMost people skip this. Don't.", media: null },
                { content: "Week 5-12: Consistency\n\n• Posted daily at 8:15 AM\n• Spent 30 min commenting on 10 target accounts\n• Every blog post became 5+ LinkedIn posts\n\nThis is the boring part. It's also the most important.", media: null },
                { content: "Week 13-24: Compounding\n\n• Engagement started snowballing\n• Comments turned into DMs turned into clients\n• One viral post (1.2M views) changed everything\n\nBut it only went viral because I had 12 weeks of consistency behind it.", media: null },
            ],
            metadata: { inspiration_id: 4, hook_techniques: ['results-first', 'timeline'], structure: 'result → chronological breakdown → lesson', emotions: ['aspiration', 'trust'], why_it_works: 'Transparent timeline makes it feel achievable' },
        },
    ],
    3: [
        {
            id: 701,
            hook: "Every developer should have a blog.\n\nNot for followers. Not for money.\n\nFor your future self. Here's why:",
            posts: [
                { content: "Every developer should have a blog.\n\nNot for followers. Not for money.\n\nFor your future self. Here's why:", media: null },
                { content: "Reason 1: You'll forget how you solved that problem.\n\nBlog about it. Future you (and your team) will thank you.", media: null },
                { content: "Reason 2: Writing clarifies thinking.\n\nIf you can't explain it in a blog post, you don't understand it deeply enough.\n\nBlogging forces clarity.", media: null },
                { content: "Reason 3: Compounding career capital.\n\nEvery post is a portfolio piece.\n\nI've gotten 3 job offers directly from blog posts. Zero from my resume.", media: null },
            ],
            metadata: { inspiration_id: 5, hook_techniques: ['reframe', 'numbered-reasons'], structure: 'reframe → reasons → personal proof', emotions: ['motivation', 'pragmatism'], why_it_works: 'Challenges the common "I don\'t have time" objection by reframing the purpose' },
        },
        {
            id: 702,
            hook: "\"I'm not experienced enough to blog.\"\n\nWrong. Here's the secret nobody tells junior devs:",
            posts: [
                { content: "\"I'm not experienced enough to blog.\"\n\nWrong. Here's the secret nobody tells junior devs:", media: null },
                { content: "The best technical blog posts aren't written by experts.\n\nThey're written by people who just figured something out.\n\nBecause they remember exactly what was confusing.", media: null },
                { content: "Your \"I just learned X\" post is more valuable than a senior's \"here's everything about X\" post.\n\nBecause you write at the level your reader is at.\n\nThat's a superpower, not a weakness.", media: null },
            ],
            metadata: { inspiration_id: 6, hook_techniques: ['objection-buster', 'reframe'], structure: 'objection → counter → proof → empowerment', emotions: ['validation', 'confidence'], why_it_works: 'Directly addresses imposter syndrome' },
        },
    ],
};

const MOCK_VISUALS: Record<number, Visual[]> = {
    1: [
        {
            id: 801,
            post_id: 1,
            source_type: 'short_post',
            source_id: 102,
            content: [
                "Stop creating more content.\n\nStart repurposing the content you already have.",
                "One blog post =\n\n→ 10 short posts\n→ 3 threads\n→ 2 visual carousels",
                "That's 15x the reach\nfor 1x the effort.",
            ],
            description: "Repurpose your content for 15x the reach. Stop creating more, start distributing better. #ContentMarketing #Repurpose",
            settings: { style: 'minimal', theme: 'dark', corners: 'rounded', gradient_id: 'sunset', display_name: 'Loc Nguyen', handle: '@locnguyen' },
            created_at: '2026-03-10T12:00:00Z',
            updated_at: '2026-03-10T12:00:00Z',
        },
        {
            id: 802,
            post_id: 1,
            source_type: 'short_post',
            source_id: 104,
            content: ["The best content strategy for 2026 isn't about volume.\n\nIt's about leverage.\n\nWrite once, publish everywhere."],
            description: "Content strategy 2026: leverage over volume. Write once, publish everywhere. #ContentStrategy",
            settings: { style: 'basic', theme: 'light', corners: 'rounded', gradient_id: 'ocean', display_name: 'Loc Nguyen', handle: '@locnguyen' },
            created_at: '2026-03-10T12:30:00Z',
            updated_at: '2026-03-10T12:30:00Z',
            scheduled_posts: [{ id: 4, platform: 'instagram', status: 'pending', scheduled_at: '2026-03-15T11:00:00Z' }],
        },
    ],
    3: [
        {
            id: 901,
            post_id: 3,
            source_type: 'short_post',
            source_id: 301,
            content: [
                "\"I have nothing to write about\"",
                "Yes you do.\n\nYou just solved a bug at work.\nYou learned something new.\nYou have an opinion.",
                "The bar for blogging isn't expertise.\n\nIt's experience.\n\nStart writing.",
            ],
            description: "You don't need to be an expert to blog. You just need experience. Start writing today. #DevBlog #Blogging",
            settings: { style: 'detailed', theme: 'dark', corners: 'square', gradient_id: 'purple-haze', display_name: 'Loc Nguyen', handle: '@locnguyen' },
            created_at: '2026-03-06T10:00:00Z',
            updated_at: '2026-03-06T10:00:00Z',
        },
        {
            id: 902,
            post_id: 3,
            source_type: 'thread',
            source_id: 701,
            content: [
                "Every developer should have a blog",
                "Not for followers.\nNot for money.\n\nFor your future self.",
                "3 reasons why:\n\n1. You'll forget how you solved it\n2. Writing clarifies thinking\n3. Compounding career capital",
            ],
            description: "Why every developer should blog — it's not about followers, it's about your future self. #DevLife #TechBlog",
            settings: { style: 'minimal', theme: 'light', corners: 'rounded', gradient_id: 'mint', display_name: 'Loc Nguyen', handle: '@locnguyen' },
            created_at: '2026-03-06T11:00:00Z',
            updated_at: '2026-03-06T11:00:00Z',
        },
        {
            id: 903,
            post_id: 3,
            source_type: 'short_post',
            source_id: 302,
            content: ["Every blog post you write is:\n\n• A future reference\n• A portfolio piece\n• Content for 10+ social posts\n• SEO traffic that compounds\n\nHighest-ROI activity nobody does."],
            description: "Blogging is the highest-ROI activity nobody does. Here's what every post gives you. #Blogging #ROI",
            settings: { style: 'basic', theme: 'dark', corners: 'rounded', gradient_id: 'fire', display_name: 'Loc Nguyen', handle: '@locnguyen' },
            created_at: '2026-03-06T11:30:00Z',
            updated_at: '2026-03-06T11:30:00Z',
            scheduled_posts: [{ id: 5, platform: 'instagram', status: 'published', scheduled_at: '2026-03-09T12:00:00Z' }],
        },
    ],
};

function getMockBlogs(): Promise<BlogPost[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_BLOGS), 300));
}
function getMockShortPosts(blogId: number): Promise<ShortPost[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_SHORT_POSTS[blogId] || []), 200));
}
function getMockThreads(blogId: number): Promise<ThreadItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_THREADS[blogId] || []), 200));
}
function getMockVisuals(blogId: number): Promise<Visual[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_VISUALS[blogId] || []), 200));
}

type ContentType = 'short_posts' | 'threads' | 'visuals';
type Step = 'blogs' | 'content-type' | 'pick';
type Tab = 'existing' | 'create';

const SHORT_POSTS_PER_PAGE = 4;

interface SlotContentPickerProps {
    isOpen: boolean;
    slotLabel: string;
    onClose: () => void;
    onSelect: (item: { type: 'short_post' | 'thread' | 'visual'; id: number; blogId?: number; content: string }) => void;
}

function ScheduleBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded shrink-0">
            <Clock size={10} />
            Scheduled
        </span>
    );
}

function MiniVisualPreview({ visual }: { visual: Visual }) {
    const firstSlide = Array.isArray(visual.content) ? visual.content[0] : visual.content;
    const slideCount = Array.isArray(visual.content) ? visual.content.length : 1;
    const isDark = visual.settings.theme === 'dark';
    const gradient = GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0];
    const gradientClass = isDark ? gradient.dark : gradient.light;

    return (
        <div className={`w-16 h-16 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-1.5 relative`}>
            <p className={`text-[5px] leading-tight line-clamp-4 text-center ${isDark ? 'text-white/90' : 'text-gray-900/80'}`}>
                {firstSlide}
            </p>
            {slideCount > 1 && (
                <span className={`absolute bottom-0.5 right-1 text-[7px] font-bold ${isDark ? 'text-white/60' : 'text-gray-900/40'}`}>
                    1/{slideCount}
                </span>
            )}
        </div>
    );
}

function ThreadChain({ thread }: { thread: ThreadItem }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div>
            <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
                <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                {thread.posts.length} posts in thread
            </button>
            {isExpanded && (
                <div className="mt-2 ml-2 border-l-2 border-gray-100 pl-3 space-y-2">
                    {thread.posts.map((post, i) => (
                        <div key={i} className="relative">
                            <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-gray-200" />
                            <p className="text-xs text-gray-500 line-clamp-2">{post.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SlotContentPicker({ isOpen, slotLabel, onClose, onSelect }: SlotContentPickerProps) {
    const [activeTab, setActiveTab] = useState<Tab>('existing');
    const [step, setStep] = useState<Step>('blogs');
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
    const [contentType, setContentType] = useState<ContentType | null>(null);
    const [shortPosts, setShortPosts] = useState<ShortPost[]>([]);
    const [threads, setThreads] = useState<ThreadItem[]>([]);
    const [visuals, setVisuals] = useState<Visual[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shortPostPage, setShortPostPage] = useState(1);
    const [newPostText, setNewPostText] = useState('');
    const newPostTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setActiveTab('existing');
            setStep('blogs');
            setSelectedBlog(null);
            setContentType(null);
            setShortPosts([]);
            setThreads([]);
            setVisuals([]);
            setShortPostPage(1);
            setNewPostText('');
            setIsLoading(true);
            const fetchBlogs = USE_MOCK ? getMockBlogs : getBlogs;
            fetchBlogs()
                .then((data) => setBlogs(data.filter(b => b.status !== 'generating' && b.status !== 'failed')))
                .catch(() => toast.error('Failed to load blogs'))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const handleSelectBlog = (blog: BlogPost) => {
        setSelectedBlog(blog);
        setStep('content-type');
    };

    const handleSelectContentType = async (type: ContentType) => {
        if (!selectedBlog) return;
        setContentType(type);
        setStep('pick');
        setIsLoading(true);
        setShortPostPage(1);
        try {
            if (type === 'short_posts') {
                const fetch = USE_MOCK ? getMockShortPosts : getShortPosts;
                const data = await fetch(selectedBlog.id);
                setShortPosts(data);
            } else if (type === 'threads') {
                const fetch = USE_MOCK ? getMockThreads : getThreads;
                const data = await fetch(selectedBlog.id);
                setThreads(data);
            } else {
                const fetch = USE_MOCK ? getMockVisuals : getVisuals;
                const data = await fetch(selectedBlog.id);
                setVisuals(data);
            }
        } catch {
            toast.error('Failed to load content');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 'pick') {
            setStep('content-type');
            setContentType(null);
        } else if (step === 'content-type') {
            setStep('blogs');
            setSelectedBlog(null);
        }
    };

    const isScheduled = (scheduledPosts?: { status: string }[]) => {
        return scheduledPosts?.some(sp => sp.status === 'pending' || sp.status === 'publishing' || sp.status === 'published');
    };

    if (!isOpen) return null;

    const title = step === 'blogs'
        ? 'Select a Blog'
        : step === 'content-type'
            ? selectedBlog?.title || 'Select Type'
            : contentType === 'short_posts'
                ? 'Short Posts'
                : contentType === 'threads'
                    ? 'Threads'
                    : 'Visuals';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-3">
                        {step !== 'blogs' && (
                            <button
                                onClick={handleBack}
                                className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 line-clamp-1">{title}</h2>
                            <p className="text-xs text-gray-400">{slotLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-5 shrink-0">
                    <button
                        onClick={() => setActiveTab('existing')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'existing'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Pick Existing
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'create'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Create New
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {activeTab === 'create' ? (
                        <div className="flex flex-col h-full">
                            <div className="relative flex-1">
                                <textarea
                                    ref={newPostTextareaRef}
                                    value={newPostText}
                                    onChange={(e) => setNewPostText(e.target.value)}
                                    placeholder="Write your post... Select text for AI actions."
                                    className="w-full h-full min-h-[200px] resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors"
                                />
                                <AITextPopup
                                    textareaRef={newPostTextareaRef}
                                    value={newPostText}
                                    onChange={setNewPostText}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <span className={`text-xs tabular-nums ${newPostText.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {newPostText.length} / 280
                                </span>
                                <button
                                    onClick={() => {
                                        if (!newPostText.trim()) {
                                            toast.error('Write something first');
                                            return;
                                        }
                                        onSelect({ type: 'short_post', id: 0, content: newPostText.trim() });
                                    }}
                                    disabled={!newPostText.trim()}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                    <Send size={14} />
                                    Schedule Post
                                </button>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                    ) : step === 'blogs' ? (
                        /* Blog list */
                        blogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText size={24} className="text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">No blogs yet</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {blogs.map((blog) => (
                                    <button
                                        key={blog.id}
                                        onClick={() => handleSelectBlog(blog)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                                    >
                                        {blog.thumbnail ? (
                                            <img src={blog.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                                <FileText size={16} className="text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{blog.title || 'Untitled'}</p>
                                            <p className="text-xs text-gray-400">
                                                {blog.short_posts?.length || 0} posts · {blog.threads?.length || 0} threads
                                            </p>
                                        </div>
                                        <ChevronLeft size={16} className="text-gray-300 rotate-180 group-hover:text-gray-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        )
                    ) : step === 'content-type' ? (
                        /* Content type picker */
                        <div className="space-y-2">
                            <button
                                onClick={() => handleSelectContentType('short_posts')}
                                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <MessageSquare size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Short Posts</p>
                                    <p className="text-xs text-gray-500">Single social media posts</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleSelectContentType('threads')}
                                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                    <ListOrdered size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Threads</p>
                                    <p className="text-xs text-gray-500">Multi-post thread chains</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleSelectContentType('visuals')}
                                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                    <Image size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Visuals</p>
                                    <p className="text-xs text-gray-500">Image cards for social media</p>
                                </div>
                            </button>
                        </div>
                    ) : step === 'pick' && contentType === 'short_posts' ? (
                        shortPosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <MessageSquare size={24} className="text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">No short posts for this blog</p>
                            </div>
                        ) : (() => {
                            const totalPages = Math.ceil(shortPosts.length / SHORT_POSTS_PER_PAGE);
                            const paginated = shortPosts.slice((shortPostPage - 1) * SHORT_POSTS_PER_PAGE, shortPostPage * SHORT_POSTS_PER_PAGE);
                            return (
                                <div className="space-y-1.5">
                                    {paginated.map((sp) => {
                                        const scheduled = isScheduled(sp.scheduled_posts);
                                        return (
                                            <button
                                                key={sp.id}
                                                onClick={() => {
                                                    if (scheduled) {
                                                        toast.info('This post is already scheduled');
                                                        return;
                                                    }
                                                    onSelect({ type: 'short_post', id: sp.id, blogId: selectedBlog?.id, content: sp.content });
                                                }}
                                                className={`w-full p-3 rounded-lg text-left transition-colors ${
                                                    scheduled
                                                        ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                                        : 'hover:bg-gray-50 cursor-pointer'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm text-gray-800 line-clamp-3">{sp.content}</p>
                                                    {scheduled && <ScheduleBadge />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => setShortPostPage(p => Math.max(1, p - 1))}
                                                disabled={shortPostPage === 1}
                                                className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-xs text-gray-400">
                                                {shortPostPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setShortPostPage(p => Math.min(totalPages, p + 1))}
                                                disabled={shortPostPage === totalPages}
                                                className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : step === 'pick' && contentType === 'threads' ? (
                        threads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <ListOrdered size={24} className="text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">No threads for this blog</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {threads.map((thread) => {
                                    const scheduled = isScheduled(thread.scheduled_posts);
                                    return (
                                        <div
                                            key={thread.id}
                                            onClick={() => {
                                                if (scheduled) {
                                                    toast.info('This thread is already scheduled');
                                                    return;
                                                }
                                                onSelect({ type: 'thread', id: thread.id, blogId: selectedBlog?.id, content: thread.hook });
                                            }}
                                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                                                scheduled
                                                    ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                                    : 'hover:bg-gray-50 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium text-gray-800 line-clamp-2">{thread.hook}</p>
                                                {scheduled && <ScheduleBadge />}
                                            </div>
                                            <ThreadChain thread={thread} />
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : step === 'pick' && contentType === 'visuals' ? (
                        visuals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Image size={24} className="text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">No visuals for this blog</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {visuals.map((visual) => {
                                    const scheduled = isScheduled(visual.scheduled_posts);
                                    const previewText = Array.isArray(visual.content) ? visual.content[0] : visual.content;
                                    return (
                                        <button
                                            key={visual.id}
                                            onClick={() => {
                                                if (scheduled) {
                                                    toast.info('This visual is already scheduled');
                                                    return;
                                                }
                                                onSelect({ type: 'visual', id: visual.id, blogId: selectedBlog?.id, content: previewText });
                                            }}
                                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                                                scheduled
                                                    ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                                    : 'hover:bg-gray-50 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <MiniVisualPreview visual={visual} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm text-gray-800 line-clamp-2">{previewText}</p>
                                                        {scheduled && <ScheduleBadge />}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {Array.isArray(visual.content) && visual.content.length > 1 && (
                                                            <span className="text-xs text-gray-400">{visual.content.length} slides</span>
                                                        )}
                                                        <span className="text-xs text-gray-300">
                                                            {visual.settings.style} · {visual.settings.theme}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    ) : null}
                </div>
            </div>
        </div>
    );
}
