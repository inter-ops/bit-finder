export const formatField = (value: string, widthOfField: number): string => {
  let valStr = `${value}`;

  // +2 for space on either side
  if (valStr.length + 2 > widthOfField) valStr = valStr.slice(0, widthOfField - 2 - 3) + "...";

  // add padding until valStr is correct length
  while (valStr.length + 2 < widthOfField) {
    valStr = valStr + " ";
  }

  return ` ${valStr} `;
};
