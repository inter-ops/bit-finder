import config from "./config";
import Transmission from "transmission-promise";

// TODO: command to add transmission seed box config. This walks through asking the user for the info, then saves it at ~/.bit-finder
// add a step during start that checks path ~/.bit-finder and loads config in if its available

let transmission: any;
if (config.transmission.username && config.transmission.password) {
  transmission = new Transmission({
    host: "localhost",
    port: 9091,
    username: config.transmission.username,
    password: config.transmission.password,
    //ssl: true,
    url: "/transmission/rpc"
  });
}

export const addTorrent = async (magnet: string) => {
  console.log("Adding torrent to transmission");
  console.log(magnet);
  const res = await transmission.add(magnet);
  console.log(res);
  return res;
};
