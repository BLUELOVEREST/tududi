import { copyTextToClipboard } from './clipboardUtils';

describe('copyTextToClipboard', () => {
    const originalClipboard = navigator.clipboard;
    const originalExecCommand = document.execCommand;

    afterEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: originalClipboard,
        });
        document.execCommand = originalExecCommand;
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    it('uses navigator clipboard when available', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        await expect(copyTextToClipboard('secret')).resolves.toBeUndefined();

        expect(writeText).toHaveBeenCalledWith('secret');
    });

    it('falls back to execCommand when navigator clipboard fails', async () => {
        const writeText = jest.fn().mockRejectedValue(new Error('denied'));
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        document.execCommand = jest.fn().mockReturnValue(true);

        await expect(copyTextToClipboard('secret')).resolves.toBeUndefined();

        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
});
