/**
 * Main App Component
 *
 * This is the root of our React application.
 * For now, it just renders the BlogWizard.
 */

import { useState } from '@wordpress/element';
import BlogWizard from './components/BlogWizard';

export default function App() {
    // Track what view we're showing
    const [view, setView] = useState('wizard'); // 'wizard' | 'editor'
    const [blogData, setBlogData] = useState(null);

    // When wizard completes, we'll switch to editor view (coming later)
    const handleWizardComplete = (data) => {
        console.log('Wizard completed with data:', data);
        setBlogData(data);
        // For now, just log it - we'll add editor view later
        alert('Blog generated! Check console for data.');
    };

    // For now, just show the wizard
    return (
        <div className="wbrp-app">
            <BlogWizard onComplete={handleWizardComplete} />
        </div>
    );
}
