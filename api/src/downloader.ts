import config from "./config";
import Transmission from 'transmission-promise';

const transmission = new Transmission({
  host: 'localhost',
  port: 9091,
  username: config.transmission.username,
  password: config.transmission.password,
  //ssl: true,
  url: "/transmission/rpc"
})

export const addTorrent = async (magnet: string) => {
  console.log("Adding torrent to transmission");

  console.log(magnet);
  const res = await transmission.add(magnet)
  console.log(res);
  return res;
}
