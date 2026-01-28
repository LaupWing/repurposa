/**
 * WordPress Blog Repurpose Plugin - Main Entry Point
 */

import { createRoot } from '@wordpress/element';
import App from './App';
import './styles/main.css';

// Get page type from data attribute
type PageType = 'create' | 'blogs' | 'blog-view' | 'schedule' | 'connections';

function mountApp(): void {
    const container = document.getElementById('wbrp-app');

    if (container) {
        // Read the page type and post ID from PHP
        const page = (container.dataset.page || 'create') as PageType;
        const postId = container.dataset.postId ? parseInt(container.dataset.postId, 10) : undefined;

        const root = createRoot(container);
        root.render(<App initialPage={page} postId={postId} />);
    } else {
        console.error('WBRP: Could not find #wbrp-app container');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}
