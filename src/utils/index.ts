export const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export const makeCapitalize = (str: string) => {
  return str.toLowerCase()[0].toUpperCase() + str.slice(1);
};
