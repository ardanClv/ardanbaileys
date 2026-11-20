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

## Banner

Call `printBanner()` from your bot once it is connected. It prints the panda banner and the creator info from `config/author.json` (bundled, no network needed):

```json
{
  "brand": "DIEZYXHAO BAILEYS",
  "greeting": "Haloo, selamat menggunakan",
  "creator": "diezy clutch",
  "instagram": "rnzdzy_",
  "whatsapp": "https://wa.me/6283165835004",
  "telegram": "t.me/seannanvy"
}
```

## Buttons

Every button format used by the bot base works through `sock.sendMessage`. Legacy formats are converted automatically to native-flow buttons, which modern WhatsApp clients still render. Add `legacy: true` to the content to send the raw legacy message instead.

```js
// legacy buttons (image / video / document / text header)
await sock.sendMessage(jid, { image: { url }, caption: 'Menu', footer: 'bot', buttons: [
  { buttonId: '.menu', buttonText: { displayText: 'Menu' }, type: 1 }
]}, { quoted: m })

// template buttons (quickReply / url / call)
await sock.sendMessage(jid, { text: 'Hi', templateButtons: [
  { index: 1, quickReplyButton: { displayText: 'Ping', id: '.ping' } },
  { index: 2, urlButton: { displayText: 'Site', url: 'https://example.com' } },
  { index: 3, callButton: { displayText: 'Call', phoneNumber: '+628123456789' } }
]})

// list (sections) -> single_select
await sock.sendMessage(jid, { text: 'Pick one', buttonText: 'List Menu', sections: [
  { title: 'Menu', rows: [{ title: 'Tools', rowId: 'menu-tools', description: 'tools' }] }
]})

// native flow (quick_reply, cta_url, cta_copy, cta_call, single_select, send_location, ...)
import { quickReply, urlButton, copyButton, callButton, selectButton } from 'ardanbaileys'
await sock.sendMessage(jid, { image: { url }, text: 'Hello', footer: 'bot', mentions: [sender],
  interactiveButtons: [quickReply('Ping', '.ping'), urlButton('Site', 'https://example.com'), copyButton('Copy', 'CODE')]
}, { quoted: m })
```

Raw `generateWAMessageFromContent` + `relayMessage` with `viewOnceMessage.interactiveMessage.nativeFlowMessage` (as the bot base does) also works. Also supported: `albumMessage`, `ptv`, `groupStatusMessage`, `productMessage`, `eventMessage`, `pollResultMessage`, `requestPaymentMessage`.

Read any reply (buttons, template, list, native flow) with one helper:

```js
import { getButtonResponse } from 'ardanbaileys'
const r = getButtonResponse(m) // { type, id, text, name?, params? } or null
```

CommonJS bots can `require('ardanbaileys')` on Node 22.12 or newer.

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
