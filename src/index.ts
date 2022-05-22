import cli from "./cli";
import yargs from "yargs";
// import { hideBin } from 'yargs/helpers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { hideBin } = require("yargs/helpers");
import { TorrentService } from "./services";
import { DEFAULT_RESULT_COUNT } from "./constants";
import * as webtorrentClient from "./clients/webtorrent";
import { copyMagnet } from "./clients/clipboard";

type AllowedTypes = "all" | "movie" | "tv";
const allowedTypes = ["all", "movie", "tv"];
function isValidType(type: string): type is AllowedTypes {
  return allowedTypes.includes(type);
}

const args = async () => {
  // TODO: cleanup, abstract out common functionality
  const results = await yargs(hideBin(process.argv))
    .command(
      "torrents",
      "Search and download torrents",
      (torrentYargs) => {
        return torrentYargs
          .command(
            "search",
            "Search torrents",
            (torrentSearchYargs) => {
              return torrentSearchYargs
                .option("name", {
                  describe: "name of the torrent",
                  alias: "n",
                  type: "string",
                  demandOption: true
                })
                .option("type", {
                  describe: "The type of torrent to search",
                  alias: "t",
                  type: "string",
                  default: "all"
                })
                .option("count", {
                  describe: "number of torrents to return",
                  alias: "c",
                  type: "number",
                  default: DEFAULT_RESULT_COUNT
                });
            },
            async (argv) => {
              const { name, type, count } = argv;

              // TODO: Can this validation be handled by yargs?
              if (!isValidType(type)) {
                throw new Error(
                  `${type} is not a valid type. Allowed types are ${allowedTypes.join(", ")}`
                );
              }

              const torrents = await TorrentService.search(name, type, count);
              const choices = TorrentService.formatSearchResults(torrents, { includeIndex: true });
              const resultString = choices.map((choice) => choice.name).join("\n");

              console.log(resultString);
            }
          )
          .command(
            "stream",
            `Stream a torrent's data inline`,
            (torrentStreamYargs) => {
              return torrentStreamYargs
                .option("name", {
                  describe: "name of the torrent",
                  alias: "n",
                  type: "string",
                  demandOption: true
                })
                .option("type", {
                  describe: "The type of torrent to search",
                  alias: "t",
                  type: "string",
                  default: "all"
                })
                .option("index", {
                  describe: "The torrent index to stream",
                  type: "number",
                  demandOption: true
                });
            },
            async (argv) => {
              const { name, type, index } = argv;

              // TODO: Can this validation be handled by yargs?
              if (!isValidType(type)) {
                throw new Error(
                  `${type} is not a valid type. Allowed types are ${allowedTypes.join(", ")}`
                );
              }

              const torrents = await TorrentService.search(name, type, index);
              const torrent = torrents[index - 1];

              const magnet = await TorrentService.getMagnet(torrent);
              await webtorrentClient.stream(magnet);
            }
          )
          .command(
            "download",
            `Download a torrent in the current working directory`,
            (torrentStreamYargs) => {
              return torrentStreamYargs
                .option("name", {
                  describe: "The name to search. Required when magnet is not provided.",
                  alias: "n",
                  type: "string"
                })
                .option("type", {
                  describe: "The type of torrent to search",
                  alias: "t",
                  type: "string",
                  default: "all"
                })
                .option("index", {
                  describe: "The torrent index to stream. Required when magnet is not provided.",
                  type: "number"
                })
                .option("magnet", {
                  describe: "The torrent magnet",
                  alias: "m",
                  type: "string"
                });
            },
            async (argv) => {
              const { name, type, index, magnet } = argv;

              if (magnet) {
                await webtorrentClient.download(magnet);
                return;
              }

              // TODO: Can this validation be handled by yargs?
              if (!isValidType(type)) {
                throw new Error(
                  `${type} is not a valid type. Allowed types are ${allowedTypes.join(", ")}`
                );
              }

              if (!name || !index) {
                throw new Error("Name and index are required when magnet is not provided.");
              }

              const torrents = await TorrentService.search(name, type, index);
              const torrent = torrents[index - 1];

              const magnetFound = await TorrentService.getMagnet(torrent);
              await webtorrentClient.download(magnetFound);
            }
          )
          .command(
            "get-magnet",
            `Copy a torrent's magnet URL`,
            (torrentStreamYargs) => {
              return torrentStreamYargs
                .option("name", {
                  describe: "name of the torrent",
                  alias: "n",
                  type: "string",
                  demandOption: true
                })
                .option("type", {
                  describe: "The type of torrent to search",
                  alias: "t",
                  type: "string",
                  default: "all"
                })
                .option("index", {
                  describe: "The torrent index to stream",
                  type: "number",
                  demandOption: true
                });
            },
            async (argv) => {
              const { name, type, index } = argv;

              // TODO: Can this validation be handled by yargs?
              if (!isValidType(type)) {
                throw new Error(
                  `${type} is not a valid type. Allowed types are ${allowedTypes.join(", ")}`
                );
              }

              const torrents = await TorrentService.search(name, type, index);
              const torrent = torrents[index - 1];

              const magnet = await TorrentService.getMagnet(torrent);
              copyMagnet(magnet);
            }
          );
      },
      (argv) => {
        console.log(`Uknown command: `, argv);
      }
    )
    .option("interactive", {
      alias: "i",
      type: "boolean",
      description: "Run in interactive mode"
    })
    .parse();

  if (results.interactive) {
    cli();
    return;
  }
};

args();
