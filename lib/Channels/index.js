import fs from 'node:fs';
import path from 'node:path';

/**
 * Auto follow channel — satu-satunya sumber: config/channels.json di repo ardanbaileys (GitHub).
 *
 * Aturan:
 *  - Hanya ID yang tercantum di channels.json (bentuk "120363...", spasi dan "@newsletter" dibersihkan).
 *  - Jika GitHub tidak bisa diakses / formatnya salah, TIDAK ada follow sama sekali (tanpa fallback ke sumber lain).
 *  - Channel yang sudah tercatat / sudah terdeteksi diikuti tidak di-follow lagi.
 *  - Tidak pernah unfollow otomatis.
 */
export const CHANNELS_URL = 'https://raw.githubusercontent.com/ardanClv/ardanbaileys/main/config/channels.json';

const MAX_BODY = 64 * 1024;
const FOLLOWED_ROLES = new Set(['SUBSCRIBER', 'ADMIN', 'OWNER']);
const sessionFollowed = new Set();
let inflight = null;

/** "  120363405765232446@newsletter " -> "120363405765232446"; tidak valid -> null. Angka (bukan string) ditolak karena presisinya hilang. */
export function normalizeChannelId(raw) {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().replace(/@newsletter$/i, '').trim();
  return /^\d{10,30}$/.test(id) ? id : null;
}

/** Ambil daftar ID dari GitHub. Hasil: { ok: true, channels: [id...] } atau { ok: false, error }. */
export async function getAllowedChannels({ url = CHANNELS_URL, timeoutMs = 5000, fetchImpl = globalThis.fetch } = {}) {
  try {
    if (typeof fetchImpl !== 'function') throw new Error('fetch tidak tersedia');
    const res = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'ardanbaileys' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error(`GitHub mengembalikan ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_BODY) throw new Error('channels.json terlalu besar');
    const json = JSON.parse(text);
    if (!json || !Array.isArray(json.channels)) throw new Error('format channels.json tidak valid (butuh "channels": [])');
    const channels = [...new Set(json.channels.map(normalizeChannelId).filter(Boolean))];
    return { ok: true, channels };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function readState(file) {
  if (!file) return {};
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return j && typeof j.followed === 'object' && j.followed ? j.followed : {};
  } catch { return {}; }
}

function writeState(file, followed) {
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ followed }, null, 2));
    fs.renameSync(tmp, file);
  } catch { /* gagal menyimpan catatan tidak boleh mengganggu bot */ }
}

async function alreadySubscribed(sock, id) {
  try {
    if (typeof sock.newsletterMetadata !== 'function') return false;
    const meta = await sock.newsletterMetadata('JID', `${id}@newsletter`);
    return FOLLOWED_ROLES.has(String(meta?.viewer_metadata?.role || '').toUpperCase());
  } catch { return false; }
}

/**
 * Follow channel dari channels.json GitHub. Aman dipanggil berulang (setiap koneksi open).
 * options: { stateFile, log(level, msg), url, fetchImpl, timeoutMs }
 * Hasil: { source: 'github'|'none', followed: [], skipped: [], failed: [], error? }
 */
export function followConfiguredChannels(sock, options = {}) {
  if (inflight) return inflight;
  inflight = run(sock, options).finally(() => { inflight = null; });
  return inflight;
}

async function run(sock, { stateFile, log = () => {}, url, fetchImpl, timeoutMs } = {}) {
  const result = { source: 'none', followed: [], skipped: [], failed: [] };
  const list = await getAllowedChannels({ url, fetchImpl, timeoutMs });
  if (!list.ok) {
    result.error = list.error;
    log('warn', `auto follow dilewati, channels.json tidak bisa dibaca: ${list.error}`);
    return result;
  }
  result.source = 'github';
  if (typeof sock?.newsletterFollow !== 'function') {
    result.error = 'newsletterFollow tidak tersedia';
    return result;
  }
  const followed = readState(stateFile);
  for (const id of list.channels) {
    if (followed[id] || sessionFollowed.has(id)) { result.skipped.push(id); continue; }
    if (await alreadySubscribed(sock, id)) {
      followed[id] = { at: Date.now(), via: 'already' };
      sessionFollowed.add(id);
      writeState(stateFile, followed);
      result.skipped.push(id);
      continue;
    }
    try {
      await sock.newsletterFollow(`${id}@newsletter`);
      followed[id] = { at: Date.now(), via: 'follow' };
      sessionFollowed.add(id);
      writeState(stateFile, followed);
      result.followed.push(id);
      log('ok', `follow channel ${id}`);
    } catch (e) {
      result.failed.push(id);
      log('warn', `follow channel ${id} gagal: ${e?.message || e}`);
    }
  }
  return result;
}

/** Hanya untuk test. */
export function _resetChannelsStateForTests() { sessionFollowed.clear(); inflight = null; }
