import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeChannelId, getAllowedChannels, followConfiguredChannels, _resetChannelsStateForTests } from '../lib/Channels/index.js';

const okFetch = (body) => async () => ({ ok: true, status: 200, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const mkSock = (opts = {}) => {
  const calls = { follow: [], unfollow: [], meta: [] };
  return {
    calls,
    newsletterFollow: async (jid) => { calls.follow.push(jid); if (opts.failFollow) throw new Error('boom'); },
    newsletterUnfollow: async (jid) => { calls.unfollow.push(jid); },
    newsletterMetadata: async (type, jid) => { calls.meta.push([type, jid]); if (opts.metaThrows) throw new Error('x'); return { viewer_metadata: { role: opts.role || 'GUEST' } }; }
  };
};
const tmpState = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chan-')), 'followed.json');

test('normalizeChannelId membersihkan spasi dan suffix, menolak yang tidak valid', () => {
  assert.equal(normalizeChannelId(' 120363405765232446 '), '120363405765232446');
  assert.equal(normalizeChannelId('120363405765232446@newsletter'), '120363405765232446');
  assert.equal(normalizeChannelId(' 120363405765232446@NEWSLETTER '), '120363405765232446');
  assert.equal(normalizeChannelId('abc'), null);
  assert.equal(normalizeChannelId('123'), null);
  assert.equal(normalizeChannelId(120363405765232446), null);
  assert.equal(normalizeChannelId(null), null);
  assert.equal(normalizeChannelId('https://whatsapp.com/channel/xyz'), null);
});

test('GitHub berisi satu ID -> hanya satu channel itu yang di-follow', async () => {
  _resetChannelsStateForTests();
  const sock = mkSock();
  const r = await followConfiguredChannels(sock, { stateFile: tmpState(), fetchImpl: okFetch({ channels: [' 120363405765232446 '] }) });
  assert.deepEqual(sock.calls.follow, ['120363405765232446@newsletter']);
  assert.deepEqual(r.followed, ['120363405765232446']);
  assert.equal(sock.calls.unfollow.length, 0);
});

test('ID yang sama / duplikat tidak di-follow ulang (state file dan sesi)', async () => {
  _resetChannelsStateForTests();
  const file = tmpState();
  const sock = mkSock();
  const f = okFetch({ channels: ['120363405765232446', '120363405765232446@newsletter', ' 120363405765232446 '] });
  await followConfiguredChannels(sock, { stateFile: file, fetchImpl: f });
  await followConfiguredChannels(sock, { stateFile: file, fetchImpl: f });
  assert.equal(sock.calls.follow.length, 1);
  // proses baru (restart) tetap membaca state file
  _resetChannelsStateForTests();
  const sock2 = mkSock();
  const r = await followConfiguredChannels(sock2, { stateFile: file, fetchImpl: f });
  assert.equal(sock2.calls.follow.length, 0);
  assert.deepEqual(r.skipped, ['120363405765232446']);
});

test('sudah SUBSCRIBER menurut metadata -> tidak follow', async () => {
  _resetChannelsStateForTests();
  const sock = mkSock({ role: 'SUBSCRIBER' });
  const r = await followConfiguredChannels(sock, { stateFile: tmpState(), fetchImpl: okFetch({ channels: ['120363405765232446'] }) });
  assert.equal(sock.calls.follow.length, 0);
  assert.equal(r.skipped.length, 1);
});

test('GitHub gagal (network / status / JSON / format) -> tidak ada follow dan tidak throw', async () => {
  const cases = [
    async () => { throw new Error('offline'); },
    async () => ({ ok: false, status: 404, text: async () => '' }),
    okFetch('bukan json'),
    okFetch({ foo: 1 }),
    okFetch({ channels: 'x' })
  ];
  for (const fetchImpl of cases) {
    _resetChannelsStateForTests();
    const sock = mkSock();
    const r = await followConfiguredChannels(sock, { stateFile: tmpState(), fetchImpl });
    assert.equal(sock.calls.follow.length, 0);
    assert.equal(r.source, 'none');
    assert.ok(r.error);
  }
});

test('ID tidak valid dibuang; hanya yang valid yang di-follow', async () => {
  _resetChannelsStateForTests();
  const sock = mkSock();
  await followConfiguredChannels(sock, { fetchImpl: okFetch({ channels: ['', 'abc', 123, '120363405765232446'] }) });
  assert.deepEqual(sock.calls.follow, ['120363405765232446@newsletter']);
});

test('follow gagal tidak dicatat sehingga dicoba lagi di koneksi berikutnya', async () => {
  _resetChannelsStateForTests();
  const file = tmpState();
  const f = okFetch({ channels: ['120363405765232446'] });
  const bad = mkSock({ failFollow: true });
  const r1 = await followConfiguredChannels(bad, { stateFile: file, fetchImpl: f });
  assert.deepEqual(r1.failed, ['120363405765232446']);
  const good = mkSock();
  await followConfiguredChannels(good, { stateFile: file, fetchImpl: f });
  assert.equal(good.calls.follow.length, 1);
});

test('panggilan bersamaan hanya menjalankan satu proses follow', async () => {
  _resetChannelsStateForTests();
  const sock = mkSock();
  const f = okFetch({ channels: ['120363405765232446'] });
  await Promise.all([followConfiguredChannels(sock, { fetchImpl: f }), followConfiguredChannels(sock, { fetchImpl: f })]);
  assert.equal(sock.calls.follow.length, 1);
});

test('getAllowedChannels membaca config/channels.json bawaan repo dengan benar', async () => {
  const local = fs.readFileSync(new URL('../config/channels.json', import.meta.url), 'utf8');
  const r = await getAllowedChannels({ fetchImpl: okFetch(local) });
  assert.deepEqual(r, { ok: true, channels: ['120363405765232446'] });
});
