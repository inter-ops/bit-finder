export interface TorrentMetadata {
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  audioChannels?: string;
  source?: string;
  hdr?: string;
  bitDepth?: string;
  releaseGroup?: string;
  season?: string;
  episode?: string;
  languages?: string[];
  subtitles?: string[];
  isYTSCapped?: boolean;
}

export interface ParsedTorrent {
  title: string;
  seeds: number;
  peers: number;
  size: string;
  provider: string;
  link?: string;
  time?: string;
  category: "Movie" | "TV" | "Other";
  metadata: TorrentMetadata;
  raw: any;
}

/**
 * Parse torrent title to extract quality metadata
 */
export function parseTorrentMetadata(title: string): TorrentMetadata {
  const lowerTitle = title.toLowerCase();
  const metadata: TorrentMetadata = {};

  // Resolution
  if (/8k|4320p/i.test(title)) metadata.resolution = "8K";
  else if (/2160p|4k|uhd/i.test(title)) metadata.resolution = "4K";
  else if (/1080p/i.test(title)) metadata.resolution = "1080p";
  else if (/720p/i.test(title)) metadata.resolution = "720p";
  else if (/480p/i.test(title)) metadata.resolution = "480p";
  else if (/360p/i.test(title)) metadata.resolution = "360p";

  // Video Codec
  if (/\bav1\b/i.test(title)) metadata.videoCodec = "AV1";
  else if (/\bh\.?265\b|hevc|x265/i.test(title)) metadata.videoCodec = "H.265";
  else if (/\bh\.?264\b|x264|avc/i.test(title)) metadata.videoCodec = "H.264";
  else if (/xvid/i.test(title)) metadata.videoCodec = "XviD";
  else if (/divx/i.test(title)) metadata.videoCodec = "DivX";

  // Audio Codec
  if (/atmos|dolby[-\s]?atmos/i.test(title)) metadata.audioCodec = "Dolby Atmos";
  else if (/truehd|true[-\s]?hd/i.test(title)) metadata.audioCodec = "TrueHD";
  else if (/dts[-\s]?hd[-\s]?ma|dts[-\s]?hd/i.test(title)) metadata.audioCodec = "DTS-HD";
  else if (/dts[-\s]?x/i.test(title)) metadata.audioCodec = "DTS-X";
  else if (/\bdts\b/i.test(title)) metadata.audioCodec = "DTS";
  else if (/\bac3\b|dolby[-\s]?digital/i.test(title)) metadata.audioCodec = "AC3";
  else if (/\baac\b/i.test(title)) metadata.audioCodec = "AAC";
  else if (/\bmp3\b/i.test(title)) metadata.audioCodec = "MP3";

  // Audio Channels
  if (/7\.1/i.test(title)) metadata.audioChannels = "7.1";
  else if (/5\.1/i.test(title)) metadata.audioChannels = "5.1";
  else if (/2\.0/i.test(title)) metadata.audioChannels = "2.0";
  else if (/stereo/i.test(title)) metadata.audioChannels = "Stereo";

  // Source
  if (/remux|blu[-\s]?ray[-\s]?remux/i.test(title)) metadata.source = "Remux";
  else if (/blu[-\s]?ray|bluray|bdrip|brrip/i.test(title)) metadata.source = "BluRay";
  else if (/web[-\s]?dl/i.test(title)) metadata.source = "WEB-DL";
  else if (/webrip|web[-\s]?rip/i.test(title)) metadata.source = "WEBRip";
  else if (/hdtv/i.test(title)) metadata.source = "HDTV";
  else if (/dvd[-\s]?rip|dvdrip/i.test(title)) metadata.source = "DVDRip";
  else if (/cam|camrip|hdcam/i.test(title)) metadata.source = "CAM";
  else if (/ts|telesync/i.test(title)) metadata.source = "Telesync";

  // HDR
  if (/dolby[-\s]?vision|dovi/i.test(title)) metadata.hdr = "Dolby Vision";
  else if (/hdr10\+|hdr10plus/i.test(title)) metadata.hdr = "HDR10+";
  else if (/hdr10|hdr/i.test(title)) metadata.hdr = "HDR10";

  // Languages (common patterns)
  const languages: string[] = [];
  if (/\bmulti\b/i.test(title)) languages.push("Multi");
  if (/\benglis/i.test(title)) languages.push("English");
  if (/\bfrench|vostfr/i.test(title)) languages.push("French");
  if (/\bspanish/i.test(title)) languages.push("Spanish");
  if (/\bgerman/i.test(title)) languages.push("German");
  if (/\bitalian/i.test(title)) languages.push("Italian");
  if (/\bjapanese/i.test(title)) languages.push("Japanese");
  if (/\bchinese/i.test(title)) languages.push("Chinese");
  if (/\bkorean/i.test(title)) languages.push("Korean");
  if (languages.length > 0) metadata.languages = languages;

  // Subtitles
  const subtitles: string[] = [];
  if (/\bsubs?\b/i.test(title)) subtitles.push("Available");
  if (/\bmulti[-\s]?subs?\b/i.test(title)) subtitles.push("Multi");
  if (/\beng[-\s]?subs?\b/i.test(title)) subtitles.push("English");
  if (subtitles.length > 0) metadata.subtitles = subtitles;

  // Bit Depth
  if (/10[-\s]?bit|hi10p/i.test(title)) metadata.bitDepth = "10-bit";
  else if (/8[-\s]?bit/i.test(title)) metadata.bitDepth = "8-bit";

  // Release Group (extract text in brackets/at end)
  const groupMatch = title.match(/[-\s]([A-Z0-9]+)$/i) || title.match(/\[([^\]]+)\]$/);
  if (groupMatch && groupMatch[1] && groupMatch[1].length < 20) {
    metadata.releaseGroup = groupMatch[1];
  }

  // TV Show: Season and Episode
  const seasonEpisodeMatch = title.match(/S(\d{1,2})E(\d{1,3})/i);
  const altFormatMatch = title.match(/(\d{1,2})x(\d{1,3})/i);

  if (seasonEpisodeMatch) {
    metadata.season = `S${seasonEpisodeMatch[1].padStart(2, "0")}`;
    metadata.episode = `E${seasonEpisodeMatch[2].padStart(2, "0")}`;
  } else if (altFormatMatch) {
    metadata.season = `S${altFormatMatch[1].padStart(2, "0")}`;
    metadata.episode = `E${altFormatMatch[2].padStart(2, "0")}`;
  }

  return metadata;
}

