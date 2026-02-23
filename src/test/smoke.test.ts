/**
 * Smoke test — verifies the test infrastructure works.
 * Delete this file once real tests exist.
 */

describe('test infrastructure', () => {
    it('runs a basic assertion', () => {
        expect(1 + 1).toBe(2);
    });

    it('has access to window.wbrpConfig from setup', () => {
        expect(window.wbrpConfig).toBeDefined();
        expect(window.wbrpConfig.token).toBe('test-token-123');
    });

    it('has jsdom environment (DOM available)', () => {
        const div = document.createElement('div');
        div.textContent = 'hello';
        expect(div.textContent).toBe('hello');
    });
});
