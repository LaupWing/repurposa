/**
 * Main App Component
 *
 * Renders the appropriate page based on WordPress submenu.
 * No custom sidebar - uses WordPress native navigation.
 */

import { Toaster, toast } from 'sonner';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import BlogWizard from './components/BlogWizard';
import BlogsPage from './components/pages/BlogsPage';
import BlogViewPage from './components/pages/BlogViewPage';
import SchedulePage from './components/pages/SchedulePage';
import ConnectionsPage from './components/pages/ConnectionsPage';
import LoginModal from './components/LoginModal';
import OnboardingModal from './components/OnboardingModal';
import type { WizardData } from './components/BlogWizard';
import type { PageType } from './types';

interface AppProps {
    initialPage: PageType;
    postId?: number;
}

// ============================================
// INNER APP (uses context)
// ============================================

function AppContent({ initialPage, postId }: AppProps) {
    const { isLoading, isConnected, needsOnboarding } = useProfile();

    const handleWizardComplete = (data: WizardData) => {
        toast.success('Blog created!', {
            description: 'Your blog has been saved as a draft.',
        });

        // Redirect to blog view page with the Laravel post ID
        window.location.href = `admin.php?page=blog-repurpose-blogs&post_id=${data.generatedBlogId}`;
    };

    if (isLoading) {
        return null;
    }

    // Not connected — show login modal
    if (!isConnected) {
        return (
            <>
                <Toaster position="bottom-right" richColors />
                <LoginModal onConnected={() => window.location.reload()} />
            </>
        );
    }

    // Connected but needs onboarding
    if (needsOnboarding) {
        return (
            <>
                <Toaster position="bottom-right" richColors />
                <OnboardingModal onComplete={() => window.location.reload()} />
            </>
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
            case 'connections':
                return <ConnectionsPage />;
            default:
                return <BlogWizard onComplete={handleWizardComplete} />;
        }
    };

    return (
        <>
            <Toaster position="bottom-right" richColors />
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
