/**
 * API Client
 *
 * Base HTTP client for all API calls to the Laravel backend.
 * Config is passed from PHP via wp_localize_script as window.repurposaConfig.
 */

declare global {
    interface Window {
        repurposaConfig: {
            apiUrl: string;
            token: string;
            snelstackLang: string | null;
        };
    }
}

export const getConfig = () => window.repurposaConfig || {
    apiUrl: 'https://ai-blog-tool.test',
    token: '',
    snelstackLang: null,
};

export async function apiRequest<T>(
    endpoint: string,
    data: Record<string, unknown> = {},
    method: string = 'POST'
): Promise<T> {
    const { apiUrl, token } = getConfig();
    const url = `${apiUrl}/api${endpoint}`;

    // [threads-debug] TEMP — verbose logging for thread endpoints. Remove once prod issue is fixed.
    const isThreadsEndpoint = endpoint.includes('thread');
    const startedAt = performance.now();
    if (isThreadsEndpoint) {
        console.log('[threads-debug] apiRequest →', {
            method,
            url,
            endpoint,
            hasToken: !!token,
            tokenLength: token?.length ?? 0,
            payloadKeys: method !== 'GET' ? Object.keys(data) : null,
            payloadPreview: method !== 'GET' ? JSON.stringify(data).slice(0, 300) : null,
            timestamp: new Date().toISOString(),
        });
    }

    let response: Response;
    try {
        response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: method !== 'GET' ? JSON.stringify(data) : undefined,
        });
    } catch (networkError) {
        if (isThreadsEndpoint) {
            console.error('[threads-debug] apiRequest network failure', {
                method,
                url,
                elapsedMs: Math.round(performance.now() - startedAt),
                error: networkError,
                message: networkError instanceof Error ? networkError.message : String(networkError),
            });
        }
        throw networkError;
    }

    if (isThreadsEndpoint) {
        console.log('[threads-debug] apiRequest ← response', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            elapsedMs: Math.round(performance.now() - startedAt),
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
        });
    }

    if (!response.ok) {
        // Read once as text so we can log the raw body even if it's not JSON (HTML error page, empty, etc.)
        const rawBody = await response.text().catch(() => '');
        let parsed: any = null;
        try {
            parsed = rawBody ? JSON.parse(rawBody) : null;
        } catch {
            // not JSON
        }
        if (isThreadsEndpoint) {
            console.error('[threads-debug] apiRequest non-OK body', {
                status: response.status,
                statusText: response.statusText,
                rawBodyPreview: rawBody.slice(0, 1000),
                rawBodyLength: rawBody.length,
                parsed,
            });
        }
        const err = new Error(parsed?.message || `API error: ${response.status}`);
        // attach metadata so callers can surface it
        (err as any).meta = { status: response.status, statusText: response.statusText, body: parsed ?? rawBody.slice(0, 1000), endpoint };
        throw err;
    }

    const text = await response.text();
    if (isThreadsEndpoint) {
        console.log('[threads-debug] apiRequest OK body', {
            length: text.length,
            preview: text.slice(0, 300),
        });
    }
    return text ? JSON.parse(text) : undefined as T;
}