/**
 * Detect if torrent is Movie, TV, or Other
 */
function detectCategory(title: string): "Movie" | "TV" | "Other" {
  // TV show patterns
  if (
    /s\d{1,2}e\d{1,3}/i.test(title) || // S01E01 format
    /season\s*\d+/i.test(title) || // Season 1
    /\d{1,2}x\d{1,3}/i.test(title) || // 1x01 format
    /complete\s*(series|season)/i.test(title)
  ) {
    return "TV";
  }

  // Movie patterns (year in title is common for movies)
  if (
    /\b(19|20)\d{2}\b/.test(title) && // Has a year
    !/s\d{1,2}e\d{1,3}/i.test(title) // But not TV format
  ) {
    return "Movie";
  }

  return "Other";
}

/**
 * Parse and enrich torrent with metadata
 */
export function parseTorrent(torrent: any): ParsedTorrent {
  const title = torrent.title || torrent.name || "Unknown";
  const provider = torrent.provider || "Unknown";
  const seeds = torrent.seeds ?? 0; // Use nullish coalescing to preserve 0 but not null
  const peers = torrent.peers ?? 0; // Use nullish coalescing to preserve 0 but not null
  const metadata = parseTorrentMetadata(title);

  // Handle YTS 100 cap - if provider is YTS and seeds/peers are exactly 100, mark as capped
  const isYTS = provider.toLowerCase() === "yts";
  const isYTSCapped = isYTS && (seeds === 100 || peers === 100);

  // Construct link if not provided
  let link = torrent.desc || torrent.link;

  // ThePirateBay - construct link from id
  if (!link && provider.toLowerCase() === "thepiratebay" && torrent.id) {
    link = `https://thepiratebay.org/description.php?id=${torrent.id}`;
  }

  return {
    title,
    seeds,
    peers,
    size: torrent.size || "Unknown",
    provider,
    link: link || undefined,
    time: torrent.time || undefined,
    category: detectCategory(title),
    metadata: {
      ...metadata,
      isYTSCapped
    },
    raw: torrent
  };
}
