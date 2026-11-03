# ardanbaileys

Standalone WhatsApp Web multi-device library for Node.js.

## Requirements

- Node.js 20 or newer

## Install

```bash
npm install
```

## Use

```js
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from 'ardanbaileys'

const { state, saveCreds } = await useMultiFileAuthState('./session')
const { version } = await fetchLatestBaileysVersion()
const sock = makeWASocket({ auth: state, version })
sock.ev.on('creds.update', saveCreds)
```

This repository contains the library source (`lib/`) and generated WhatsApp protocol definitions (`WAProto/`). It is intended to be installed as a dependency by a bot project.

## License and upstream notices

See [LICENSE](./LICENSE). Existing copyright and license notices in the source are retained.

## ARDAN author identity and startup banner

The package prints the ARDAN startup banner once when it is first imported in a Node.js process. At startup it fetches `config/author.json` from the `main` branch of this repository. If GitHub cannot be reached, it falls back to the bundled `config/author.json`.

To change the author shown by every bot using this package, edit only `config/author.json` in this GitHub repository:

```json
{
  "name": "ARDAN",
  "instagram": "@your_instagram",
  "whatsapp": "628xxxxxxxxxx",
  "thanks": "THANK YOU FOR USING MY BAILEYS",
  "copyright": "© ARDAN"
}
```

After the change is committed, restart a bot process and the banner will fetch the latest GitHub values. A network connection to `raw.githubusercontent.com` is needed for the latest values; otherwise the local bundled values are used. This remote identity fetch is separate from updating the Baileys source code itself.

### Shared command log

The library cannot detect each bot's command parser or message fields automatically. Call the exported logger from the command handler:

```js
import { logCommand } from 'ardanbaileys';

// Inside your existing command handler, after isCmd is true:
logCommand({
  command: command,
  prefix: prefix,
  user: pushname,
  number: sender.split('@')[0],
  chatType: m.isGroup ? 'group' : 'private',
  groupName: groupName,
  message: body
});
```

Exports: `getAuthorConfig()`, `printBanner()`, and `logCommand(info)`.

## Auto follow channel (hanya dari GitHub)

Satu-satunya sumber channel adalah `config/channels.json` di branch `main` repo ini:

```json
{ "channels": ["120363405765232446"] }
```

Bot memanggil `followConfiguredChannels(sock, { stateFile, log })` (biasanya saat `connection: 'open'`). Aturan:

- Hanya ID yang ada di file itu yang di-follow. Spasi dan suffix `@newsletter` dibersihkan; ID tidak valid dibuang.
- Jika GitHub tidak bisa diakses atau formatnya salah, tidak ada follow sama sekali dan bot tetap jalan.
- ID yang sudah tercatat di `stateFile`, atau sudah terdeteksi `SUBSCRIBER/ADMIN/OWNER` lewat `newsletterMetadata`, tidak di-follow lagi.
- Tidak pernah unfollow otomatis. Follow yang gagal dicoba lagi pada koneksi berikutnya.
- Tidak ada lagi daftar channel dari sumber lain (sistem `loadBase` lama sudah dihapus).

Test: `npm test`.
