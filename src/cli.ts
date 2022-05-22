#!/usr/bin/env node

import inquirer from "inquirer";
import { spawn } from "child_process";
import autocomplete from "inquirer-autocomplete-prompt";
import terminalImage from "terminal-image";
import axios from "axios";
import { Torrent } from "./clients/torrentSearch";
import { TorrentService, ImdbService } from "./services";
import { formatField } from "./utils/listFormatter";
import { PEER_LENGTH, SEED_LENGTH, SIZE_LENGTH, TITLE_LENGTH } from "./constants";
import * as webtorrentClient from "./clients/webtorrent";
import { copyMagnet } from "./clients/clipboard";

inquirer.registerPrompt("autocomplete", autocomplete);

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
  const confirmAnswers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmStream",
      message: "Starting AppleTV stream. Continue?",
      default: true
    }
  ]);

  // cancel action and restart cli
  if (!confirmAnswers.confirmStream) {
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

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "mediaType",
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
      ]
    },
    {
      type: "autocomplete",
      name: "torrent",
      message: "Search torrents: ",
      source: async (answersSoFar: any, input: string) => {
        // TODO: fix search lag
        // await debouncedSearch(input, answersSoFar.mediaType);
        if (!input) return [];
        const torrents = await TorrentService.search(input, answersSoFar.mediaType);
        const choices = TorrentService.formatSearchResults(torrents, { includeIndex: true });

        return choices;
      }
    }
  ]);

  await torrentActionHandler(answers.torrent);
}

async function torrentActionHandler(torrent: Torrent) {
  const magnet = await TorrentService.getMagnet(torrent);
  console.log("Fetched magnet successfully.");

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
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
        new inquirer.Separator("\n  Stream\n  ----------"),
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
      ],
      loop: false,
      pageSize: 8
    }
  ]);

  switch (answers.action) {
    case "magnetCopy":
      copyMagnet(magnet);
      break;
    case "download":
      webtorrentClient.download(magnet);
      break;
    case "airplay":
    case "chromecast":
    case "vlc":
      webtorrentClient.cast(magnet, answers.action);
      break;
  }
}

async function youtubeHandler() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "youtubeUrl",
      message: "Enter a YouTube URL: "
    },
    {
      type: "list",
      name: "action",
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
    }
  ]);

  const { youtubeUrl, action } = answers;

  switch (action) {
    case "airplay": {
      const appleTvs = await getAppleTvs();
      if (!appleTvs) return;

      const appleTvAnswers = await inquirer.prompt([
        {
          type: "list",
          name: "appleTv",
          message: "Select your Apple TV",
          choices: appleTvs.map((name: string) => {
            // "Justin's TV._airplay._tcp.local", "Justin's TV.local",
            const sanitizedName = name.replace("._airplay._tcp", "");
            return {
              name: sanitizedName,
              value: sanitizedName
            };
          })
        }
      ]);

      await playOnAppleTv(youtubeUrl, appleTvAnswers.appleTv);
      break;
    }
    case "download": {
      await downloadYoutube(youtubeUrl);
      break;
    }
  }
}

async function imdbSearchbHandler() {
  const answers = await inquirer.prompt([
    {
      type: "autocomplete",
      name: "selection",
      message: "Search IMDb: ",
      source: async (_answersSoFar: any, input: string) => {
        if (!input) return [];
        const results = await ImdbService.search(input);
        const choices = ImdbService.formatSearchResults(results);

        return choices;
      }
    }
  ]);

  const result = await ImdbService.getResultByImdbId(answers.selection.imdbid);
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
    const initialAnswers = await inquirer.prompt([
      {
        type: "list",
        name: "source",
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
      }
    ]);

    switch (initialAnswers.source) {
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
