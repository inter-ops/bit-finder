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

export interface Torrent {
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

export interface Filters {
  categories: ("Movie" | "TV" | "Other")[];
  providers: string[];
  resolutions: string[];
  videoCodecs: string[];
  audioCodecs: string[];
  sources: string[];
  hdr: string[];
  minSeeds: number;
}
