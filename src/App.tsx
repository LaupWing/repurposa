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
import ConnectAccount from './components/ConnectAccount';
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
    const { isLoading, isConnected } = useProfile();
    const [justConnected, setJustConnected] = useState(false);

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

    // Not connected — show connect screen
    if (!isConnected && !justConnected) {
        return (
            <>
                <Toaster position="bottom-right" richColors />
                <ConnectAccount onConnected={() => {
                    setJustConnected(true);
                    toast.success('Account connected!');
                    // Reload to fetch profile with new token
                    window.location.reload();
                }} />
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
            case 'settings':
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
