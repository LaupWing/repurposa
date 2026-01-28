/**
 * Main App Component
 */

import { useState } from '@wordpress/element';
import BlogWizard from './components/BlogWizard';
import type { WizardData } from './components/BlogWizard';

type View = 'wizard' | 'editor';

export default function App() {
    const [view, setView] = useState<View>('wizard');
    const [blogData, setBlogData] = useState<WizardData | null>(null);

    const handleWizardComplete = (data: WizardData) => {
        console.log('Wizard completed with data:', data);
        setBlogData(data);
        alert('Blog generated! Check console for data.');
    };

    return (
        <div className="wbrp-app">
            <BlogWizard onComplete={handleWizardComplete} />
        </div>
    );
}
