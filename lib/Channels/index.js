
import fs from 'node:fs';
import path from 'node:path';

/**
 * ARDANBAILEYS AUTO FOLLOW CHANNEL
 *
 * Sumber channel hanya dari config/channels.json GitHub.
 * - Mendukung banyak channel.
 * - Memeriksa status follow WhatsApp.
 * - Tidak mengandalkan catatan lama sebagai status aktif.
 * - Tidak otomatis unfollow channel.
 * - Aman dipanggil berulang.
 */

export const CHANNELS_URL =
  'https://raw.githubusercontent.com/ardanClv/ardanbaileys/main/config/channels.json';

const MAX_BODY = 64 * 1024;
const FOLLOWED_ROLES = new Set([
  'SUBSCRIBER',
  'ADMIN',
  'OWNER'
]);

const sessionFollowed = new Set();
const inflightBySocket = new WeakMap();

export function normalizeChannelId(raw) {
  if (typeof raw !== 'string') return null;

  const id = raw
    .trim()
    .replace(/@newsletter$/i, '')
    .trim();

  return /^\d{10,30}$/.test(id) ? id : null;
}

export async function getAllowedChannels({
  url = CHANNELS_URL,
  timeoutMs = 10000,
  fetchImpl = globalThis.fetch
} = {}) {
  try {
    if (typeof fetchImpl !== 'function') {
      throw new Error('fetch tidak tersedia');
    }

    const res = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'ardanbaileys'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      throw new Error(`GitHub mengembalikan ${res.status}`);
    }

    const body = await res.text();

    if (body.length > MAX_BODY) {
      throw new Error('channels.json terlalu besar');
    }

    const json = JSON.parse(body);

    if (!json || !Array.isArray(json.channels)) {
      throw new Error('Format channels.json tidak valid');
    }

    const channels = [
      ...new Set(
        json.channels
          .map(normalizeChannelId)
          .filter(Boolean)
      )
    ];

    return {
      ok: true,
      channels
    };
  } catch (e) {
    return {
      ok: false,
      channels: [],
      error: e?.message || String(e)
    };
  }
}

function readState(file) {
  if (!file) return {};

  try {
    const data = JSON.parse(
      fs.readFileSync(file, 'utf8')
    );

    return data &&
      typeof data.followed === 'object' &&
      data.followed
      ? data.followed
      : {};
  } catch {
    return {};
  }
}

function writeState(file, followed) {
  if (!file) return;

  try {
    fs.mkdirSync(path.dirname(file), {
      recursive: true
    });

    const temp = `${file}.tmp`;

    fs.writeFileSync(
      temp,
      JSON.stringify({ followed }, null, 2)
    );

    fs.renameSync(temp, file);
  } catch {
    // Gagal menyimpan catatan tidak boleh menghentikan bot.
  }
}

/**
 * true  = sudah follow
 * false = belum follow
 * null  = status gagal diperiksa
 */
async function alreadySubscribed(sock, id) {
  try {
    if (
      typeof sock.newsletterMetadata !== 'function'
    ) {
      return null;
    }

    const metadata = await sock.newsletterMetadata(
      'JID',
      `${id}@newsletter`
    );

    const role = String(
      metadata?.viewer_metadata?.role || ''
    ).toUpperCase();

    return FOLLOWED_ROLES.has(role);
  } catch {
    return null;
  }
}

export function followConfiguredChannels(sock, options = {}) {
  if (!sock || typeof sock !== 'object') {
    return Promise.resolve({
      source: 'none',
      followed: [],
      skipped: [],
      failed: [],
      error: 'Socket tidak valid'
    });
  }

  const existing = inflightBySocket.get(sock);

  if (existing) return existing;

  const task = run(sock, options).finally(() => {
    inflightBySocket.delete(sock);
  });

  inflightBySocket.set(sock, task);

  return task;
}

async function run(
  sock,
  {
    stateFile,
    log = () => {},
    url,
    fetchImpl,
    timeoutMs
  } = {}
) {
  const result = {
    source: 'none',
    followed: [],
    skipped: [],
    failed: []
  };

  const list = await getAllowedChannels({
    url,
    fetchImpl,
    timeoutMs
  });

  if (!list.ok) {
    result.error = list.error;
    log(
      'warn',
      `auto follow dilewati: ${list.error}`
    );
    return result;
  }

  result.source = 'github';

  if (typeof sock.newsletterFollow !== 'function') {
    result.error = 'newsletterFollow tidak tersedia';
    log('warn', result.error);
    return result;
  }

  if (list.channels.length === 0) {
    log('warn', 'Tidak ada ID channel valid di channels.json');
    return result;
  }

  const followed = readState(stateFile);

  log(
    'info',
    `Memeriksa ${list.channels.length} channel dari GitHub`
  );

  for (const id of list.channels) {
    const subscribed = await alreadySubscribed(sock, id);

    if (subscribed === true) {
      followed[id] = {
        at: Date.now(),
        via: 'already'
      };

      sessionFollowed.add(id);
      writeState(stateFile, followed);

      result.skipped.push(id);
      log('info', `channel ${id} sudah diikuti`);

      continue;
    }

    if (subscribed === null) {
      result.failed.push(id);
      log(
        'warn',
        `status channel ${id} gagal diperiksa, dilewati`
      );
      continue;
    }

    try {
      await sock.newsletterFollow(
        `${id}@newsletter`
      );

      followed[id] = {
        at: Date.now(),
        via: 'follow'
      };

      sessionFollowed.add(id);
      writeState(stateFile, followed);

      result.followed.push(id);
      log('ok', `follow channel ${id}`);
    } catch (e) {
      result.failed.push(id);

      log(
        'warn',
        `follow channel ${id} gagal: ${e?.message || e}`
      );
    }
  }

  log(
    'info',
    `Auto follow selesai: ${result.followed.length} berhasil, ${result.skipped.length} sudah diikuti, ${result.failed.length} gagal`
  );

  return result;
}

export function _resetChannelsStateForTests() {
  sessionFollowed.clear();
}
