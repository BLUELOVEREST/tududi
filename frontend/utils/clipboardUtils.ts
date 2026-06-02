export async function copyTextToClipboard(text: string): Promise<void> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
    } catch {
        // Fall through to the textarea fallback for non-secure origins.
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';

    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!copied) {
        throw new Error('Unable to copy text to clipboard.');
    }
}
