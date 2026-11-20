import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeButtonContent, getButtonResponse, selectButton } from '../lib/Utils/buttons.js';

test('legacy buttons become quick_reply native flow buttons', () => {
  const r = normalizeButtonContent({ text: 'x', buttons: [{ buttonId: 'id1', buttonText: { displayText: 'A' }, type: 1 }], headerType: 4 });
  assert.equal(r.buttons, undefined);
  assert.equal(r.interactiveButtons[0].name, 'quick_reply');
  assert.deepEqual(JSON.parse(r.interactiveButtons[0].buttonParamsJson), { display_text: 'A', id: 'id1' });
});

test('templateButtons map to quick_reply / cta_url / cta_call', () => {
  const r = normalizeButtonContent({ text: 'x', templateButtons: [
    { index: 1, quickReplyButton: { displayText: 'Q', id: 'q' } },
    { index: 2, urlButton: { displayText: 'U', url: 'https://x.y' } },
    { index: 3, callButton: { displayText: 'C', phoneNumber: '+62' } }
  ] });
  assert.deepEqual(r.interactiveButtons.map(b => b.name), ['quick_reply', 'cta_url', 'cta_call']);
});

test('sections map to single_select with id rows', () => {
  const r = normalizeButtonContent({ text: 'x', buttonText: 'Menu', sections: [{ title: 'S', rows: [{ title: 'R', rowId: 'r1' }] }] });
  const p = JSON.parse(r.interactiveButtons[0].buttonParamsJson);
  assert.equal(p.title, 'Menu');
  assert.equal(p.sections[0].rows[0].id, 'r1');
});

test('legacy:true and plain content are left untouched', () => {
  const a = { text: 'a', buttons: [{ buttonId: '1', buttonText: { displayText: 'x' } }], legacy: true };
  const b = { text: 'plain' };
  assert.equal(normalizeButtonContent(a), a);
  assert.equal(normalizeButtonContent(b), b);
  assert.equal(normalizeButtonContent({ text: 'a', buttons: [selectButton('T', [])] }).interactiveButtons[0].name, 'single_select');
});

test('getButtonResponse reads every reply type', () => {
  assert.equal(getButtonResponse({ message: { buttonsResponseMessage: { selectedButtonId: 'b' } } }).id, 'b');
  assert.equal(getButtonResponse({ message: { viewOnceMessage: { message: { templateButtonReplyMessage: { selectedId: 't' } } } } }).id, 't');
  assert.equal(getButtonResponse({ listResponseMessage: { singleSelectReply: { selectedRowId: 'row' } } }).id, 'row');
  assert.equal(getButtonResponse({ message: { interactiveResponseMessage: { nativeFlowResponseMessage: { name: 'single_select', paramsJson: '{"id":"menu"}' } } } }).id, 'menu');
  assert.equal(getButtonResponse({ message: { conversation: 'x' } }), null);
});
