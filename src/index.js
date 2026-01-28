/**
 * WordPress Blog Repurpose Plugin - Main Entry Point
 *
 * This is where React "mounts" to the WordPress admin page.
 * Think of it like plugging a TV into a wall socket -
 * the wall socket is the <div id="wbrp-app"> we created in PHP.
 */

import { createRoot } from '@wordpress/element';
import App from './App';
import './styles/main.css';

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Find the container we created in PHP
    const container = document.getElementById('wbrp-app');

    if (container) {
        // Create a React root and render our App
        const root = createRoot(container);
        root.render(<App />);
    }
});
