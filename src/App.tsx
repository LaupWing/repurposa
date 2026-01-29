/**
 * Main App Component
 *
 * Renders the appropriate page based on WordPress submenu.
 * No custom sidebar - uses WordPress native navigation.
 */

import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Toaster, toast } from 'sonner';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import BlogWizard from './components/BlogWizard';
import BlogsPage from './components/pages/BlogsPage';
import BlogViewPage from './components/pages/BlogViewPage';
import SchedulePage from './components/pages/SchedulePage';
import ConnectionsPage from './components/pages/ConnectionsPage';
import OnboardingModal, { type ProfileData } from './components/OnboardingModal';
import type { WizardData } from './components/BlogWizard';

// ============================================
// TYPES
// ============================================

type PageType = 'create' | 'blogs' | 'blog-view' | 'schedule' | 'settings';

interface AppProps {
    initialPage: PageType;
    postId?: number;
}

// ============================================
// INNER APP (uses context)
// ============================================

function AppContent({ initialPage, postId }: AppProps) {
    const { profile, isLoading, setProfile } = useProfile();
    const [blogData, setBlogData] = useState<WizardData | null>(null);

    const handleOnboardingComplete = async (data: ProfileData) => {
        try {
            await apiFetch({
                path: '/wbrp/v1/profile',
                method: 'POST',
                data,
            });
            setProfile(data);
            toast.success('Profile saved!', {
                description: "You're all set! Start creating content.",
            });
        } catch (error) {
            console.error('Failed to save profile:', error);
            toast.error('Failed to save profile', {
                description: 'Please try again.',
            });
        }
    };

    const handleWizardComplete = async (data: WizardData) => {
        try {
            await apiFetch({
                path: '/wbrp/v1/blogs',
                method: 'POST',
                data: {
                    title: data.generatedTitle,
                    content: data.generatedContent,
                    topic: data.topic,
                    outline: data.outline,
                },
            });

            setBlogData(data);
            toast.success('Blog created!', {
                description: 'Your blog has been saved as a draft.',
            });

            // Redirect to blogs page
            window.location.href = 'admin.php?page=blog-repurpose-blogs';
        } catch (error) {
            console.error('Failed to save blog:', error);
            toast.error('Failed to save blog', {
                description: 'Please try again.',
            });
        }
    };

    if (isLoading) {
        return null;
    }

    const renderPage = () => {
        switch (initialPage) {
            case 'create':
                return <BlogWizard onComplete={handleWizardComplete} />;
            case 'blogs':
                return <BlogsPage />;
            case 'blog-view':
                return <BlogViewPage postId={postId} />;
            case 'schedule':
                return <SchedulePage />;
            case 'settings':
                return <ConnectionsPage />;
            default:
                return <BlogWizard onComplete={handleWizardComplete} />;
        }
    };

    return (
        <>
            <Toaster position="bottom-right" richColors />
            <OnboardingModal
                isOpen={!profile}
                onComplete={handleOnboardingComplete}
            />
            {renderPage()}
        </>
    );
}

// ============================================
// APP WITH PROVIDER
// ============================================

export default function App(props: AppProps) {
    return (
        <ProfileProvider>
            <div className="wbrp-app">
                <AppContent {...props} />
            </div>
        </ProfileProvider>
    );
}
