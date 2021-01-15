"use strict";
require("dotenv").config();
Promise = require("bluebird")
module.exports = {
  apiKey: process.env.API_KEY
}
