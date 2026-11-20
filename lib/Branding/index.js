import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const localConfigPath = path.resolve(here, '../../config/author.json');

const defaults = {
  brand: 'ARDAN BAILEYS',
  greeting: 'Haloo, selamat menggunakan',
  creator: 'ardan wut wut',
  instagram: 'ardan_ocean',
  whatsapp: 'https://wa.me/6287792339461',
  telegram: 't.me/ardanFnaf'
};

let cachedConfig;

/** Load banner identity from config/author.json (bundled), falling back to defaults. */
export async function getAuthorConfig({ refresh = false } = {}) {
  if (cachedConfig && !refresh) return { ...cachedConfig };
  try {
    const local = JSON.parse(await fs.readFile(localConfigPath, 'utf8'));
    cachedConfig = { ...defaults, ...local };
  } catch {
    cachedConfig = { ...defaults };
  }
  return { ...cachedConfig };
}

const rgb = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
const PINK = rgb(240, 130, 160);
const RED = rgb(255, 86, 126);
const RESET = '\x1b[0m';

// Panda braille art shown in the startup banner.
const ART = [
  "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⣶⣶⣤⡀",
  "⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣤⣤⣄⣀⣀⡀",
  "⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡿⠟⠋⠁⠀⠀⠀⠀⠀⠁⠉⠛⠦⣄⡀",
  "⠀⠀⠀⠀⠀⠀⠀⠀⡄⡼⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠙⢦⣶⣶⣶⣦⣄",
  "⠀⠀⠀⠀⠀⠀⠀⡄⡟⠀⠀⠀⠀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣿⣿⣿⣿⣦",
  "⠀⡀⣀⣀⡀⠀⠀⡿⠀⠀⡀⣴⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠇⣿⣿⣿⡟",
  "⡀⣿⣿⣿⣿⣦⣄⡇⠁⠋⡇⣿⣿⣯⣼⠏⠀⠀⠀⠀⠀⡀⣰⣦⣄⠀⠀⠀⠀⢹⡿⠋",
  "⠁⣿⣿⣿⣿⣿⣿⣿⠀⠀⡀⣙⠛⠛⠁⠀⠀⣦⣤⡀⠀⣾⡟⣿⣿⣷⠀⠀⠀⡇⠂",
  "⠀⠹⣿⣿⣿⣿⣿⣿⣧⡀⠉⠁⠀⠀⠀⠻⣤⣿⣉⣩⠀⠹⣷⣿⣿⡿⠀⠀⠀⣼",
  "⠀⠀⠃⣿⣿⣿⣿⣿⣿⣿⣶⣄⡀⠀⠀⠀⠀⠁⠉⠁⠀⠀⡅⡉⠉⠀⡇⠀⣼⠃",
  "⠀⠀⠀⠁⢻⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⣄⣀⠀⠀⠀⠀⠀⠀⠑⠆⠀⣠⡾⠁",
  "⠀⠀⠀⠀⠀⠙⡟⠛⠻⠿⠿⠿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣶⣶⣶⣿⣏⠁",
  "⠀⠀⠀⠀⠀⡆⠃⠀⠀⠀⠀⠀⠀⠀⠉⠛⠛⠿⢿⣿⣿⣿⣿⣿⣿⣿⣆",
  "⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠙⣿⣿⣿⣿⣿⣿⣆",
  "⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠃⢿⣿⣿⣿⣿⣿⡄",
  "⠀⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⣿⣿⣿⣿⣿⡇",
  "⠀⠀⠀⠀⠀⡇⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⣿⠇",
  "⠀⠀⠀⠀⠀⠁⣿⣿⣷⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣿⣿⠁⠙⠛⠉",
  "⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⡗⠒⠶⠤⠤⣶⣶⣿⣿⣿⣿⡿",
  "⠀⠀⠀⠀⠀⠀⡇⣿⣿⣿⣿⣿⠃⠀⠀⠀⠀⡇⣿⣿⣿⣿⣿⠁",
  "⠀⠀⠀⠀⠀⠀⠀⠙⠿⠿⠿⠃⠀⠀⠀⠀⠀⠀⠙⠿⠿⠟⠃"
];

/** Print the startup banner (panda art + creator info). */
export async function printBanner() {
  const author = await getAuthorConfig();
  const out = [
    '',
    `${RED}</> ${author.greeting} ${author.brand} </>${RESET}`,
    '',
    ...ART.map((l) => `${PINK}${l}${RESET}`),
    '',
    `${PINK}Creator   : ${author.creator}`,
    `Instagram : ${author.instagram}`,
    `WhatsApp  : ${author.whatsapp}`,
    `Telegram  : ${author.telegram}${RESET}`,
    ''
  ];
  console.log(out.join('\n'));
  return author;
}

/** Standard command logger; call this from the bot's command handler. */
export function logCommand(info = {}) {
  const {
    command = '-', prefix = '/', user = 'Unknown', number = '-',
    chatType = 'private', groupName = '', message = ''
  } = info;
  const isGroup = String(chatType).toLowerCase() === 'group';
  const chat = isGroup ? (groupName || 'Group') : number;
  const label = isGroup ? 'GROUP' : 'PRIVATE';
  const time = new Date().toLocaleString('id-ID', { hour12: false });
  console.log(
    `\x1b[36m[${label}]\x1b[0m ` +
    `\x1b[35m${chat}\x1b[0m ` +
    `\x1b[33m<-->\x1b[0m ` +
    `\x1b[32m${user}\x1b[0m ` +
    `\x1b[37m: ${message || `${prefix}${command}`}\x1b[0m ` +
    `\x1b[90m(${time})\x1b[0m`
  );
}
