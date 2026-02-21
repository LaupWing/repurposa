/**
 * API Client
 *
 * Base HTTP client for all API calls to the Laravel backend.
 * Config is passed from PHP via wp_localize_script as window.wbrpConfig.
 */

declare global {
    interface Window {
        wbrpConfig: {
            apiUrl: string;
            token: string;
        };
    }
}

export const getConfig = () => window.wbrpConfig || { apiUrl: 'https://ai-blog-tool.test', token: '' };

export async function apiRequest<T>(
    endpoint: string,
    data: Record<string, unknown> = {},
    method: string = 'POST'
): Promise<T> {
    const { apiUrl, token } = getConfig();
    const response = await fetch(`${apiUrl}/api${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
}
