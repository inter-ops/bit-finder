import config from "../config";
import { Client } from "imdb-api";

export { ImdbError, SearchResult } from "imdb-api";

const ImdbApi = new Client({ apiKey: config.omdb.apiKey });

export default ImdbApi;
