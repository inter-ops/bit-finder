import TorrentSearchApi, { Torrent as TorrentType } from "torrent-search-api";

// Works
TorrentSearchApi.enableProvider("ThePirateBay");
TorrentSearchApi.enableProvider("TorrentProject");
TorrentSearchApi.enableProvider("Eztv");

// TODO: broken, investigate
// TorrentSearchApi.enableProvider("Torrentz2"); // parsing code is broken
// TorrentSearchApi.enableProvider("Yts");
// TorrentSearchApi.enableProvider("KickassTorrents");

// Disabled
// TorrentSearchApi.enableProvider("1337x"); // Blocked by Cloudflare
// TorrentSearchApi.enableProvider("Limetorrents"); // Blocked by Cloudflare
// TorrentSearchApi.enableProvider("Rarbg"); // No longer active

// Disabled
// TorrentSearchApi.enableProvider("Torrent9"); // French

export type Torrent = TorrentType;
export default TorrentSearchApi;
