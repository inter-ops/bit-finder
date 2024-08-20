#!/usr/bin/env node
import { spawn } from "child_process";
import { input, confirm, rawlist, Separator } from "@inquirer/prompts";
import autocomplete from "inquirer-autocomplete-standalone";
import terminalImage from "terminal-image";
import axios from "axios";
import { Torrent } from "./clients/torrentSearch.js";
import { TorrentService, ImdbService } from "./services/index.js";
import { formatField } from "./utils/listFormatter.js";
import { PEER_LENGTH, SEED_LENGTH, SIZE_LENGTH, TITLE_LENGTH } from "./constants.js";
import * as webtorrentClient from "./clients/webtorrent.js";
import { copyMagnet } from "./clients/clipboard.js";

// inquirer.registerPrompt("autocomplete", autocomplete);

async function getAppleTvs() {
  const list: string[] = [];
  const child = spawn("npx", ["bonjour"]);

  child.stdout.on("data", (data) => {
    const appleTvMatch = data.toString().match(/(.*)\._airplay\._tcp\.local/);
    if (!appleTvMatch) return;

    list.push(`${appleTvMatch[1]}.local`);
  });

  child.stderr.on("data", (data) => {
    console.error(data.toString());
  });

  console.log("Searching for Apple TVs...");
  await new Promise((r) => setTimeout(() => r(null), 3000));

  if (list.length === 0) {
    console.log("No Apple TVs found, cancelling...");
    return cli();
  }

  return list;
}

async function playOnAppleTv(url: string, appleTvId: string) {
  const didConfirmStrem = await confirm({
    message: "Starting AppleTV stream. Continue?",
    default: true
  });

  // cancel action and restart cli
  if (!didConfirmStrem) {
    console.log("Cancelling action...");
    return cli();
  }
  const command = ["play-on-apple-tv", `$(npx youtube-dl -f 136 --get-url '${url}')`, appleTvId];

  spawn("npx", command, { stdio: "inherit" });
}

async function downloadYoutube(url: string) {
  const command = ["youtube-dl", url];
  spawn("npx", command, { stdio: "inherit" });
}

async function torrentsHandler() {
  // debouncer seems to slow performance. For now we wont use it
  // let results: any[] = [];
  // const debouncedSearch = _.debounce(async (input: string, mediaType: "Movies" | "TV") => {
  //     if (!input) {
  //         results = []
  //         return;
  //     }
  //     const torrents = await finder.search(input, mediaType)
  //     const choices = torrents.map((torrent: any) => {
  //         const label = `${formatField(torrent.title, titleLength)}|${formatField(`${torrent.seeds} seeds`, seedLength)}|${formatField(`${torrent.peers} peers`, peerLength)}|${formatField(torrent.size, sizeLength)}`
  //         return {
  //             name: label,
  //             value: torrent
  //         }
  //     })

  //     results = choices
  // }, 500, {
  //     leading: true,
  //     trailing: false
  // });

  const mediaType = await rawlist({
    message: "Type of media",
    choices: [
      {
        name: "Movies",
        value: "movie"
      },
      {
        name: "TV Shows",
        value: "tv"
      }
    ] as { name: string; value: "movie" | "tv" | "all" }[]
  });

  const answer = await autocomplete({
    message: "Search torrents: ",
    source: async (input) => {
      // TODO: fix search lag
      // await debouncedSearch(input, mediaType);
      if (!input) return [];
      const torrents = await TorrentService.search(input, mediaType);
      const choices = TorrentService.formatSearchResults(torrents, { includeIndex: true });

      return choices;
    }
  });

  await torrentActionHandler(answer);
}

async function torrentActionHandler(torrent: Torrent) {
  const magnet = await TorrentService.getMagnet(torrent);
  console.log("Fetched magnet successfully.");

  const action = await rawlist({
    message: "What do you want to do?",
    choices: [
      {
        name: "Download",
        value: "download"
      },
      {
        name: "Copy magnet URL",
        value: "magnetCopy"
      },
      new Separator("\n  Stream\n  ----------"),
      {
        name: "AirPlay",
        value: "airplay"
      },
      {
        name: "Chromecast",
        value: "chromecast"
      },
      {
        name: "VLC",
        value: "vlc"
      }
    ]
    // loop: false,
    // pageSize: 8
  });

  switch (action) {
    case "magnetCopy":
      copyMagnet(magnet);
      break;
    case "download":
      webtorrentClient.download(magnet);
      break;
    case "airplay":
    case "chromecast":
    case "vlc":
      webtorrentClient.cast(magnet, action);
      break;
  }
}

async function youtubeHandler() {
  const youtubeUrl = await input({
    message: "Enter a YouTube URL: "
  });

  const action = await rawlist({
    message: "Select action",
    choices: [
      {
        name: "AirPlay",
        value: "airplay"
      },
      {
        name: "Download",
        value: "download"
      }
      // {
      //     name: "VLC",
      //     value: "vlc"
      // }
    ]
  });

  switch (action) {
    case "airplay": {
      const appleTvs = await getAppleTvs();
      if (!appleTvs) return;

      const appleTv = await rawlist({
        message: "Select your Apple TV",
        choices: appleTvs.map((name: string) => {
          // "Justin's TV._airplay._tcp.local", "Justin's TV.local",
          const sanitizedName = name.replace("._airplay._tcp", "");
          return {
            name: sanitizedName,
            value: sanitizedName
          };
        })
      });

      await playOnAppleTv(youtubeUrl, appleTv);
      break;
    }
    case "download": {
      await downloadYoutube(youtubeUrl);
      break;
    }
  }
}

async function imdbSearchbHandler() {
  const answer = await autocomplete({
    // name: "selection",
    message: "Search IMDb: ",
    source: async (input) => {
      if (!input) return [];
      const results = await ImdbService.search(input);
      const choices = ImdbService.formatSearchResults(results);

      return choices;
    }
  });

  const result = await ImdbService.getResultByImdbId(answer.imdbid);
  const response = await axios.get(result.poster, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data, "binary");
  const image = await terminalImage.buffer(buffer, {
    width: "50%",
    height: "50%",
    preserveAspectRatio: true
  });
  if (image) console.log("Poster:\n", image);
  console.log(result);

  console.log("Searching for torrent info...");
  const torrents = await TorrentService.search(
    `${result.title} ${result.year}`,
    result.type === "movie" ? "movie" : "tv",
    1
  );
  const torrent = torrents?.[0] as any;
  if (!torrents) throw new Error("Torrent could not be found for movie " + result.title);

  console.log(
    `${formatField(torrent.title, TITLE_LENGTH)}|${formatField(
      `${torrent.seeds} seeds`,
      SEED_LENGTH
    )}|${formatField(`${torrent.peers} peers`, PEER_LENGTH)}|${formatField(
      torrent.size,
      SIZE_LENGTH
    )}`
  );

  await torrentActionHandler(torrent);
}

async function cli() {
  try {
    const source = await rawlist({
      message: "Where do you want to watch from?",
      choices: [
        {
          name: "Torrents",
          value: "torrents"
        },
        {
          name: "YouTube",
          value: "youtube"
        },
        {
          name: "IMDb Search",
          value: "imdb"
        }
      ]
    });

    switch (source) {
      case "youtube":
        await youtubeHandler();
        break;
      case "torrents":
        await torrentsHandler();
        break;
      case "imdb":
        await imdbSearchbHandler();
        break;
    }
  } catch (err: any) {
    if (err.isTtyError) {
      // Prompt couldn't be rendered in the current environment
      console.error("Tty error: ", err);
    } else {
      // Something else went wrong
      console.error(err);
    }
  }
}

export default cli;
