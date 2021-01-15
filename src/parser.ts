import _ from "lodash";
import { Torrent } from 'torrent-search-api';

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

  return _.pick(torrent, props)
}

export const general = (torrent: any) => {
  const blueray = torrent.title.match(/blu[-_]?ray/i) ? true : false;

  let [category, codec, quality] = torrent.category && torrent.category.split("/")

  if (!quality) {
    // when quality isnt provided it can sometimes be found in the title
    const match = torrent.title.match(/\d{3,4}p/i)
    quality = match && match[0]
  }
  // if quality is from the category label, wont have 'p' at the end
  else quality += "p"

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
}

export const tv = (torrent: any) => {
  let type;
  let { title: episode, epnum, seasonnum: ssnum } = torrent.episode_info;

  const match = torrent.title.match(/s(\d{1,2})e?(\d{0,3})/i)

  if (!epnum && match[1]) epnum = match[1]

  if (!epnum || parseInt(epnum) > 5000) {
    epnum = undefined;
    type = "Season"
  }
  else {
    type = "Episode"
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
  }
}

export const movie = (torrent: Torrent) => {
  // codec = x264, XVID
  // quality = 1080,

  // const { quality, codec, type } = torrent

  // TODO: format title

  return {
    ...filterTorrent(torrent),
    type: "Movie"
  };
}
