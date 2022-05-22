import clipboardy from "clipboardy";

export const copyMagnet = (magnet: string) => {
  clipboardy.writeSync(magnet);
  console.log("Magnet copied to clipboard 🚀");
};
