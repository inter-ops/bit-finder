import TorrentSearchApi, { Torrent as TorrentType } from "torrent-search-api";

// too many providers slows search significantly, using current best
TorrentSearchApi.enableProvider("1337x");
TorrentSearchApi.enableProvider("Rarbg");
TorrentSearchApi.enableProvider("Yts");

export type Torrent = TorrentType;
export default TorrentSearchApi;
