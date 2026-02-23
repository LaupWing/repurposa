/**
 * Test Setup
 *
 * Runs before every test file. Sets up:
 * - DOM matchers (toBeInTheDocument, toHaveTextContent, etc.)
 * - Global mocks (window.wbrpConfig, WordPress globals)
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom doesn't implement scrollTo — stub it so components that scroll don't crash.
Element.prototype.scrollTo = vi.fn();

// Mock the WordPress config that PHP injects via wp_localize_script.
// Every test starts with a known-good config. Individual tests can override.
Object.defineProperty(window, 'wbrpConfig', {
    writable: true,
    value: {
        apiUrl: 'http://test-api.local',
        token: 'test-token-123',
    },
});
