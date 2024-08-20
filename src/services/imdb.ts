import imdbClient, { ImdbError, SearchResult } from "../clients/imdb.js";
import { formatField } from "../utils/listFormatter.js";
import { TITLE_LENGTH, TYPE_LENGTH, YEAR_LENGTH } from "../constants.js";

export const search = async (name: string) => {
  try {
    const { results } = await imdbClient.search({ name });
    // console.log('results: ', results);

    // TODO: get all movie info - can do synchronously while torrents are searched
    // if (first) {
    //   const info = await imdbApi.get({ id: results[0].imdbid })
    //   console.log('info: ', info)
    // }

    return results ?? [];
  } catch (err) {
    if (err instanceof ImdbError) {
      if (err.message.includes("Too many results") || err.message.includes("Movie not found"))
        return [];
    }
    throw err;
  }
};

export const getResultByImdbId = async (imdbId: string) => {
  return await imdbClient.get({ id: imdbId });
};

export const formatSearchResults = (results: SearchResult[]) => {
  const choices = results.map((result) => {
    const label = `${formatField(result.title, TITLE_LENGTH)}|${formatField(
      `${result.year}`,
      YEAR_LENGTH
    )}|${formatField(`${result.type === "movie" ? "Movie" : "TV Show"}`, TYPE_LENGTH)}`;
    return {
      name: label,
      value: result
    };
  });

  return choices;
};
