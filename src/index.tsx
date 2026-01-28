/**
 * WordPress Blog Repurpose Plugin - Main Entry Point
 */

import { createRoot } from '@wordpress/element';
import App from './App';
import './styles/main.css';

// Function to mount the app
function mountApp(): void {
    const container = document.getElementById('wbrp-app');

    if (container) {
        const root = createRoot(container);
        root.render(<App />);
    } else {
        console.error('WBRP: Could not find #wbrp-app container');
    }
}

// Check if DOM is already ready (WordPress loads scripts at end of page)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    // DOM is already ready, mount immediately
    mountApp();
}
