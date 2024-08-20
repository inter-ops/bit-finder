import config from "../config.js";
import Transmission from "transmission-promise";

// TODO: command to add transmission seed box config. This walks through asking the user for the info, then saves it at ~/.bit-finder
// add a step during start that checks path ~/.bit-finder and loads config in if its available

const transmissionClient =
  config.transmission.username && config.transmission.password
    ? new Transmission({
        host: "localhost",
        port: 9091,
        username: config.transmission.username,
        password: config.transmission.password,
        //ssl: true,
        url: "/transmission/rpc"
      })
    : undefined;

export default transmissionClient;
