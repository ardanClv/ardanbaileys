
import fs from 'node:fs';
import path from 'node:path';

/**
 * ARDANBAILEYS AUTO FOLLOW CHANNEL
 *
 * Channel hanya berasal dari GitHub.
 * Pemeriksaan status menggunakan newsletterMetadata.
 * Tidak mengandalkan state file sebagai status langganan.
 */

export const CHANNELS_URL =
  'https://raw.githubusercontent.com/ardanClv/ardanbaileys/main/config/channels.json';

const MAX_BODY = 64 * 1024;

const FOLLOWED_ROLES = new Set([
  'SUBSCRIBER',
  'ADMIN',
  'OWNER'
]);

const inflightBySocket = new WeakMap();

export function normalizeChannelId(raw) {
  if (typeof raw !== 'string') return null;

  const id = raw
    .trim()
    .replace(/@newsletter$/i, '')
    .trim();

  return /^\d{10,30}$/.test(id) ? id : null;
}

function emit(log, level, message) {
  try {
    log(level, message);
  } catch {}
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
      throw new Error(`GitHub HTTP ${res.status}`);
    }

    const body = await res.text();

    if (body.length > MAX_BODY) {
      throw new Error('channels.json terlalu besar');
    }

    const json = JSON.parse(body);

    if (!Array.isArray(json?.channels)) {
      throw new Error(
        'Format channels.json harus memiliki array channels'
      );
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

    return data?.followed &&
      typeof data.followed === 'object'
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
  } catch (e) {
    // State hanya catatan, bukan penentu status follow.
  }
}

/**
 * true  = status menunjukkan sudah follow
 * false = status menunjukkan belum follow
 * null  = status tidak dapat dipastikan
 */
async function alreadySubscribed(sock, id, log) {
  try {
    if (
      typeof sock.newsletterMetadata !== 'function'
    ) {
      emit(
        log,
        'warn',
        'newsletterMetadata tidak tersedia'
      );

      return null;
    }

    const metadata = await sock.newsletterMetadata(
      'JID',
      `${id}@newsletter`
    );

    const viewer = metadata?.viewer_metadata;

    emit(
      log,
      'info',
      `Metadata channel ${id}: ${JSON.stringify(
        viewer ?? metadata
      )}`
    );

    const role = String(
      viewer?.role || ''
    ).toUpperCase();

    if (FOLLOWED_ROLES.has(role)) {
      return true;
    }

    if (role) {
      return false;
    }

    return null;
  } catch (e) {
    emit(
      log,
      'warn',
      `Cek status channel ${id} gagal: ${e?.message || e}`
    );

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

  emit(log, 'info', 'Mengambil daftar channel dari GitHub...');

  const list = await getAllowedChannels({
    url,
    fetchImpl,
    timeoutMs
  });

  if (!list.ok) {
    result.error = list.error;

    emit(
      log,
      'warn',
      `Auto follow gagal mengambil daftar: ${list.error}`
    );

    return result;
  }

  result.source = 'github';

  emit(
    log,
    'info',
    `Ditemukan ${list.channels.length} channel dari GitHub`
  );

  if (list.channels.length === 0) {
    emit(
      log,
      'warn',
      'Tidak ada ID channel valid di channels.json'
    );

    return result;
  }

  if (typeof sock.newsletterFollow !== 'function') {
    result.error = 'newsletterFollow tidak tersedia';

    emit(log, 'warn', result.error);

    return result;
  }

  const followed = readState(stateFile);

  for (const id of list.channels) {
    emit(log, 'info', `Memeriksa channel ${id}...`);

    const subscribed = await alreadySubscribed(
      sock,
      id,
      log
    );

    if (subscribed === true) {
      followed[id] = {
        at: Date.now(),
        via: 'already'
      };

      writeState(stateFile, followed);

      result.skipped.push(id);

      emit(
        log,
        'info',
        `Channel ${id} sudah diikuti`
      );

      continue;
    }

    if (subscribed === null) {
      result.failed.push(id);

      emit(
        log,
        'warn',
        `Channel ${id} dilewati karena status follow tidak diketahui`
      );

      continue;
    }

    try {
      emit(log, 'info', `Mencoba follow channel ${id}...`);

      await sock.newsletterFollow(
        `${id}@newsletter`
      );

      followed[id] = {
        at: Date.now(),
        via: 'follow'
      };

      writeState(stateFile, followed);

      result.followed.push(id);

      emit(
        log,
        'ok',
        `Berhasil follow channel ${id}`
      );
    } catch (e) {
      result.failed.push(id);

      emit(
        log,
        'warn',
        `Follow channel ${id} gagal: ${e?.message || e}`
      );
    }
  }

  emit(
    log,
    'info',
    `Auto follow selesai: ${result.followed.length} berhasil, ${result.skipped.length} sudah diikuti, ${result.failed.length} gagal`
  );

  return result;
}

export function _resetChannelsStateForTests() {
  inflightBySocket.clear?.();
}
