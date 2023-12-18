import { ROUTES } from "./const";

export type RoutesKeys = keyof typeof ROUTES;
export type RoutesValues = (typeof ROUTES)[RoutesKeys];
