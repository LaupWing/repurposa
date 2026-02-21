import { getConfig } from './client';

export async function sendLoginCode(email: string): Promise<void> {
    const { apiUrl } = getConfig();
    const response = await fetch(`${apiUrl}/api/auth/email/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, source: 'wordpress' }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
    }
}

export async function verifyLoginCode(email: string, code: string): Promise<{ token: string }> {
    const { apiUrl } = getConfig();
    const response = await fetch(`${apiUrl}/api/auth/email/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, code, source: 'wordpress' }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
}
