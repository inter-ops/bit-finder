import * as finder from "./finder";
import * as parser from "./parser";
import * as downloader from "./downloader";
import inquirer from 'inquirer';
import clipboardy from 'clipboardy';
import { spawn } from 'child_process';
import _ from "lodash";

export default { finder, parser, downloader };

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

function formatField(value: string, widthOfField: number) {
    let valStr = `${value}`;

    // +2 for space on either side
    if (valStr.length+2 > widthOfField) valStr = valStr.slice(0, widthOfField-2-3) + "..."

    // add padding until valStr is correct length
    while(valStr.length+2 < widthOfField) {
        valStr = valStr +  " ";
    }

    return ` ${valStr} `
}

const titleLength = 60
const seedLength = 13
const peerLength = 13
const sizeLength = 12

async function webtorrent(magnet: string, streamType?: string) {
    const confirmAnswers = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirmInteractiveCli",
            message: "Starting the interactive Webtorrent CLI. Continue?",
            default: true
        }
    ]);

    // cancel action and restart cli
    if (!confirmAnswers.confirmInteractiveCli) {
        console.log("Cancelling action...")
        return cli()
    }

    const command = ["webtorrent", `${magnet}`]
    if (streamType) command.push(`--${streamType}`);
    
    spawn('npx', command, { stdio: 'inherit' });
}

async function getAppleTvs() {
    const list: string[] = []
    const child = spawn('npx', ["bonjour"]);

    child.stdout.on('data', (data) => {
        const appleTvMatch = data.toString().match(/(.*)\.\_airplay\._tcp\.local/);
        if (!appleTvMatch) return;

        list.push(`${appleTvMatch[1]}.local`)
    });
    
    child.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    console.log("Searching for Apple TVs...")
    await new Promise(r => setTimeout(() => r(null), 3000))

    if (list.length === 0) {
        console.log("No Apple TVs found, cancelling...")
        return cli()
    }

    return list
}

async function playOnAppleTv(url: string, appleTvId: string) {
    const confirmAnswers = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirmInteractiveCli",
            message: "Starting play-on-apple-tv interactive CLI. Continue?",
            default: true
        }
    ]);

    // cancel action and restart cli
    if (!confirmAnswers.confirmInteractiveCli) {
        console.log("Cancelling action...")
        return cli()
    }
    const command = ["play-on-apple-tv", `$(npx youtube-dl -f 136 --get-url '${url}')`, appleTvId]
    
    // console.log(`Running command npx ${command}`);
    spawn('npx', command, { stdio: 'inherit' });
}

async function downloadYoutube(url: string) {
    const command = ["youtube-dl", url];
    spawn('npx', command, { stdio: 'inherit' });
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
                        value: "Movies"
                    },
                    {
                        name: "TV Shows",
                        value: "TV"
                    }
                ]
            },
            {
                type: 'autocomplete',
                name: 'torrent',
                message: 'Search torrents: ',
                source: async (answersSoFar: any, input: string) => {
                    // await debouncedSearch(input, answersSoFar.mediaType);
                    if (!input) return []
                    const torrents = await finder.search(input, answersSoFar.mediaType)
                    const choices = torrents.map((torrent: any) => {
                        const label = `${formatField(torrent.title, titleLength)}|${formatField(`${torrent.seeds} seeds`, seedLength)}|${formatField(`${torrent.peers} peers`, peerLength)}|${formatField(torrent.size, sizeLength)}`
                        return {
                            name: label,
                            value: torrent
                        }
                    })
        
                    return choices;
                }
              },
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
                    },
                ],
                loop: false,
                pageSize: 8
            }
        ])

        const magnet = await finder.getMagnet(answers.torrent);
        console.log("Fetched magnet successfully.")

        // TODO: custom video player
        switch (answers.action) {
            case "magnetCopy":
                clipboardy.writeSync(magnet);
                console.log("Magnet copied to clipboard 🚀")
                break;
            case "download":
                webtorrent(magnet)
                break
            case "airplay":
            case "chromecast":
            case "vlc":
                webtorrent(magnet, answers.action)
                break
        
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
                },
                {
                    name: "VLC",
                    value: "vlc"
                }
            ]
        }
    ])

    const { youtubeUrl, action } = answers;

    switch (action) {
        case "airplay":
            const appleTvs = await getAppleTvs();
            if (!appleTvs) return;

            const appleTvAnswers = await inquirer.prompt([
                {
                    type: "list",
                    name: "appleTv",
                    message: "Select your Apple TV",
                    choices: appleTvs.map((name: string) => {
                        // "Justin's TV._airplay._tcp.local", "Justin's TV.local",
                        const sanitizedName = name.replace("._airplay._tcp", "")
                        return {
                            name: sanitizedName,
                            value: sanitizedName
                        }
                    })
                }
            ])

            await playOnAppleTv(youtubeUrl ,appleTvAnswers.appleTv)
            break
        case "download":
            await downloadYoutube(youtubeUrl)
            break;
    }
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
                        name: "YouTube",
                        value: "youtube"
                    },
                    {
                        name: "Torrents",
                        value: "torrents"
                    }
                ]
            }
        ])

        switch (initialAnswers.source) {
            case "youtube":
                youtubeHandler();
                break;
            case "torrents":
                torrentsHandler()
                break
        }

    }
    catch(err) {
        if (err.isTtyError) {
            // Prompt couldn't be rendered in the current environment
        } else {
            // Something else went wrong
        }
    }
    
}

cli()