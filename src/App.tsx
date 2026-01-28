/**
 * Main App Component
 *
 * Renders the appropriate page based on WordPress submenu.
 * No custom sidebar - uses WordPress native navigation.
 */

import { useState } from '@wordpress/element';
import BlogWizard from './components/BlogWizard';
import BlogsPage from './components/pages/BlogsPage';
import SchedulePage from './components/pages/SchedulePage';
import ConnectionsPage from './components/pages/ConnectionsPage';
import type { WizardData } from './components/BlogWizard';

// ============================================
// TYPES
// ============================================

type PageType = 'create' | 'blogs' | 'schedule' | 'connections';

interface AppProps {
    initialPage: PageType;
}

// ============================================
// COMPONENT
// ============================================

export default function App({ initialPage }: AppProps) {
    const [blogData, setBlogData] = useState<WizardData | null>(null);

    const handleWizardComplete = (data: WizardData) => {
        console.log('Wizard completed with data:', data);
        setBlogData(data);
        alert('Blog generated! Check console for data.');
    };

    // Render the appropriate page
    const renderPage = () => {
        switch (initialPage) {
            case 'create':
                return <BlogWizard onComplete={handleWizardComplete} />;
            case 'blogs':
                return <BlogsPage />;
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
            {renderPage()}
        </div>
    );
}
