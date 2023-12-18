export const makeCapitalize = (str: string) => {
  return str.toLowerCase()[0].toUpperCase() + str.slice(1);
};
