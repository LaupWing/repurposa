/**
 * Main App Component
 *
 * Renders the appropriate page based on WordPress submenu.
 * No custom sidebar - uses WordPress native navigation.
 */

import { useState, useEffect } from '@wordpress/element';
import { Toaster } from 'sonner';
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

type PageType = 'create' | 'blogs' | 'blog-view' | 'schedule' | 'connections';

interface AppProps {
    initialPage: PageType;
    postId?: number;
}

// ============================================
// STORAGE KEY
// ============================================

const PROFILE_STORAGE_KEY = 'wbrp_profile';

// ============================================
// COMPONENT
// ============================================

export default function App({ initialPage, postId }: AppProps) {
    const [blogData, setBlogData] = useState<WizardData | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load profile from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
            try {
                setProfile(JSON.parse(stored));
            } catch (e) {
                // Invalid stored data, will show onboarding
            }
        }
        setIsLoading(false);
    }, []);

    const handleOnboardingComplete = (data: ProfileData) => {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
        setProfile(data);
    };

    const handleWizardComplete = (data: WizardData) => {
        console.log('Wizard completed with data:', data);
        setBlogData(data);
        alert('Blog generated! Check console for data.');
    };

    // Don't render anything while checking for stored profile
    if (isLoading) {
        return null;
    }

    // Render the appropriate page
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
        <div className="wbrp-app">
            <Toaster position="bottom-right" richColors />
            <OnboardingModal
                isOpen={!profile}
                onComplete={handleOnboardingComplete}
            />
            {renderPage()}
        </div>
    );
}
