global.Promise = require("bluebird");
import dotenv from "dotenv";
dotenv.config();

export default {
  omdb: {
    apiKey: process.env.OMDB_API_KEY
  },
  transmission: {
    username: process.env.TRANSMISSION_USERNAME,
    password: process.env.TRANSMISSION_PASSWORD
  },
  apiKey: process.env.API_KEY
};
