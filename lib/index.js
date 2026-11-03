//=======================================================//

import makeWASocket from "./Socket/index.js";
export { Dugong } from './Socket/dugong.js';
//=======================================================//
export * from "./Defaults/index.js";
export * from "./WABinary/index.js";
export * from "../WAProto/index.js";
export * from "./WAUSync/index.js";
export * from "./Store/index.js";
export * from "./Utils/index.js";
export * from "./Types/index.js";
export * from "./WAM/index.js";
//=======================================================//
export { makeWASocket };
export default makeWASocket;
//=======================================================//
// Shared ARDAN identity, banner, and command logger.
export { getAuthorConfig, printBanner, logCommand } from "./Branding/index.js";

// Auto follow channel: hanya dari config/channels.json di repo ardanbaileys.
export { getAllowedChannels, normalizeChannelId, followConfiguredChannels, CHANNELS_URL } from "./Channels/index.js";

// Show the banner once when this package is first loaded by the bot process.
import { printBanner as __printArdanBanner } from "./Branding/index.js";
void __printArdanBanner().catch(() => {});
