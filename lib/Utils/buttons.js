// Button helpers: build native-flow buttons, convert every legacy button format
// (buttons / templateButtons / sections) to native-flow interactive buttons that
// modern WhatsApp clients still render, and read button replies back.
import { normalizeMessageContent } from './messages.js';

const toJson = (v) => (typeof v === 'string' ? v : JSON.stringify(v ?? {}));

/** Raw native flow button. `params` may be an object or a JSON string. */
export const nativeButton = (name, params = {}) => ({ name, buttonParamsJson: toJson(params) });

export const quickReply = (displayText, id) =>
    nativeButton('quick_reply', { display_text: displayText, id: String(id ?? displayText) });

export const urlButton = (displayText, url, merchantUrl = url) =>
    nativeButton('cta_url', { display_text: displayText, url, merchant_url: merchantUrl });

export const copyButton = (displayText, copyCode, id = '') =>
    nativeButton('cta_copy', { display_text: displayText, id, copy_code: copyCode });

export const callButton = (displayText, phoneNumber) =>
    nativeButton('cta_call', { display_text: displayText, phone_number: phoneNumber });

export const locationButton = (displayText = 'Send Location') =>
    nativeButton('send_location', { display_text: displayText });

export const selectButton = (title, sections) =>
    nativeButton('single_select', { title, sections: normalizeSections(sections) });

/** Legacy list rows use rowId, native flow rows use id. */
export const normalizeSections = (sections = []) =>
    sections.map((section) => ({
        ...section,
        rows: (section.rows || []).map(({ rowId, ...row }) => ({
            ...row,
            id: row.id ?? rowId ?? row.title
        }))
    }));

const isNative = (b) => b && typeof b === 'object' && typeof b.name === 'string' && 'buttonParamsJson' in b;

const fromLegacyButton = (b) => {
    if (isNative(b)) return b;
    // { buttonId, buttonText: { displayText }, type: 1 | 2, nativeFlowInfo? }
    if (b?.nativeFlowInfo?.name) {
        return nativeButton(b.nativeFlowInfo.name, b.nativeFlowInfo.paramsJson ?? '{}');
    }
    const text = b?.buttonText?.displayText ?? b?.displayText ?? b?.text ?? String(b?.buttonId ?? '');
    return quickReply(text, b?.buttonId ?? b?.id ?? text);
};

const fromTemplateButton = (b) => {
    if (isNative(b)) return b;
    if (b?.quickReplyButton) {
        return quickReply(b.quickReplyButton.displayText, b.quickReplyButton.id);
    }
    if (b?.urlButton) {
        return urlButton(b.urlButton.displayText, b.urlButton.url);
    }
    if (b?.callButton) {
        return callButton(b.callButton.displayText, b.callButton.phoneNumber);
    }
    return null;
};

const hasProductRows = (sections) => sections.some((s) => Array.isArray(s?.productItems));

/**
 * Rewrites legacy button payloads into `interactiveButtons` (native flow).
 * Pass `legacy: true` in the content to keep the raw legacy message untouched.
 * Returns the same object when there is nothing to convert.
 */
export const normalizeButtonContent = (content) => {
    if (!content || typeof content !== 'object' || Array.isArray(content) || Buffer.isBuffer(content)) {
        return content;
    }
    if (content.legacy === true || content.interactiveButtons || content.interactiveMessage) {
        return content;
    }
    const {
        buttons, templateButtons, sections, buttonText, headerType, legacy, ...rest
    } = content;

    if (Array.isArray(buttons) && buttons.length) {
        return { ...rest, interactiveButtons: buttons.map(fromLegacyButton) };
    }
    if (Array.isArray(templateButtons) && templateButtons.length) {
        const list = templateButtons.map(fromTemplateButton).filter(Boolean);
        if (list.length) return { ...rest, interactiveButtons: list };
    }
    if (Array.isArray(sections) && sections.length && !hasProductRows(sections)) {
        return {
            ...rest,
            interactiveButtons: [selectButton(buttonText || 'Pilih', sections)]
        };
    }
    return content;
};

/**
 * Reads the answer of any button / list / template / native flow reply.
 * Accepts a WAMessage ({ message }) or a bare message content object.
 * Returns { type, id, text, name?, params? } or null when it is not a reply.
 */
export const getButtonResponse = (input) => {
    const content = normalizeMessageContent(input?.message ?? input);
    if (!content) return null;

    if (content.buttonsResponseMessage) {
        const r = content.buttonsResponseMessage;
        return { type: 'buttons', id: r.selectedButtonId || '', text: r.selectedDisplayText || '' };
    }
    if (content.templateButtonReplyMessage) {
        const r = content.templateButtonReplyMessage;
        return { type: 'template', id: r.selectedId || '', text: r.selectedDisplayText || '' };
    }
    if (content.listResponseMessage) {
        const r = content.listResponseMessage;
        return {
            type: 'list',
            id: r.singleSelectReply?.selectedRowId || '',
            text: r.title || ''
        };
    }
    const flow = content.interactiveResponseMessage?.nativeFlowResponseMessage;
    if (flow) {
        let params = {};
        try { params = JSON.parse(flow.paramsJson || '{}'); } catch { /* keep empty */ }
        return {
            type: 'native_flow',
            name: flow.name,
            id: params.id ?? params.selectedRowId ?? '',
            text: params.display_text ?? params.title ?? content.interactiveResponseMessage?.body?.text ?? '',
            params
        };
    }
    return null;
};
