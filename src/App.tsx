/**
 * Main App Component
 *
 * Renders the appropriate page based on WordPress submenu.
 * No custom sidebar - uses WordPress native navigation.
 */

import { useEffect } from '@wordpress/element';
import { Toaster } from 'sonner';
import { useProfileStore } from './store/profileStore';
import BlogWizard from './components/blog-wizard/BlogWizard';
import BlogsPage from './components/pages/BlogsPage';
import BlogViewPage from './components/pages/BlogViewPage';
import SchedulePage from './components/pages/SchedulePage';
import SettingsPage from './components/pages/SettingsPage';
import LoginModal from './components/LoginModal';
import OnboardingModal from './components/onboarding';
import type { WizardData } from './components/blog-wizard/BlogWizard';
import type { PageType } from './types';

interface AppProps {
    initialPage: PageType;
    postId?: number;
}

export default function App({ initialPage, postId }: AppProps) {
    const { isLoading, isConnected, needsOnboarding, fetchProfile } = useProfileStore();

    // Fetch profile on mount (replaces ProfileProvider)
    useEffect(() => {
        const token = (window.wbrpConfig || { token: '' }).token;
        if (!token) {
            useProfileStore.setState({ isLoading: false });
            return;
        }

        fetchProfile()
            .catch((error) => {
                console.error('Failed to load profile:', error);
                useProfileStore.setState({ isConnected: false });
            })
            .finally(() => {
                useProfileStore.setState({ isLoading: false });
            });
    }, [fetchProfile]);

    const handleWizardComplete = (data: WizardData) => {
        // Redirect to blog view page — it will poll for generation status
        window.location.href = `admin.php?page=blog-repurpose-blogs&post_id=${data.generatedBlogId}`;
    };

    if (isLoading) {
        return null;
    }

    // Not connected — show login modal
    if (!isConnected) {
        return (
            <div className="wbrp-app">
                <Toaster position="bottom-right" richColors />
                <LoginModal onConnected={() => window.location.reload()} />
            </div>
        );
    }

    // Connected but needs onboarding
    if (needsOnboarding) {
        return (
            <div className="wbrp-app">
                <Toaster position="bottom-right" richColors />
                <OnboardingModal onComplete={() => window.location.reload()} />
            </div>
        );
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
                return <SettingsPage />;
            default:
                return <BlogWizard onComplete={handleWizardComplete} />;
        }
    };

    return (
        <div className="wbrp-app">
            <Toaster position="bottom-right" richColors />
            {renderPage()}
        </div>
    );
}
