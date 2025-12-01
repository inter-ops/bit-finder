import _ from "lodash";
import torrentSearchClient, { Torrent } from "../clients/torrentSearch.js";
import transmissionClient from "../clients/transmission.js";
import { formatField } from "../utils/listFormatter.js";
import {
  TITLE_LENGTH,
  SEED_LENGTH,
  PEER_LENGTH,
  SIZE_LENGTH,
  DEFAULT_RESULT_COUNT
} from "../constants.js";

export const search = async (
  name: string,
  type: "movie" | "tv" | "all",
  count = DEFAULT_RESULT_COUNT
) => {
  const typeMap = {
    movie: "Movies",
    tv: "TV",
    all: "All"
  };
  const torrents = await torrentSearchClient.search(name, typeMap[type], count);
  return torrents;
};

/**
 *
 * @param torrent TorrentSearchApi["Torrent"]
 */
export const getMagnet = async (torrent: Torrent) => {
  const magnet = await torrentSearchClient.getMagnet(torrent);
  return magnet;
};

// TODO: command to add transmission seed box config. This walks through asking the user for the info, then saves it at ~/.bit-finder
// add a step during start that checks path ~/.bit-finder and loads config in if its available

export const add = async (magnet: string) => {
  if (!transmissionClient)
    throw new Error("No transmission config provided, torrent could not be saved");

  console.log("Adding torrent to transmission");
  console.log(magnet);
  const res = await transmissionClient.add(magnet);
  console.log(res);
  return res;
};

export const getTorrents = async () => {
  if (!transmissionClient) throw new Error("No transmission config provided");

  const res = await transmissionClient.get();
  return res.torrents || [];
};

export const pauseTorrent = async (id: number) => {
  if (!transmissionClient) throw new Error("No transmission config provided");

  const res = await transmissionClient.stop(id);
  return res;
};

export const resumeTorrent = async (id: number) => {
  if (!transmissionClient) throw new Error("No transmission config provided");

  const res = await transmissionClient.start(id);
  return res;
};

export const removeTorrent = async (id: number, deleteData = false) => {
  if (!transmissionClient) throw new Error("No transmission config provided");

  const res = await transmissionClient.remove(id, deleteData);
  return res;
};

interface FormatOptions {
  includeIndex?: boolean;
}

export const formatSearchResults = (
  torrents: Torrent[],
  { includeIndex = false }: FormatOptions = {}
) => {
  const choices = torrents.map((torrent: any, i) => {
    let label = `${formatField(torrent.title, TITLE_LENGTH)}|${formatField(
      `${torrent.seeds} seeds`,
      SEED_LENGTH
    )}|${formatField(`${torrent.peers} peers`, PEER_LENGTH)}|${formatField(
      torrent.size,
      SIZE_LENGTH
    )}`;
    if (includeIndex) {
      label = `${i + 1}. ${label}`;
    }
    return {
      name: label,
      value: torrent as Torrent
    };
  });

  return choices;
};

function filterTorrent(torrent: Torrent) {
  // defaults
  const props = [
    "title",
    "download",
    "seeders",
    "leechers",
    "size",
    "pubdate",
    "quality",
    "blueray",
    "codec"
  ];

  return _.pick(torrent, props);
}

export const parseTv = (torrent: any) => {
  let type;
  const { title: episode } = torrent.episode_info;
  let { epnum, seasonnum: ssnum } = torrent.episode_info;

  const match = torrent.title.match(/s(\d{1,2})e?(\d{0,3})/i);

  if (!epnum && match[1]) epnum = match[1];

  if (!epnum || parseInt(epnum) > 5000) {
    epnum = undefined;
    type = "Season";
  } else {
    type = "Episode";
    epnum = parseInt(epnum);
  }

  ssnum = parseInt(ssnum);

  // TODO: format title

  // NOTE: if its a whole season, title looks like this: Season Pack 3
  return {
    ...filterTorrent(torrent),
    episode,
    epnum,
    ssnum,
    type
  };
};

export const parseMovie = (torrent: Torrent) => {
  // codec = x264, XVID
  // quality = 1080,

  // const { quality, codec, type } = torrent

  // TODO: format title

  return {
    ...filterTorrent(torrent),
    type: "Movie"
  };
};

// TODO: I dont remember what this was meant for, but its not being used anywhere. Look deeper into it later.
export const parseGeneral = (torrent: any) => {
  const blueray = torrent.title.match(/blu[-_]?ray/i) ? true : false;
  const categories = torrent.category && torrent.category.split("/");
  const [category, codec] = categories;
  let [quality] = categories;

  if (!quality) {
    // when quality isnt provided it can sometimes be found in the title
    const match = torrent.title.match(/\d{3,4}p/i);
    quality = match && match[0];
  }
  // if quality is from the category label, wont have 'p' at the end
  else quality += "p";

  //console.log(torrent.title);

  // TODO: codec can be found in title if not in category

  // TODO: filter based on quality

  return {
    ...torrent,
    quality,
    blueray,
    codec,
    category
  };
};
