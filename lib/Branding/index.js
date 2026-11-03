import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const localConfigPath = path.resolve(here, '../../config/author.json');
const remoteConfigUrl = 'https://raw.githubusercontent.com/ardanClv/ardanbaileys/main/config/author.json';

const defaults = {
  name: 'ARDAN',
  instagram: '@instagram_kamu',
  whatsapp: '628xxxxxxxxxx',
  thanks: 'THANK YOU FOR USING MY BAILEYS',
  copyright: '© ARDAN'
};

let cachedConfig;

/** Load author identity from GitHub on every process start; use bundled config offline. */
export async function getAuthorConfig({ refresh = false } = {}) {
  if (cachedConfig && !refresh) return { ...cachedConfig };

  try {
    const response = await fetch(remoteConfigUrl, {
      headers: { accept: 'application/json', 'user-agent': 'ardanbaileys' },
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const remote = await response.json();
    cachedConfig = { ...defaults, ...remote };
    return { ...cachedConfig };
  } catch {
    try {
      const local = JSON.parse(await fs.readFile(localConfigPath, 'utf8'));
      cachedConfig = { ...defaults, ...local };
    } catch {
      cachedConfig = { ...defaults };
    }
    return { ...cachedConfig };
  }
}

const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/** Print the shared ARDAN startup banner. */
export async function printBanner() {
  const author = await getAuthorConfig({ refresh: true });
  const cyan = '\x1b[36m';
  const white = '\x1b[37m';
  const reset = '\x1b[0m';
  const green = '\x1b[32m';
  console.log(`\n${cyan}    █████╗ ██████╗ ██████╗  █████╗ ███╗   ██╗${reset}`);
  console.log(`${cyan}   ██╔══██╗██╔══██╗██╔══██╗██╔══██╗████╗  ██║${reset}`);
  console.log(`${cyan}   ███████║██████╔╝██║  ██║███████║██╔██╗ ██║${reset}`);
  console.log(`${cyan}   ██╔══██║██╔══██╗██║  ██║██╔══██║██║╚██╗██║${reset}`);
  console.log(`${cyan}   ██║  ██║██║  ██║██████╔╝██║  ██║██║ ╚████║${reset}`);
  console.log(`${cyan}   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝${reset}`);
  console.log(`${white}${line}${reset}`);
  console.log(`${green} ${author.thanks}${reset}`);
  console.log(`${white} Author    : ${author.name}`);
  console.log(` Instagram : ${author.instagram}`);
  console.log(` WhatsApp  : ${author.whatsapp}`);
  console.log(` ${author.copyright}${reset}`);
  console.log(`${white}${line}\n${reset}`);
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
