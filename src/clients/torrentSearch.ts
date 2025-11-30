import TorrentSearchApi, { Torrent as TorrentType } from "torrent-search-api";

// NOTE: patched a number of these with changes from https://github.com/JimmyLaurent/torrent-search-api/pull/139/files

// Works
TorrentSearchApi.enableProvider("ThePirateBay");
TorrentSearchApi.enableProvider("TorrentProject");
TorrentSearchApi.enableProvider("Eztv");
TorrentSearchApi.enableProvider("Rarbg");

// TODO: broken, investigate
// TorrentSearchApi.enableProvider("Torrentz2"); // parsing code is broken
// TorrentSearchApi.enableProvider("Yts");
// TorrentSearchApi.enableProvider("KickassTorrents");

// Disabled
// TorrentSearchApi.enableProvider("1337x"); // Blocked by Cloudflare
// TorrentSearchApi.enableProvider("Limetorrents"); // Blocked by Cloudflare

// Disabled
// TorrentSearchApi.enableProvider("Torrent9"); // French

export type Torrent = TorrentType;
export default TorrentSearchApi;
