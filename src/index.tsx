/**
 * WordPress Blog Repurpose Plugin - Main Entry Point
 */

import { createRoot } from '@wordpress/element';
import App from './App';
import './styles/main.css';

// Get page type from data attribute
type PageType = 'create' | 'blogs' | 'schedule' | 'connections';

function mountApp(): void {
    const container = document.getElementById('wbrp-app');

    if (container) {
        // Read the page type from PHP
        const page = (container.dataset.page || 'create') as PageType;

        const root = createRoot(container);
        root.render(<App initialPage={page} />);
    } else {
        console.error('WBRP: Could not find #wbrp-app container');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}
