import { spawn } from "child_process";

export const download = async (magnet: string) => {
  const command = ["webtorrent", `${magnet}`];
  spawn("npx", command, { stdio: "inherit" });
};

// See https://github.com/webtorrent/webtorrent-cli#usage for allowed stream types
export const cast = async (magnet: string, streamType: string) => {
  const command = ["webtorrent", `${magnet}`];
  command.push(`--${streamType}`);

  spawn("npx", command, { stdio: "inherit" });
};

export const stream = async (magnet: string) => {
  const command = ["webtorrent", `${magnet}`, "--stdout"];
  spawn("npx", command, { stdio: "inherit" });
};
